import { useLogger } from "evlog/hono";
import { db } from "../../db/db.js";
import { ports, type SandboxRecord } from "../../db/schema.js";
import { BASE_DOMAIN } from "../constants.js";
import { deregisterRoute, registerRoute } from "../sandbox/networking.js";
import { generateUrlName } from "../utils/generate-name.js";

const log = useLogger();

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
