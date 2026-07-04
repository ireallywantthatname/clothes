const LIBSQL_URL = process.env.LIBSQL_URL;
const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN;
const isRemote = !!LIBSQL_URL && !!LIBSQL_AUTH_TOKEN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = { execute: (...args: any[]) => any };

let _dbPromise: Promise<DbClient> | null = null;

async function getDb(): Promise<DbClient> {
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    let client: DbClient;

    if (isRemote) {
      const { createClient } = await import("@libsql/client/http");
      const url = LIBSQL_URL!.startsWith("libsql://")
        ? LIBSQL_URL!.replace("libsql://", "https://")
        : LIBSQL_URL!;
      client = createClient({ url, authToken: LIBSQL_AUTH_TOKEN }) as DbClient;
    } else {
      const { createClient } = await import("@libsql/client");
      client = createClient({ url: "file:data/clothes.db" }) as DbClient;
    }

    // Initialize schema (idempotent, non-fatal at build time)
    try {
      await client.execute("PRAGMA foreign_keys = ON");
      await client.execute(`
        CREATE TABLE IF NOT EXISTS clothes (
          id TEXT PRIMARY KEY,
          image_url TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('top', 'bottom')),
          status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS matches (
          id TEXT PRIMARY KEY,
          top_id TEXT NOT NULL REFERENCES clothes(id) ON DELETE CASCADE,
          bottom_id TEXT NOT NULL REFERENCES clothes(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(top_id, bottom_id)
        )
      `);
    } catch {
      // Build-time — schema already exists
    }

    return client;
  })();

  return _dbPromise;
}

// Wrapper that delegates to the underlying client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = {
  async execute(...args: any[]) {
    const client = await getDb();
    return client.execute(...args);
  },
};

export default db;
