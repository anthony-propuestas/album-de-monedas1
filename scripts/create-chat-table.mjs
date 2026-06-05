import { DatabaseSync } from "node:sqlite";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const d1Dir = decodeURIComponent(new URL("../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/", import.meta.url).pathname.slice(1).replace(/\//g, "\\"));

if (!existsSync(d1Dir)) {
  console.error("D1 state dir not found:", d1Dir);
  console.log("Start the dev server at least once first (npm run dev) to initialize D1, then re-run this script.");
  process.exit(1);
}

const files = readdirSync(d1Dir).filter(f => f.endsWith(".sqlite") && !f.includes("metadata"));
if (files.length === 0) {
  console.error("No D1 SQLite file found in", d1Dir);
  process.exit(1);
}

const dbPath = join(d1Dir, files[0]);
console.log("Opening:", dbPath);

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    user_name   TEXT    NOT NULL,
    user_picture TEXT,
    message     TEXT    NOT NULL CHECK(length(message) <= 500),
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
console.log("✓ Table chat_messages created (or already exists).");
db.close();
