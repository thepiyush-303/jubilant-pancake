import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import { listStudents } from "./users.service.js";

export const usersRouter = Router();

// Returns all students so teachers can select assignment participants.
usersRouter.get("/students", requireAuth, requireRole("TEACHER"), (_req, res) => {
  res.json({ students: listStudents() });
});
