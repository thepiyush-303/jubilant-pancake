import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest, UserRole } from "./auth.types.js";

// Requires the authenticated user to match one of the allowed roles.
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "You do not have permission for this action." });
      return;
    }

    next();
  };
}
