import { serve, upgradeWebSocket } from "@hono/node-server";
import { ensureRuntime, Sandbox, SandboxStillRunningError, Snapshot } from "microsandbox";
import { Context, Hono } from "hono";
import { login, logout, signup } from "./lib/auth.js";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sandboxes, type Session, type User } from "../db/schema.js";
import { logger } from 'hono/logger'
import { generateSandboxName } from "./lib/generate-name.js";
import { validateCommand, validateImage, validateName, validateSession } from "./middleware.js";
import { ALLOWED_IMAGES, DEFAULT_CPUS, DEFAULT_MEMORY, EXEC_TIMEOUT_MS, MAX_CONCURRENT, MAX_SANDBOXES, NAME_RE, PREFIX, SESSION_COOKIE, SESSION_TTL_SECONDS, TIMEOUT_MS } from "./constants.js";
import { db } from "../db/db.js";
import { and, eq } from "drizzle-orm";
import { WebSocketServer } from "ws";
import { serveStatic } from "@hono/node-server/serve-static";
import { createSnapshot, deleteSnapshot, restoreSnapshot } from "./sandbox/snapshots.js";
import { snapshot } from "node:test";

type Variables = {
    session: Session
    user: User
}
await ensureRuntime();

var app = new Hono<{ Variables: Variables }>()
app.use(logger())


let running = 0;
app.use('/assets/*', serveStatic({ root: './public' }))
app.get('/', serveStatic({ root: './public/' }))

app = app.basePath("/api")

app.get("/health", (c) => c.json({ ok: true }));
app.post("/signup", async (c) => {
    const { name, email, password } = await c.req.json()
    const session = await signup({ name, email, password })
    setSessionCookie(c, session);

    return c.json({ success: "true" })
});

app.post("/login", async (c) => {
    const { email, password } = await c.req.json()
    const session = await login({ email, password })

    setSessionCookie(c, session);
    return c.json({ success: "true" })
});

app.use("*", validateSession)

app.get("/session", (c) => {
    const user = c.get('user');
    return c.json({ user: user })
});

app.post("/logout", async (c) => {
    const session = getCookie(c, SESSION_COOKIE)
    if (session) {
        await logout(session)
    }
    deleteCookie(c, SESSION_COOKIE)
    return c.json({ success: "true" })
});

app.post("/test", validateImage, validateCommand,
    async (c) => {
        console.log("Testinggg");
        const { image, command } = await c.req.json();

        console.log(image);

        if (!image || !ALLOWED_IMAGES.has(image)) {
            c.status(400);
            return c.text("This image isn't available");
        }

        if (running >= MAX_CONCURRENT) {
            c.status(429);
            return c.text(
                "We're at full capacity right now. please try again later",
            );
        }
        running++;
        const name = generateSandboxName()
        try {
            await using sb = await Sandbox.builder(name)
                .image(image)
                .cpus(1)
                .maxMemory(512)
                .create();

            const out = await Promise.race([
                sb.shell(command),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS),
                ),
            ]);
            const res = out.stdout()
            sb.destroy()
            return c.text(res);
        } catch (e) {
            console.log(e);
            const isTimeout = e instanceof Error && e.message === "Timeout";
            return isTimeout
                ? c.json({ error: "Timeout" }, 504)
                : c.json({ error: "Internal Server Error" }, 500);
        } finally {
            running--;
        }
    });

app.post("/sandboxes", validateName, validateImage ,async (c) => {
    const { name, image } = await c.req.json()
    const user = c.get("user")
    const memory = DEFAULT_MEMORY
    const cpu = DEFAULT_CPUS

    const existing = await db.query.sandboxes.findMany({
        where: (sandboxes, { eq }) => eq(sandboxes.user, user.id),
        columns: { id: true },
    });

    if (existing.length >= MAX_SANDBOXES) return c.json({ error: "sandbox limit reached" }, 429);

    let sandbox: Sandbox | undefined;
    try {
        sandbox = await Sandbox.builder(PREFIX + name)
            .image(image)
            .cpus(cpu)
            .memory(memory)
            .create();
        const [record] = await db.insert(sandboxes).values({
            name,
            user: user.id,
            image,
            status: "running",
            memory,
            cpu,
        }).returning();
        await sandbox.detach();
        return c.json({ sandbox: record }, 201);
    } catch (err) {
        if (sandbox) await sandbox.destroy().catch(() => undefined);
        return c.json({ error: "create failed (name may already exist)" }, 500)
    }
});

//snapshots
app.post("/sandboxes/:sandbox/snapshot" , async (c) => {
    const { name } = await c.req.json()
    const sandbox = c.req.param('sandbox')
    const user = c.get("user")

    const existing = await db.query.sandboxes.findFirst({
        where: (sandboxes, { and , eq }) => and(eq(sandboxes.name, sandbox ), eq(sandboxes.user, user.id)),
        with: {
            user: true
        }
    });

    if(!existing) throw new Error("sandbox not found")

    try {
        const snapshot = await createSnapshot(existing, name)
        return c.json({ snapshot }, 201);
    } catch (err) {
        return c.json({ error: "snapshot failed" }, 500)
    }
});

app.post("/snapshots/:id/restore" , async (c) => {
    const { name } = await c.req.json()
    const id = c.req.param('id')
    const user = c.get("user")
    try {
        const sandbox = await restoreSnapshot(id, name, user)
        return c.json({ sandbox: sandbox }, 201);
    } catch (err) {
        return c.json({ error: "snapshot restore failed" }, 500)
    }
});

app.delete("/snapshots/:id" , async (c) => {
    const name = c.req.param('id')
    const user = c.get("user")
    try {
         await deleteSnapshot(name, user)
        return c.json({ message: "snapshot deleted" }, 200);
    } catch (err) {
        return c.json({ error: "snapshot delete failed" }, 500)
    }
});

// List
app.get("/sandboxes", async (c) => {
    const user = c.get("user")
    const query = c.req.query("q")?.trim();
    const results = await db.query.sandboxes.findMany({
        where: (sandboxes, { and, eq, like }) => query
            ? and(eq(sandboxes.user, user.id), like(sandboxes.name, `%${query}%`))
            : eq(sandboxes.user, user.id),
    })
    return c.json({ results })
});

app.get("/sandboxes/:name/ws", upgradeWebSocket(async (c) => {
    const name = c.req.param('name')
    const user = c.get("user")
    let sb: Sandbox;

    if (!name) throw new Error("Missing sandbox name");

    const sandbox = await db.query.sandboxes.findFirst({
        where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id))
    })

    if (!sandbox) throw new Error("Sandbox not found");

    const handle = await Sandbox.get(PREFIX + sandbox?.name);
    try {
        sb = await handle.startDetached();
    } catch (e) {
        if (e instanceof SandboxStillRunningError) {
            sb = await handle.connect()
        } else {
            throw e
        }
    }

    const process = await sb.execStreamWith("/bin/sh", (e) => {
        return e.args(["-i"]).tty(true).stdinPipe();
    })
    const stdin = await process.takeStdin();

    return {
        onOpen(_evt, ws) {
            void (async () => {
                const decoders = {
                    stdout: new TextDecoder(),
                    stderr: new TextDecoder()
                };

                try {
                    for await (const event of process) {
                        if (event.kind === "stdout" || event.kind === 'stderr') {
                            const text = decoders[event.kind].decode(event.data, {
                                stream: true
                            })
                            if (text) ws.send(text)
                        } else if (event.kind == "exited") {
                            for (const decoder of Object.values(decoders)) {
                                const tail = decoder.decode()
                                if (tail) ws.send(tail)
                            }
                            ws.send(JSON.stringify({ type: "exit", code: event.code }))
                            break;

                        }
                    }
                } catch {
                    ws.close(1011, "Shell process failed")
                }
            })()
        },
        async onMessage(evt, ws) {
            try {
                if (typeof evt.data !== "string") return;
                const message = JSON.parse(evt.data);
                if (message.type === 'input' && typeof message.data === "string") {
                    await stdin?.write(message.data)
                }
                else if (message.type === "resize" && Number.isInteger(message.rows) && Number.isInteger(message.cols) && message.rows > 0 && message.cols > 0) {
                    await process.resize(message.rows, message.cols)
                }
            } catch (e) {

                console.log(e)

            }
        },
        async onClose() {
            await process.kill().catch(() => undefined)
        }
    }
}));

// Run a command in an existing sandbox
app.post("/sandboxes/:name/exec", validateCommand, async (c) => {
    const name = c.req.param('name')
    const user = c.get('user')
    const { command } = await c.req.json();
    let sb;

    const sandbox = await db.query.sandboxes.findFirst({
        where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id))
    })

    if (!sandbox) {
        return c.json({ error: "sanbox not found" }, 404)
    }

    try {
        const handle = await Sandbox.get(PREFIX + sandbox?.name);
        sb = await handle.connectOrStart();
    } catch {
        return c.json({ error: "no such sandbox" }, 400)
    }
    try {
        const out = await Promise.race([
            sb.shell(command),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), EXEC_TIMEOUT_MS)),
        ]);
        return c.json({ stdout: out.stdout() });
    } catch (err) {
        const timedOut = err instanceof Error && err.message === "timeout";
        return timedOut ? c.json({ error: "timed out image" }, 504) : c.json({ error: "exec failed" }, 500)
    }
});

// Stop and delete
app.delete("/sandboxes/:name", async (c) => {
    const name = c.req.param("name")
    const user = c.get('user')
    const [record] = await db.select({ id: sandboxes.id, })
        .from(sandboxes)
        .where(and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)))
        .limit(1)
    if (!record) return c.json({ error: "sandbox not found" }, 404)

    try {
        const handle = await Sandbox.get(PREFIX + name);
        await handle.destroy();
        await db.delete(sandboxes).where(eq(sandboxes.id, record.id))
        return c.json({ success: true })
    } catch (err) {
        return c.json({ error: "no such sandbox" }, 404)
    }

});

app.onError((err, c) => {
    console.error("ROUTE ERROR:", err);
    return c.json({ error: err.message }, 500);
});

const wss = new WebSocketServer({ noServer: true })

serve(
    {
        fetch: app.fetch,
        port: 3001,
        websocket: {
            server: wss
        }
    },
    (info) => {
        console.log(`Server is running on http://localhost:${info.port}`);
    },
);

function setSessionCookie(c: Context, sessions: Session[]) {
    const session = sessions[0];
    if (!session) throw new Error("Session insert returned no row");

    setCookie(c, SESSION_COOKIE, session.sessionToken, {
        httpOnly: true,
        maxAge: SESSION_TTL_SECONDS,
        expires: new Date(session.expiresAt),
        sameSite: 'Strict',
        // secure: true  // not yet
    });
}

