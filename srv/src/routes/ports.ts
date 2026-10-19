import { Context, Hono } from "hono";
import { Sandbox } from "microsandbox";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/db.js";
import { ports } from "../../db/schema.js";
import { generateUrlName } from "../utils/generate-name.js";
import { validateSandbox } from "../middleware.js";
import { MAX_PORTS, BASE_DOMAIN } from "../constants.js";
import { registerRoute } from "../sandbox/networking.js";
import type { Env } from "../env.js";

export const portRoutes = new Hono<Env>();

// port management
// get ports for a sandbox
portRoutes.get("/sandboxes/:name/ports", validateSandbox, async (c: Context<Env>) => {
  const sandbox = c.get("sandbox");

  const results = await db.query.ports.findMany({
    where: (ports, { eq }) => eq(ports.sandbox, sandbox.id),
  });

  return c.json({ results });
});

portRoutes.get("/sandboxes/:name/poll-ports", validateSandbox, async (c: Context<Env>) => {
  const log = c.get("log");
  const user = c.get("user");
  const sb = c.get("sandbox");
  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) =>
      and(eq(sandboxes.name, sb.name), eq(sandboxes.user, user.id)),
    with: {
      ports: true,
    },
  });

  if (!sandbox) {
    return c.json({ error: "sandbox not found" }, 404);
  }

  try {
    const handle = await Sandbox.get(sandbox.msbName);
    const sb = await handle.connectOrStart();
    const scanned = JSON.parse((await sb.shell("scan-ports")).stdout()) as number[];
    const registered = new Set(sandbox.ports.map((port) => Number(port.number)));
    const res = scanned.filter((port) => !registered.has(Number(port)));
    return c.json({ res });
  } catch (e) {
    log.error(e as Error);
    return c.json({ error: "an error occured" }, 404);
  }
});

//new port
portRoutes.post("/sandboxes/:name/ports", validateSandbox, async (c: Context<Env>) => {
  const sb = c.get("sandbox");
  const user = c.get("user");
  const { port } = await c.req.json();

  const sandbox = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) =>
      and(eq(sandboxes.name, sb.name), eq(sandboxes.user, user.id)),
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
    const id = generateUrlName();
    registerRoute(id, sandbox.hostPort, port);
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

portRoutes.delete("/sandboxes/:name/ports/:id", validateSandbox, async (c: Context<Env>) => {
  const id = c.req.param("id");
  const sandbox = c.get("sandbox");

  if (!id) return c.json({ error: "invalid port" }, 400);

  try {
    await db.delete(ports).where(and(eq(ports.id, id), eq(ports.sandbox, sandbox.id)));
    return c.json({ message: "port deleted" });
  } catch {
    return c.json({ error: "error deleting port" }, 400);
  }
});
