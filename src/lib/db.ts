import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";

const DATA_DIR = "data";
const DB_PATH = "data/clothes.db";

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS clothes (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('top', 'bottom')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    top_id TEXT NOT NULL REFERENCES clothes(id) ON DELETE CASCADE,
    bottom_id TEXT NOT NULL REFERENCES clothes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(top_id, bottom_id)
  )
`);

export default db;
