import { Sandbox, Snapshot } from "microsandbox";
import { randomUUID } from "node:crypto";
import { sandboxes, snapshots, type SandboxRecord, type User } from "../../db/schema.js";
import { db } from "../../db/db.js";
import { and, eq } from "drizzle-orm";
import { DEFAULT_CPUS, DEFAULT_GUEST_PORT, DEFAULT_MEMORY, PREFIX } from "../constants.js";
import { generateSandboxName } from "../utils/generate-name.js";
import { releasePort, setPort } from "./networking.js";

export async function createSnapshot(sandbox: SandboxRecord, user: string, name: string | undefined) {
  if (name === undefined) {
    name = `${sandbox}-${randomUUID().slice(0, 6)}`;
  }

  const msbName = `${sandbox.msbName}:${name}`
  await Snapshot.builder(name)
    .fromSandbox(sandbox.msbName)
    .label("owner", user)
    .full()
    .create();

  return await db
    .insert(snapshots)
    .values({ name, sandbox: sandbox.id, msbName,  user })
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
      msbName: snapshots.msbName,
    })
    .from(snapshots)
    .where(and(eq(snapshots.id, id), eq(snapshots.user, user.id)))
    .limit(1);

  if (!s) throw new Error("Snapshot Not found");
  const snap = await Snapshot.get(s.msbName);

  const cpu = DEFAULT_CPUS;
  const memory = DEFAULT_MEMORY;
  let record;

  const generated = generateSandboxName();

  const res = await setPort(generated);

  const port = res["port"];
  try {
    await Sandbox.restore(snap)
      .name(name)
      .memory(memory)
      .cpus(cpu)
      .port(port, 80)
      .restore();


    [record] = await db
      .insert(sandboxes)
      .values({
        name: name,
        user: user.id,
        msbName: PREFIX + generated,
        hostPort: port,
        guestPort: DEFAULT_GUEST_PORT,
        image: snap.imageRef,
        status: "active",
        memory,
        cpu,
      })
      .returning();
  } catch(e) {
    console.error(e)
    releasePort(port);
  }

  return record;
}
