import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { JwtPayload } from "./auth.types.js";

// Creates a signed token that identifies the logged-in user.
export function createToken(userId: number) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: "1d" });
}

// Verifies a signed token and returns the stored user id payload.
export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
