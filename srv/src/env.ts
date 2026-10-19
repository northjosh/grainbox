import type { AuditableLogger } from "evlog";
import type { SandboxRecord, Session, User } from "../db/schema.js";

export type Env = {
  Variables: {
    session: Session;
    user: Pick<User, "id" | "name" | "email" | "role">;
    sandbox: SandboxRecord;
    log: AuditableLogger;
  };
};
