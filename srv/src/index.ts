import { serve, upgradeWebSocket } from "@hono/node-server";
import { ensureRuntime, Sandbox, SandboxStillRunningError } from "microsandbox";
import { Context, Hono } from "hono";
import { login, logout, signup } from "./lib/auth.js";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { ports, sandboxes, type Session, type User } from "../db/schema.js";
import { logger } from "hono/logger";
import { generateSandboxName, generateUrlName } from "./utils/generate-name.js";
import { validateCommand, validateImage, validateName, validateSession } from "./middleware.js";
import {
  ALLOWED_IMAGES,
  BASE_DOMAIN,
  DEFAULT_CPUS,
  DEFAULT_GUEST_PORT,
  DEFAULT_MEMORY,
  DEFAULT_SHELLS,
  EXEC_TIMEOUT_MS,
  GATEWAY_EXECUTABLE_PATH,
  MAX_CONCURRENT,
  MAX_PORTS,
  MAX_SANDBOXES,
  PREFIX,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  TIMEOUT_MS,
} from "./constants.js";
import { db } from "../db/db.js";
import { and, eq } from "drizzle-orm";
import { WebSocketServer } from "ws";
import { serveStatic } from "@hono/node-server/serve-static";
import { createSnapshot, deleteSnapshot, restoreSnapshot } from "./sandbox/snapshots.js";
import { streamSSE } from "hono/streaming";
import { randomUUID } from "crypto";
import { registerRoute, releasePort, setPort } from "./sandbox/networking.js";

type Variables = {
  session: Session;
  user: User;
};
await ensureRuntime();

var app = new Hono<{ Variables: Variables }>();
app.use(logger());

let running = 0;
app.use("/assets/*", serveStatic({ root: "./public" }));
app.get("/", serveStatic({ root: "./public/" }));

app = app.basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));
app.post("/signup", async (c) => {
  const { name, email, password } = await c.req.json();
  const session = await signup({ name, email, password });
  setSessionCookie(c, session);

  return c.json({ success: "true" });
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const session = await login({ email, password });

  setSessionCookie(c, session);
  return c.json({ success: "true" });
});

app.use("*", validateSession);

app.get("/session", (c) => {
  const user = c.get("user");
  return c.json({ user: user });
});

app.post("/logout", async (c) => {
  const session = getCookie(c, SESSION_COOKIE);
  if (session) {
    await logout(session);
  }
  deleteCookie(c, SESSION_COOKIE);
  return c.json({ success: "true" });
});

app.post("/test", validateImage, validateCommand, async (c) => {
  const { image, command } = await c.req.json();
  if (!image || !ALLOWED_IMAGES.has(image)) {
    c.status(400);
    return c.text("This image isn't available");
  }

  if (running >= MAX_CONCURRENT) {
    c.status(429);
    return c.text("We're at full capacity right now. please try again later");
  }
  running++;
  const name = generateSandboxName();
  try {
    await using sb = await Sandbox.builder(name).image(image).cpus(1).maxMemory(512).create();

    const out = await Promise.race([
      sb.shell(command),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)),
    ]);
    const res = out.stdout();
    sb.destroy();
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

app.post("/sandboxes", validateName, validateImage, async (c) => {
  const { name, image } = await c.req.json();
  const user = c.get("user");
  const memory = DEFAULT_MEMORY;
  const cpu = DEFAULT_CPUS;

  const existing = await db.query.sandboxes.findMany({
    where: (sandboxes, { eq }) => eq(sandboxes.user, user.id),
    columns: { id: true },
  });

  if (existing.length >= MAX_SANDBOXES) return c.json({ error: "sandbox limit reached" }, 429);

  let sandbox: Sandbox | undefined;
  const generated = generateSandboxName();
  const res = await setPort(generated);

  const port = res["port"];
  const msbName = PREFIX + generated;

  try {
    sandbox = await Sandbox.builder(msbName)
      .image(image)
      .cpus(cpu)
      .memory(memory)
      .port(port, DEFAULT_GUEST_PORT)
      .patch((p) =>
        p
          .mkdir("/opt/gb", { mode: 0o755 })
          .copyFile(`../init/tini-static`, "/usr/bin/tini", { mode: 0o755 })
          .copyFile(`../ports/ports`, "/usr/bin/ports", { mode: 0o755 })
          .copyFile(`${GATEWAY_EXECUTABLE_PATH}/gateway`, "/opt/gb/gateway", { mode: 0o755 }),
      )
      .script(
        "start-gateway",
        `#!/bin/sh\n tini -- /opt/gb/gateway --port ${DEFAULT_GUEST_PORT} \n`,
      )
      .script("scan-ports", `#!/bin/sh\n /usr/bin/ports\n`)
      .script("check-shell", `#!/bin/sh\n grep ^ID= /etc/os-release | cut -d= -f2 `)
      .label("owner", user.id)
      // .init("auto")
      .create();
    const [record] = await db
      .insert(sandboxes)
      .values({
        name,
        user: user.id,
        msbName,
        hostPort: port,
        guestPort: DEFAULT_GUEST_PORT, /// or generate a random port with randomPort()
        image,
        status: "running",
        memory,
        cpu,
      })
      .returning();
    const distro = (await sandbox.shell("check-shell")).stdout().trim();
    await db.update(sandboxes).set({ distro }).where(eq(sandboxes.id, record.id));
    const job = await sandbox.execDetached("start-gateway");
    console.log(job.id);
    await sandbox.detach();
    return c.json({ sandbox: record }, 201);
  } catch (e) {
    console.log(e);
    if (sandbox) await sandbox.destroy().catch(() => undefined);
    releasePort(port);
    return c.json({ error: "create failed" }, 500);
  }
});

// start
app.put("/sandboxes/:name/start", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const [record] = await db
    .select({ id: sandboxes.id, msbName: sandboxes.msbName })
    .from(sandboxes)
    .where(and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)))
    .limit(1);
  if (!record) return c.json({ error: "sandbox not found" }, 404);

  try {
    const handle = await Sandbox.get(record.msbName);
    await handle.startDetached();
    await db.update(sandboxes).set({ status: "running" }).where(eq(sandboxes.id, record.id));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "no such sandbox" }, 404);
  }
});

//stop
app.put("/sandboxes/:name/stop", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const [record] = await db
    .select({ id: sandboxes.id, msbName: sandboxes.msbName })
    .from(sandboxes)
    .where(and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)))
    .limit(1);
  if (!record) return c.json({ error: "sandbox not found" }, 404);

  try {
    const handle = await Sandbox.get(record.msbName);
    await handle.stop();
    await db.update(sandboxes).set({ status: "stopped" }).where(eq(sandboxes.id, record.id));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "no such sandbox" }, 404);
  }
});

// Stop and delete
app.delete("/sandboxes/:name", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const [record] = await db
    .select({ id: sandboxes.id, msbName: sandboxes.msbName })
    .from(sandboxes)
    .where(and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)))
    .limit(1);
  if (!record) return c.json({ error: "sandbox not found" }, 404);

  try {
    const handle = await Sandbox.get(record.msbName);
    handle.stop();
    handle.destroy();
    await db.delete(sandboxes).where(eq(sandboxes.id, record.id));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "no such sandbox" }, 404);
  }
});

//snapshots
app.post("/sandboxes/:sandbox/snapshot", async (c) => {
  const { name } = await c.req.json();
  const sandbox = c.req.param("sandbox");
  const user = c.get("user");

  const existing = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) =>
      and(eq(sandboxes.name, sandbox), eq(sandboxes.user, user.id)),
    with: {
      user: true,
    },
  });

  if (!existing) throw new Error("sandbox not found");

  try {
    const snapshot = await createSnapshot(existing, name);
    return c.json({ snapshot }, 201);
  } catch {
    return c.json({ error: "snapshot failed" }, 500);
  }
});

app.post("/snapshots/:id/restore", async (c) => {
  const { name } = await c.req.json();
  const id = c.req.param("id");
  const user = c.get("user");
  try {
    const sandbox = await restoreSnapshot(id, name, user);
    return c.json({ sandbox: sandbox }, 201);
  } catch {
    return c.json({ error: "snapshot restore failed" }, 500);
  }
});

app.delete("/snapshots/:id", async (c) => {
  const name = c.req.param("id");
  const user = c.get("user");
  try {
    await deleteSnapshot(name, user);
    return c.json({ message: "snapshot deleted" }, 200);
  } catch {
    return c.json({ error: "snapshot delete failed" }, 500);
  }
});

// List
app.get("/sandboxes", async (c) => {
  const user = c.get("user");
  const query = c.req.query("q")?.trim();
  const results = await db.query.sandboxes.findMany({
    where: (sandboxes, { and, eq, like }) =>
      query
        ? and(eq(sandboxes.user, user.id), like(sandboxes.name, `%${query}%`))
        : eq(sandboxes.user, user.id),
  });
  return c.json({ results });
});

app.get(
  "/sandboxes/:name/ws",
  upgradeWebSocket(async (c) => {
    const name = c.req.param("name");
    const user = c.get("user");
    let sb: Sandbox;

    if (!name) throw new Error("Missing sandbox name");

    const sandbox = await db.query.sandboxes.findFirst({
      where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
    });

    if (!sandbox) throw new Error("Sandbox not found");

    const handle = await Sandbox.get(sandbox.msbName);
    try {
      sb = await handle.startDetached();
    } catch (e) {
      if (e instanceof SandboxStillRunningError) {
        sb = await handle.connect();
      } else {
        throw e;
      }
    }

    const shell = sandbox.distro?.trim() ?? "alpine";
    const process = await sb.execStreamWith(DEFAULT_SHELLS[shell] || "/bin/sh", (e: any) => {
      return e.args(["-i"]).tty(true).stdinPipe();
    });
    const stdin = await process.takeStdin();
    return {
      onOpen(_evt, ws) {
        void (async () => {
          const decoders = {
            stdout: new TextDecoder(),
            stderr: new TextDecoder(),
          };

          try {
            for await (const event of process) {
              if (event.kind === "stdout" || event.kind === "stderr") {
                const text = decoders[event.kind].decode(event.data, {
                  stream: true,
                });
                if (text) ws.send(text);
              } else if (event.kind == "exited") {
                for (const decoder of Object.values(decoders)) {
                  const tail = decoder.decode();
                  if (tail) ws.send(tail);
                }
                ws.send(JSON.stringify({ type: "exit", code: event.code }));
                break;
              }
            }
          } catch {
            ws.close(1011, "Shell process failed");
          }
        })();
      },
      async onMessage(evt) {
        try {
          if (typeof evt.data !== "string") return;
          const message = JSON.parse(evt.data);
          if (message.type === "input" && typeof message.data === "string") {
            await stdin?.write(message.data);
          } else if (
            message.type === "resize" &&
            Number.isInteger(message.rows) &&
            Number.isInteger(message.cols) &&
            message.rows > 0 &&
            message.cols > 0
          ) {
            await process.resize(message.rows, message.cols);
          }
        } catch (e) {
          console.log(e);
        }
      },
      async onClose() {
        await process.kill().catch(() => undefined);
      },
    };
  }),
);

// Run a command in an existing sandbox
app.post("/sandboxes/:name/exec", validateCommand, async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const { command } = await c.req.json();
  let sb;

  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
  });

  if (!sandbox) {
    return c.json({ error: "sanbox not found" }, 404);
  }

  try {
    const handle = await Sandbox.get(sandbox.msbName);
    sb = await handle.connectOrStart();
  } catch {
    return c.json({ error: "no such sandbox" }, 400);
  }
  try {
    const out = await Promise.race([
      sb.shell(command),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), EXEC_TIMEOUT_MS)),
    ]);
    return c.json({ stdout: out.stdout() });
  } catch (err) {
    const timedOut = err instanceof Error && err.message === "timeout";
    return timedOut
      ? c.json({ error: "timed out image" }, 504)
      : c.json({ error: "exec failed" }, 500);
  }
});

app.get("/sandboxes/:name/log-stream", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
  });

  if (!sandbox) {
    return c.json({ error: "sanbox not found" }, 404);
  }
  try {
    return streamSSE(c, async (stream) => {
      const handle = await Sandbox.get(PREFIX + sandbox?.name);
      const logStream = await handle.logStream({ follow: true });
      for await (const s of logStream) {
        await stream.writeSSE({ id: randomUUID(), data: s.text().trimEnd(), event: "log-stream" });
      }
    });
  } catch {
    return c.json({ error: "no such sandbox" }, 400);
  }
});

// port management
// get ports for a sandbox
app.get("/sandboxes/:name/ports", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
  });

  if (!sandbox) {
    return c.json({ error: "sanbox not found" }, 404);
  }

  const results = await db.query.ports.findMany({
    where: (ports, { eq }) => eq(ports.sandbox, sandbox.id),
  });

  return c.json({ results });
});

app.get("/sandboxes/:name/ports", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
  });

  if (!sandbox) {
    return c.json({ error: "sanbox not found" }, 404);
  }

  const results = await db.query.ports.findMany({
    where: (ports, { eq }) => eq(ports.sandbox, sandbox.id),
  });

  return c.json({ results });
});

app.get("/sandboxes/:name/poll-ports", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
    with: {
      ports: true,
    },
  });

  if (!sandbox) {
    return c.json({ error: "sanbox not found" }, 404);
  }

  
  try {
    const handle = await Sandbox.get(sandbox.msbName);
    const sb = await handle.connectOrStart();
    const scanned = JSON.parse((await sb.shell("scan-ports")).stdout()) as number[];
    const registered = new Set(sandbox.ports.map((port) => Number(port.number)));
    const res = scanned.filter((port) => !registered.has(Number(port)));
    return c.json({ res });
  } catch (e) {
    console.error(e);
    return c.json({ error: "an error occured" }, 404);

  }
}); 

//new port
app.post("/sandboxes/:name/ports", async (c) => {
  const name = c.req.param("name");
  const user = c.get("user");
  const { port } = await c.req.json();

  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
    with: {
      ports: true,
    },
  });

  if (!sandbox) {
    return c.json({ error: "sandbox not found" }, 404);
  }

  if (sandbox.ports.length >= MAX_PORTS) {
    return c.json({ error: "too many ports open for this sandbox" }, 429);
  }

  try {
    const id = generateUrlName()
    registerRoute(id, sandbox.hostPort, port)
    const url = `${id}.${BASE_DOMAIN}`;
    const [newPort] = await db
      .insert(ports)
      .values({ number: port, sandbox: sandbox.id, url })
      .returning();
    return c.json({ port: newPort });
  } catch {
    return c.json({ error: "try using a different port" }, 400);
  }
});

app.delete("/sandboxes/:name/ports/:id", async (c) => {
  const name = c.req.param("name");
  const id = c.req.param("id");
  const user = c.get("user");

  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
  });

  if (!sandbox) {
    return c.json({ error: "sanbox not found" }, 404);
  }

  try {
    await db.delete(ports).where(and(eq(ports.id, id), eq(ports.sandbox, sandbox.id)));
    return c.json({ message: "port deleted" });
  } catch {
    return c.json({ error: "error deleting port" }, 400);
  }
});

app.onError((err, c) => {
  console.error("ROUTE ERROR:", err);
  return c.json({ error: err.message }, 500);
});

const wss = new WebSocketServer({ noServer: true });

serve(
  {
    fetch: app.fetch,
    port: 3001,
    websocket: {
      server: wss,
    },
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
    sameSite: "Strict",
    // secure: true  // not yet
  });
}
