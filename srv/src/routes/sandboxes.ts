import { Context, Hono } from "hono";
import { upgradeWebSocket } from "@hono/node-server";
import { Sandbox, SandboxStillRunningError } from "microsandbox";
import { streamSSE } from "hono/streaming";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { createError } from "evlog";
import { db } from "../../db/db.js";
import { sandboxes } from "../../db/schema.js";
import { generateSandboxName } from "../utils/generate-name.js";
import { validateName, validateImage, validateCommand, validateSandbox } from "../middleware.js";
import {
  ALLOWED_IMAGES,
  DEFAULT_CPUS,
  DEFAULT_GUEST_PORT,
  DEFAULT_MEMORY,
  DEFAULT_SHELLS,
  EXEC_TIMEOUT_MS,
  GATEWAY_EXECUTABLE_PATH,
  MAX_CONCURRENT,
  MAX_SANDBOXES,
  PREFIX,
  TIMEOUT_MS,
} from "../constants.js";
import { releasePort, setPort } from "../sandbox/networking.js";
import type { Env } from "../env.js";

export const sandboxesRoutes = new Hono<Env>();

let running = 0;

sandboxesRoutes.post("/sandboxes", validateName, validateImage, async (c: Context<Env>) => {
  const { name, image } = await c.req.json();
  const user = c.get("user");
  const log = c.get("log");

  const memory = DEFAULT_MEMORY;
  const cpu = DEFAULT_CPUS;

  const existing = await db.query.sandboxes.findMany({
    where: (sandboxes, { eq }) => eq(sandboxes.user, user.id),
    columns: { id: true },
  });

  if (existing.length >= MAX_SANDBOXES) {
    log.warn("sandbox limit reached");
    throw createError({
      message: "sandbox limit reached",
      code: "SANDBOX_LIMIT_REACHED",
      why: "you have too many sandboxes",
      fix: "try freeing up space by deleting sandboxes",
      status: 429,
    });
  }

  let sandbox: Sandbox | undefined;
  const generated = generateSandboxName();
  const res = await setPort(generated);

  const port = res["port"];
  const msbName = PREFIX + generated;

  try {
    sandbox = await Sandbox.builder(msbName)
      .image(image)
      // .imageWith((i) => i.disk(").fstype("ext4"))
      .cpus(cpu)
      .memory(memory)
      .port(port, DEFAULT_GUEST_PORT)
      .patch((p) =>
        p
          .mkdir("/opt/gb", { mode: 0o755 })
          // .copyFile(`../init/tini-static`, "/usr/bin/tini", { mode: 0o755 })
          .copyFile(`../ports/ports`, "/usr/bin/ports", { mode: 0o755 })
          .copyFile(`${GATEWAY_EXECUTABLE_PATH}/gateway`, "/opt/gb/gateway", { mode: 0o755 }),
      )
      .script("start-gateway", `#!/bin/sh\n /opt/gb/gateway --port ${DEFAULT_GUEST_PORT} \n`)
      .script("scan-ports", `#!/bin/sh\n /usr/bin/ports\n`)
      .script("check-shell", `#!/bin/sh\n grep ^ID= /etc/os-release | cut -d= -f2 `)
      .label("owner", user.id)
      .create();
    const [record] = await db
      .insert(sandboxes)
      .values({
        name,
        user: user.id,
        msbName,
        hostPort: port,
        guestPort: DEFAULT_GUEST_PORT, // or generate a random port with randomPort()
        image,
        status: "running",
        memory,
        cpu,
      })
      .returning();
    const distro = (await sandbox.shell("check-shell")).stdout().trim();
    await db.update(sandboxes).set({ distro }).where(eq(sandboxes.id, record.id));
    await sandbox.execDetached("start-gateway");
    await sandbox.detach();
    return c.json({ sandbox: record }, 201);
  } catch (e) {
    log.error(e as Error);
    if (sandbox) await sandbox.destroy().catch(() => undefined);
    releasePort(port);
    return c.json({ error: "create failed" }, 500);
  }
});

// List
sandboxesRoutes.get("/sandboxes", async (c: Context<Env>) => {
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

// starts
sandboxesRoutes.put("/sandboxes/:name/start", validateSandbox, async (c: Context<Env>) => {
  const record = c.get("sandbox");
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
sandboxesRoutes.put("/sandboxes/:name/stop", validateSandbox, async (c: Context<Env>) => {
  const record = c.get("sandbox");
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
sandboxesRoutes.delete("/sandboxes/:name", validateSandbox, async (c: Context<Env>) => {
  const sandbox = c.get("sandbox");

  try {
    const handle = await Sandbox.get(sandbox.msbName);
    await handle.stop();
    await handle.destroy();
    await db.delete(sandboxes).where(eq(sandboxes.id, sandbox.id));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "no such sandbox" }, 404);
  }
});

sandboxesRoutes.post("/test", validateImage, validateCommand, async (c: Context<Env>) => {
  const { image, command } = await c.req.json();
  const log = c.get("log");
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
    const sb = await Sandbox.builder(name).image(image).cpus(1).maxMemory(512).create();
    try {
      const out = await Promise.race([
        sb.shell(command),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS),
        ),
      ]);
      return c.text(out.stdout());
    } finally {
      await sb.destroy();
    }
  } catch (e) {
    log.error(e as Error);
    const isTimeout = e instanceof Error && e.message === "Timeout";
    return isTimeout
      ? c.json({ error: "Timeout" }, 504)
      : c.json({ error: "Internal Server Error" }, 500);
  } finally {
    running--;
  }
});

// Run a command in an existing sandbox
sandboxesRoutes.post("/sandboxes/:name/exec", validateCommand, async (c: Context<Env>) => {
  const name = c.req.param("name");
  if (!name) return c.json({ error: "sandbox not found" }, 404);
  const user = c.get("user");
  const { command } = await c.req.json();
  let sb;

  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) => and(eq(sandboxes.name, name), eq(sandboxes.user, user.id)),
  });

  if (!sandbox) {
    return c.json({ error: "sandbox not found" }, 404);
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

sandboxesRoutes.get(
  "/sandboxes/:name/ws",
  validateSandbox,
  upgradeWebSocket(async (c) => {
    const sandbox = c.get("sandbox");
    const log = c.get("log");
    let sb: Sandbox;

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
          log.error(e as Error);
        }
      },
      async onClose() {
        await process.kill().catch(() => undefined);
      },
    };
  }),
);

sandboxesRoutes.get("/sandboxes/:name/log-stream", validateSandbox, async (c: Context<Env>) => {
  const sandbox = c.get("sandbox");
  try {
    return streamSSE(c, async (stream) => {
      const handle = await Sandbox.get(sandbox.msbName);
      const logStream = await handle.logStream({ follow: true });
      for await (const s of logStream) {
        await stream.writeSSE({ id: randomUUID(), data: s.text().trimEnd(), event: "log-stream" });
      }
    });
  } catch {
    return c.json({ error: "no such sandbox" }, 400);
  }
});
