import { drizzle } from "drizzle-orm/libsql"; // Or your specific SQLite driver
import { migrate } from "drizzle-orm/libsql/migrator"; // Driver-specific migrator
import { log } from "evlog";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = drizzle({
  connection: {
    url: process.env.GB_DATABASE_URL ?? "file:./db.sqlite",
  },
});

async function runMigrations() {
  log.info("Running migrations...");

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../drizzle"),
  });

  log.info("Migrations completed successfully!");
}

runMigrations().catch((err) => {
  log.error("Migration failed:", err);
  process.exit(1);
});
