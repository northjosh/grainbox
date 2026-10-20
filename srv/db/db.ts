import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

export const db = drizzle({
  connection: {
    url: process.env.GB_DATABASE_URL ?? "file:./db.sqlite",
  },
  schema,
});

export type Db = typeof db;
