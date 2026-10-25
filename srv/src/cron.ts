import { db } from "#/db/db.js";
import { sandboxes } from "../db/schema.js";
import { eq } from "drizzle-orm";
import cron from "node-cron";
import { deletePortsForSandbox } from "./ports/ports.js";
import { log } from "evlog";
import { Sandbox, SandboxNotFoundError } from "microsandbox";

export const task = cron.schedule(
  "*/5 * * * * ",
  async (ctx) => {
    log.info("starting cleanup job");
    // find expired sandboxes
    const expired = await db.query.sandboxes.findMany({
      where: (sandboxes, { lte }) => lte(sandboxes.expiresAt, ctx.date),
    });

    // delete ports for sandbox if any
    for (const box of expired) {
      try {
        await deletePortsForSandbox(box.id);
        try {
          const sb = await Sandbox.get(box.msbName);
          await sb.kill();
          await Sandbox.remove(box.msbName);
        } catch (e) {
          if (!(e instanceof SandboxNotFoundError)) {
            throw e;
          }
          log.info("sandbox already removed; continuing database cleanup");
        }
        await db.delete(sandboxes).where(eq(sandboxes.id, box.id));
      } catch (e) {
        log.error(e as Error);
      }
    }
  },
  { noOverlap: true },
);
