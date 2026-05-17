import { db } from "../../db/connection.js";
import type { AuthUser, UserRow } from "./auth.types.js";

// Finds a user by email for login.
export function findUserByEmail(email: string) {
  return db
    .prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
}

// Finds a user by id for authenticated requests.
export function findUserById(id: number) {
  return db
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get(id) as AuthUser | undefined;
}

// Removes sensitive database fields before sending user data to the client.
export function toAuthUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
