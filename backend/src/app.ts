import cors from "cors";
import express from "express";

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

  return app;
}
