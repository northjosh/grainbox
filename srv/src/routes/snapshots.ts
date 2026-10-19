import { Hono } from "hono";
import { db } from "../../db/db.js";
import { validateSandbox } from "../middleware.js";
import { createSnapshot, deleteSnapshot, restoreSnapshot } from "../sandbox/snapshots.js";
import type { Env } from "../env.js";

export const snapshotRoutes = new Hono<Env>();

//snapshots
snapshotRoutes.get("/snapshots", async (c) => {
  const user = c.get("user");
  const snapshots = await db.query.snapshots.findMany({
    where: (snapshots, { eq }) => eq(snapshots.user, user.id),
  });

  return c.json({ snapshots });
});

snapshotRoutes.post("/sandboxes/:sandbox/snapshot", validateSandbox, async (c) => {
  const { name } = await c.req.json();
  const sandbox = c.req.param("sandbox");
  if (!sandbox) throw new Error("sandbox not found");
  const user = c.get("user");
  const log = c.get("log");

  const existing = await db.query.sandboxes.findFirst({
    where: (sandboxes, { and, eq }) =>
      and(eq(sandboxes.name, sandbox), eq(sandboxes.user, user.id)),
    with: {
      user: true,
    },
  });

  if (!existing) throw new Error("sandbox not found");

  try {
    const snapshot = await createSnapshot(existing, existing.user.id, name);
    return c.json({ snapshot }, 201);
  } catch (e) {
    log.error(e as Error);
    return c.json({ error: "snapshot failed" }, 500);
  }
});

snapshotRoutes.post("/snapshots/:id/restore", async (c) => {
  const { name } = await c.req.json();
  const id = c.req.param("id");
  const user = c.get("user");
  const log = c.get("log");
  try {
    const sandbox = await restoreSnapshot(id, name, user);
    return c.json({ sandbox: sandbox }, 201);
  } catch (e) {
    log.error(e as Error);
    return c.json({ error: "snapshot restore failed" }, 500);
  }
});

snapshotRoutes.delete("/snapshots/:id", async (c) => {
  const name = c.req.param("id");
  const user = c.get("user");
  const log = c.get("log");
  try {
    await deleteSnapshot(name, user);
    return c.json({ message: "snapshot deleted" }, 200);
  } catch (e) {
    log.error(e as Error);
    return c.json({ error: "snapshot delete failed" }, 500);
  }
});
