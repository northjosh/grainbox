import { db } from "../../db/db.js";
import { ports, type SandboxRecord } from "../../db/schema.js";
import { BASE_DOMAIN } from "../constants.js";
import { deregisterRoute, registerRoute } from "../sandbox/networking.js";
import { generateUrlName } from "../utils/generate-name.js";
import { eq } from "drizzle-orm";
import { log } from "evlog";

export async function createPort(port: string, sandbox: SandboxRecord) {
  const id = generateUrlName();
  try {
    registerRoute(id, sandbox.hostPort, port);

    const url = `${id}.${BASE_DOMAIN}`;

    const [newPort] = await db
      .insert(ports)
      .values({ number: port, sandbox: sandbox.id, url })
      .returning();

    return newPort;
  } catch (e) {
    log.error(e as Error);
    deregisterRoute(id);
  }
}

export async function deletePortsForSandbox(sandboxId: string) {
  try {
    const records = await db.query.ports.findMany({
      where: (ports, { eq }) => eq(ports.sandbox, sandboxId),
    });

    records.forEach((port) => { 
      const id = port.url.split(".")[0]
      if (id) deregisterRoute(port.url)
    });
    await db.delete(ports).where(eq(ports.sandbox, sandboxId));
  } catch (e) {
    log.error(e as Error);
    throw e
  }
}
