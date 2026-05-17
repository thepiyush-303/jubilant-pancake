import { db } from "../../db/connection.js";
import type { CreateAssignmentInput } from "./assignments.types.js";

// Converts an unknown route value into a usable positive integer id.
export function toPositiveId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Checks whether a value is one of the supported assignment modes.
export function isAssignmentMode(value: unknown): value is CreateAssignmentInput["mode"] {
  return value === "INDIVIDUAL" || value === "TEAM";
}

// Checks whether a value is one of the supported assignment statuses.
export function isAssignmentStatus(value: unknown): value is "OPEN" | "CLOSED" {
  return value === "OPEN" || value === "CLOSED";
}

// Creates an assignment with selected students and teacher-defined criteria in one transaction.
export function createAssignment(teacherId: number, input: CreateAssignmentInput) {
  const createInTransaction = db.transaction(() => {
    const assignmentResult = db
      .prepare(
        `INSERT INTO assignments (title, description, mode, status, teacher_id)
         VALUES (@title, @description, @mode, 'OPEN', @teacherId)`
      )
      .run({
        title: input.title,
        description: input.description ?? null,
        mode: input.mode,
        teacherId,
      });

    const assignmentId = Number(assignmentResult.lastInsertRowid);
    const insertParticipant = db.prepare(
      "INSERT OR IGNORE INTO assignment_participants (assignment_id, student_id) VALUES (?, ?)"
    );
    const insertCriterion = db.prepare(
      "INSERT INTO evaluation_criteria (assignment_id, label, max_score) VALUES (?, ?, ?)"
    );

    for (const studentId of input.participantIds) {
      insertParticipant.run(assignmentId, studentId);
    }

    for (const criterion of input.criteria) {
      insertCriterion.run(assignmentId, criterion.label, criterion.maxScore);
    }

    return assignmentId;
  });

  return findAssignmentById(createInTransaction());
}

// Lists assignments created by a teacher with lightweight counts for dashboard display.
export function listTeacherAssignments(teacherId: number) {
  return db
    .prepare(
      `SELECT
        a.id,
        a.title,
        a.description,
        a.mode,
        a.status,
        a.teacher_id,
        u.name AS teacher_name,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT ap.student_id) AS participant_count,
        COUNT(DISTINCT ec.id) AS criteria_count
       FROM assignments a
       JOIN users u ON u.id = a.teacher_id
       LEFT JOIN assignment_participants ap ON ap.assignment_id = a.id
       LEFT JOIN evaluation_criteria ec ON ec.assignment_id = a.id
       WHERE a.teacher_id = ?
       GROUP BY a.id
       ORDER BY a.created_at DESC`
    )
    .all(teacherId);
}

// Lists assignments visible to a student through assignment participation.
export function listStudentAssignments(studentId: number) {
  return db
    .prepare(
      `SELECT
        a.id,
        a.title,
        a.description,
        a.mode,
        a.status,
        a.teacher_id,
        u.name AS teacher_name,
        a.created_at,
        a.updated_at
       FROM assignments a
       JOIN users u ON u.id = a.teacher_id
       JOIN assignment_participants ap ON ap.assignment_id = a.id
       WHERE ap.student_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(studentId);
}

// Finds a single assignment by id with its teacher name.
export function findAssignmentById(assignmentId: number) {
  return db
    .prepare(
      `SELECT
        a.id,
        a.title,
        a.description,
        a.mode,
        a.status,
        a.teacher_id,
        u.name AS teacher_name,
        a.created_at,
        a.updated_at
       FROM assignments a
       JOIN users u ON u.id = a.teacher_id
       WHERE a.id = ?`
    )
    .get(assignmentId);
}

// Checks whether a student belongs to an assignment participant list.
export function isAssignmentParticipant(assignmentId: number, studentId: number) {
  const row = db
    .prepare("SELECT id FROM assignment_participants WHERE assignment_id = ? AND student_id = ?")
    .get(assignmentId, studentId);

  return Boolean(row);
}

// Reads the selected students for one assignment.
export function listAssignmentParticipants(assignmentId: number) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role
       FROM assignment_participants ap
       JOIN users u ON u.id = ap.student_id
       WHERE ap.assignment_id = ?
       ORDER BY u.name`
    )
    .all(assignmentId);
}

// Reads the custom evaluation criteria for one assignment.
export function listAssignmentCriteria(assignmentId: number) {
  return db
    .prepare(
      `SELECT id, assignment_id, label, max_score, created_at
       FROM evaluation_criteria
       WHERE assignment_id = ?
       ORDER BY id`
    )
    .all(assignmentId);
}

// Updates an assignment status between OPEN and CLOSED.
export function updateAssignmentStatus(assignmentId: number, teacherId: number, status: "OPEN" | "CLOSED") {
  db.prepare(
    `UPDATE assignments
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND teacher_id = ?`
  ).run(status, assignmentId, teacherId);

  return findAssignmentById(assignmentId);
}
