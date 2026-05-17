import { db } from "../../db/connection.js";
import type { AuthUser } from "../auth/auth.types.js";

// Reads all student users ordered by name for selection controls.
export function listStudents() {
  return db
    .prepare("SELECT id, name, email, role FROM users WHERE role = 'STUDENT' ORDER BY name")
    .all() as AuthUser[];
}
