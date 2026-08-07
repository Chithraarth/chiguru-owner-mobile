import * as SQLite from "expo-sqlite";

// Mirrors chiguru-owner-web's idb-backed offline-db.ts: two queues (generic
// mutations vs. media-bearing estate updates), same retry/attempts semantics,
// same estate-pinning-at-enqueue-time behavior.

export type QueueTable = "sync_queue" | "estate_updates_queue";

export interface QueueItem {
  id: number;
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body: string; // JSON-stringified
  estateId: number | null;
  clientId: string | null;
  attempts: number;
  createdAt: number;
}

const MAX_ATTEMPTS = 5;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("chiguru-owner-mobile.db").then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          method TEXT NOT NULL,
          body TEXT NOT NULL,
          estateId INTEGER,
          clientId TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS estate_updates_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          method TEXT NOT NULL,
          body TEXT NOT NULL,
          estateId INTEGER,
          clientId TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function enqueue(
  table: QueueTable,
  item: Omit<QueueItem, "id" | "attempts" | "createdAt">
) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ${table} (path, method, body, estateId, clientId, attempts, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [item.path, item.method, item.body, item.estateId, item.clientId, Date.now()]
  );
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const a = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM sync_queue`);
  const b = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM estate_updates_queue`);
  return (a?.c ?? 0) + (b?.c ?? 0);
}

export async function getAll(table: QueueTable): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<QueueItem>(`SELECT * FROM ${table} ORDER BY id ASC`);
}

export async function remove(table: QueueTable, id: number) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

export async function bumpAttempts(table: QueueTable, id: number, attempts: number) {
  if (attempts >= MAX_ATTEMPTS) {
    await remove(table, id);
    return;
  }
  const db = await getDb();
  await db.runAsync(`UPDATE ${table} SET attempts = ? WHERE id = ?`, [attempts, id]);
}

export { MAX_ATTEMPTS };
