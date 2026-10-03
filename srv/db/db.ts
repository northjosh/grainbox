import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

export const db = drizzle({
    connection: {
        url: "file:./db.sqlite"
    },
    schema,
});


export type Db = typeof db;