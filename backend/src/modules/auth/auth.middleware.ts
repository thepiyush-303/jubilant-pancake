import type { NextFunction, Response } from "express";
import { findUserById } from "./auth.service.js";
import { verifyToken } from "./auth.tokens.js";
import type { AuthenticatedRequest } from "./auth.types.js";

// Reads the Bearer token from the Authorization header.
function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length);
}

// Requires a valid JWT and attaches the logged-in user to the request.
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ message: "Missing auth token." });
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = findUserById(payload.userId);

    if (!user) {
      res.status(401).json({ message: "User no longer exists." });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired auth token." });
  }
}
