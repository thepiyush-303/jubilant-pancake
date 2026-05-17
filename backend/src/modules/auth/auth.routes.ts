import { Router } from "express";
import { verifyPassword } from "../../utils/password.js";
import { requireAuth } from "./auth.middleware.js";
import { findUserByEmail, toAuthUser } from "./auth.service.js";
import { createToken } from "./auth.tokens.js";
import type { AuthenticatedRequest } from "./auth.types.js";

export const authRouter = Router();

// Logs in a seeded teacher or student and returns a JWT for later requests.
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const authUser = toAuthUser(user);
  const token = createToken(authUser.id);

  res.json({ token, user: authUser });
});

// Returns the currently logged-in user based on the provided JWT.
authRouter.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});
