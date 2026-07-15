import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });
    db = new Database(env.dbPath);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
  }

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}
