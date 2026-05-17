import { db } from "../../db/connection.js";

// Reads criteria rows as id and max score pairs for validation.
export function listCriterionLimits(assignmentId: number) {
  return db
    .prepare("SELECT id, max_score FROM evaluation_criteria WHERE assignment_id = ?")
    .all(assignmentId) as Array<{ id: number; max_score: number }>;
}

// Creates an evaluation with all criterion scores in one transaction.
export function createEvaluation(input: {
  assignmentId: number;
  teacherId: number;
  studentId?: number;
  teamId?: number;
  feedback?: string;
  scores: Array<{ criterionId: number; score: number }>;
}) {
  const createInTransaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO evaluations (assignment_id, student_id, team_id, teacher_id, feedback)
         VALUES (@assignmentId, @studentId, @teamId, @teacherId, @feedback)`
      )
      .run({
        assignmentId: input.assignmentId,
        studentId: input.studentId ?? null,
        teamId: input.teamId ?? null,
        teacherId: input.teacherId,
        feedback: input.feedback ?? null,
      });
    const evaluationId = Number(result.lastInsertRowid);
    const insertScore = db.prepare(
      "INSERT INTO evaluation_scores (evaluation_id, criterion_id, score) VALUES (?, ?, ?)"
    );

    for (const score of input.scores) {
      insertScore.run(evaluationId, score.criterionId, score.score);
    }

    return evaluationId;
  });

  return findEvaluationById(createInTransaction());
}

// Finds one evaluation with display names.
export function findEvaluationById(evaluationId: number) {
  return db
    .prepare(
      `SELECT
        e.id,
        e.assignment_id,
        e.student_id,
        student.name AS student_name,
        e.team_id,
        team.name AS team_name,
        e.teacher_id,
        teacher.name AS teacher_name,
        e.feedback,
        e.evaluated_at
       FROM evaluations e
       LEFT JOIN users student ON student.id = e.student_id
       LEFT JOIN teams team ON team.id = e.team_id
       JOIN users teacher ON teacher.id = e.teacher_id
       WHERE e.id = ?`
    )
    .get(evaluationId);
}

// Lists evaluations for one assignment with their detailed criterion scores.
export function listEvaluationsForAssignment(assignmentId: number) {
  const evaluations = db
    .prepare(
      `SELECT
        e.id,
        e.assignment_id,
        e.student_id,
        student.name AS student_name,
        e.team_id,
        team.name AS team_name,
        e.teacher_id,
        teacher.name AS teacher_name,
        e.feedback,
        e.evaluated_at
       FROM evaluations e
       LEFT JOIN users student ON student.id = e.student_id
       LEFT JOIN teams team ON team.id = e.team_id
       JOIN users teacher ON teacher.id = e.teacher_id
       WHERE e.assignment_id = ?
       ORDER BY e.evaluated_at DESC`
    )
    .all(assignmentId) as Array<{ id: number }>;
  const scoreStatement = db.prepare(
    `SELECT
      es.id,
      es.criterion_id,
      ec.label,
      ec.max_score,
      es.score
     FROM evaluation_scores es
     JOIN evaluation_criteria ec ON ec.id = es.criterion_id
     WHERE es.evaluation_id = ?
     ORDER BY es.id`
  );

  return evaluations.map((evaluation) => ({
    ...evaluation,
    scores: scoreStatement.all(evaluation.id),
  }));
}
