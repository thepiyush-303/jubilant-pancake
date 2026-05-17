import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";

// Resolves the configured database path so every caller uses the same SQLite file.
const databasePath = resolve(env.databaseFile);

// Ensures the database folder exists before SQLite tries to create the file.
mkdirSync(dirname(databasePath), { recursive: true });

// Opens a reusable SQLite connection for the backend process.
export const db = new Database(databasePath);

// Enables foreign key checks so relational rules are enforced by SQLite.
db.pragma("foreign_keys = ON");
