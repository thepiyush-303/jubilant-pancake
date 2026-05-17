import { db } from "../../db/connection.js";

// Creates a submission for either an individual student or a team.
export function createSubmission(input: {
  assignmentId: number;
  studentId?: number;
  teamId?: number;
  fileUrl?: string;
  notes?: string;
}) {
  const result = db
    .prepare(
      `INSERT INTO submissions (assignment_id, student_id, team_id, file_url, notes)
       VALUES (@assignmentId, @studentId, @teamId, @fileUrl, @notes)`
    )
    .run({
      assignmentId: input.assignmentId,
      studentId: input.studentId ?? null,
      teamId: input.teamId ?? null,
      fileUrl: input.fileUrl ?? null,
      notes: input.notes ?? null,
    });

  return findSubmissionById(Number(result.lastInsertRowid));
}

// Finds one submission with student or team display names.
export function findSubmissionById(submissionId: number) {
  return db
    .prepare(
      `SELECT
        s.id,
        s.assignment_id,
        s.student_id,
        student.name AS student_name,
        s.team_id,
        team.name AS team_name,
        s.file_url,
        s.notes,
        s.submitted_at
       FROM submissions s
       LEFT JOIN users student ON student.id = s.student_id
       LEFT JOIN teams team ON team.id = s.team_id
       WHERE s.id = ?`
    )
    .get(submissionId);
}

// Lists submissions for one assignment.
export function listSubmissionsForAssignment(assignmentId: number) {
  return db
    .prepare(
      `SELECT
        s.id,
        s.assignment_id,
        s.student_id,
        student.name AS student_name,
        s.team_id,
        team.name AS team_name,
        s.file_url,
        s.notes,
        s.submitted_at
       FROM submissions s
       LEFT JOIN users student ON student.id = s.student_id
       LEFT JOIN teams team ON team.id = s.team_id
       WHERE s.assignment_id = ?
       ORDER BY s.submitted_at DESC`
    )
    .all(assignmentId);
}
