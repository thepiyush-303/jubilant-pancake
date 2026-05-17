import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const iterations = 100000;
const digest = "sha512";

// Creates a salted password hash that can be stored safely in the database.
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");

  return `${salt}:${hash}`;
}

// Checks a plain password against the stored salt and hash.
export function verifyPassword(password: string, storedPasswordHash: string) {
  const [salt, storedHash] = storedPasswordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");

  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}
