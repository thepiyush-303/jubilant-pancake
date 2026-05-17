import dotenv from "dotenv";

// Loads environment variables from a local .env file during development.
dotenv.config();

// Stores application configuration in one place so other files do not read process.env directly.
export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseFile: process.env.DATABASE_FILE ?? "./data/app.db",
  jwtSecret: process.env.JWT_SECRET ?? "change-this-development-secret",
};
