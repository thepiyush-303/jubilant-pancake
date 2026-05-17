import cors from "cors";
import express from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { evaluationsRouter } from "./modules/evaluations/evaluations.routes.js";
import { submissionsRouter } from "./modules/submissions/submissions.routes.js";
import { teamsRouter } from "./modules/teams/teams.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

// Creates the Express application and registers global middleware/routes.
export function createApp() {
  const app = express();

  // Allows the React frontend to call backend APIs from a different local port.
  app.use(cors());

  // Parses JSON request bodies so API handlers can read req.body.
  app.use(express.json());

  // Provides a simple endpoint to confirm the backend is running.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Registers authentication APIs under one route prefix.
  app.use("/api/auth", authRouter);

  // Registers user lookup APIs used by teacher assignment forms.
  app.use("/api/users", usersRouter);

  // Registers assignment APIs used by teachers and students.
  app.use("/api/assignments", assignmentsRouter);

  // Registers team APIs used by students in team-based assignments.
  app.use("/api/teams", teamsRouter);

  // Registers submission APIs used by students and teachers.
  app.use("/api/submissions", submissionsRouter);

  // Registers evaluation APIs used by teachers and students.
  app.use("/api/evaluations", evaluationsRouter);

  return app;
}
