import { serve } from "@hono/node-server";
import { Sandbox } from "microsandbox";
import { Context, Hono } from "hono";
import { login, logout, signup } from "./lib/auth.js";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Session, User } from "../db/schema.js";
import { logger } from 'hono/logger'
import { generateSandboxName } from "./lib/generate-name.js";
import { validateCommand, validateImage, validateName, validateSession } from "./middleware.js";
import { SESSION_TTL_SECONDS } from "./constants.js";

type Variables = {
    session: Session
    user: User
}

const app = new Hono<{ Variables: Variables }>().basePath("/api");
app.use(logger())

const ALLOWED_IMAGES = new Set(["python", "debian", "alpine"]);
const PREFIX = "sbx-";
const SESSION_COOKIE = "session_id"
const MAX_CONCURRENT = 3;
const NAME_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;
const MAX_SANDBOXES = 5;
const EXEC_TIMEOUT_MS = 30_000;
const TIMEOUT_MS = 30_000;
let running = 0;


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

            return c.text(out.stdout());
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

app.post("/sandboxes", async (c) => {
    const { name, image } = await c.req.json()
    if (!name || !NAME_RE.test(name)) return c.json({ error: "name not mehh" }, 400);

    if (!image || !ALLOWED_IMAGES.has(image)) return c.json({ error: "image not allowed" }, 400);

    const existing = (await Sandbox.list()).sandboxes.filter((h: any) => h.name?.startsWith(PREFIX));

    if (existing.length >= MAX_SANDBOXES) return c.json({ error: "sandbox limit reached" }, 429);

    try {
        const sandbox = await Sandbox.builder(PREFIX + name)
            .image(image)
            .cpus(1)
            .memory(512)
            .create();
        await sandbox.detach(); // keep it running after this request
        return c.json({ name, image }, 201);
    } catch (err) {
        return c.json({ error: "create failed (name may already exist)" }, 500)
    }
});

// List
app.get("/sandboxes", async (c) => {
    const handles = await Sandbox.list();
    const res = handles.sandboxes
        .filter((h: any) => h.name?.startsWith(PREFIX))
        .map((h: any) => ({ name: h.name.slice(PREFIX.length), status: h.status }));

    return c.json({ results: res })
});

// Run a command in an existing sandbox
app.post("/sandboxes/:name/exec", async (c) => {
    const name = c.req.param('name')
    const { command } = await c.req.json();
    let sb;
    try {
        const handle = await Sandbox.get(PREFIX + name);
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
app.delete("/sandboxes/:name", validateName, async (c) => {
    const { name } = await c.req.json()

    try {
        const handle = await Sandbox.get(PREFIX + name);
        await handle.stop();
        await Sandbox.remove(PREFIX + name);
        // delete in the db too
        return c.text("ok")
    } catch (err) {
        return c.json({ error: "no such sandbox" }, 404)
    }

});

serve(
    {
        fetch: app.fetch,
        port: 3001,
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

