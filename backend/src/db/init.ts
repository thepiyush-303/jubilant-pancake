import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./connection.js";

// Finds the current file directory in ES module mode.
const currentDir = dirname(fileURLToPath(import.meta.url));

// Loads the raw SQL schema from disk so database structure stays readable.
const schema = readFileSync(join(currentDir, "schema.sql"), "utf-8");

// Runs all CREATE TABLE statements inside the schema file.
db.exec(schema);

console.log("Database tables created successfully.");
