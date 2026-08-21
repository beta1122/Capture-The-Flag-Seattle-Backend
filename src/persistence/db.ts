import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";

export function createDb(path: string): Database.Database {
    if (path !== ":memory:") {
        mkdirSync(dirname(path), { recursive: true });
    }
    const db = new Database(path);
    if (path !== ":memory:") {
        db.pragma("journal_mode = WAL");
    }
    db.exec(`
        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            room_code TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER NOT NULL,
            north_score INTEGER NOT NULL,
            south_score INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id TEXT NOT NULL REFERENCES matches(id),
            player_id TEXT NOT NULL,
            type TEXT NOT NULL,
            time INTEGER NOT NULL,
            payload TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_events_match_id ON events(match_id);
    `);
    return db;
}

let defaultDb: Database.Database | undefined;

// Lazily-created singleton for production use - this is the one legitimate
// process-wide shared resource in the new design (a DB connection, not game state).
export function getDb(): Database.Database {
    if (defaultDb === undefined) {
        defaultDb = createDb(process.env.CTF_DB_PATH ?? "./data/ctf.db");
    }
    return defaultDb;
}
