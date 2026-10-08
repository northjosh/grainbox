import { Sandbox, Snapshot } from "microsandbox";
import { randomUUID } from "node:crypto";
import { sandboxes, snapshots, type SandboxRecord, type User } from "../../db/schema.js";
import { db } from "../../db/db.js";
import { and, eq } from "drizzle-orm";
import { DEFAULT_CPUS, DEFAULT_MEMORY } from "../constants.js";

export async function createSnapshot(sandbox: SandboxRecord, name: string | undefined) {
  if (name === undefined) {
    name = `${sandbox}-${randomUUID().slice(0, 6)}`;
  }

  await Snapshot.builder(name)
    .fromSandbox(sandbox.name)
    .label("owner", sandbox.user)
    .full()
    .create();

  return await db
    .insert(snapshots)
    .values({ name, sandbox: sandbox.id, user: sandbox.user })
    .returning();
}

export async function deleteSnapshot(name: string, user: User) {
  const [s] = await db
    .select({
      name: snapshots.name,
      id: snapshots.id,
    })
    .from(snapshots)
    .where(and(eq(snapshots.name, name), eq(snapshots.user, user.id)))
    .limit(1);

  if (!s) throw new Error("Snapshot Not found");

  await Snapshot.remove(s.name);

  return (await db.delete(snapshots).where(eq(snapshots.id, s.id))).rowsAffected;
}

export async function restoreSnapshot(id: string, name: string, user: User) {
  const [s] = await db
    .select({
      name: snapshots.name,
    })
    .from(snapshots)
    .where(and(eq(snapshots.id, id), eq(snapshots.user, user.id)))
    .limit(1);

  if (!s) throw new Error("Snapshot Not found");
  const snap = await Snapshot.get(s.name);

  const cpu = DEFAULT_CPUS;
  const memory = DEFAULT_MEMORY;

  await Sandbox.restore(snap).memory(memory).cpus(cpu).restore();

  const [record] = await db
    .insert(sandboxes)
    .values({
      name: name,
      user: user.id,
      image: snap.imageRef,
      status: "active",
      memory,
      cpu,
    })
    .returning();

  return record;
}
