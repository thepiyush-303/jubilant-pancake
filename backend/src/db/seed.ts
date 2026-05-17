import { db } from "./connection.js";
import { hashPassword } from "../utils/password.js";

const defaultPassword = "password123";

const users = [
  { name: "Demo Teacher", email: "teacher@example.com", role: "TEACHER" },
  { name: "Student One", email: "student1@example.com", role: "STUDENT" },
  { name: "Student Two", email: "student2@example.com", role: "STUDENT" },
  { name: "Student Three", email: "student3@example.com", role: "STUDENT" },
] as const;

// Prepares the SQL statement that inserts a user only when the email is not already present.
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash, role)
  VALUES (@name, @email, @passwordHash, @role)
`);

// Keeps all seed inserts together so the database is not half-seeded if one insert fails.
const seedUsers = db.transaction(() => {
  for (const user of users) {
    insertUser.run({
      ...user,
      passwordHash: hashPassword(defaultPassword),
    });
  }
});

seedUsers();

console.log("Seed users created successfully.");
console.log(`Default password for all seeded users: ${defaultPassword}`);
