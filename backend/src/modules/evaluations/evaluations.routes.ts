import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import {
  findAssignmentById,
  isAssignmentParticipant,
  toPositiveId,
} from "../assignments/assignments.service.js";
import { findTeamById } from "../teams/teams.service.js";
import {
  createEvaluation,
  listCriterionLimits,
  listEvaluationsForAssignment,
} from "./evaluations.service.js";

export const evaluationsRouter = Router();

// Lists evaluations for an assignment when the user can access that assignment.
evaluationsRouter.get("/assignment/:assignmentId", requireAuth, (req: AuthenticatedRequest, res) => {
  const assignmentId = toPositiveId(req.params.assignmentId);

  if (!req.user || !assignmentId) {
    res.status(400).json({ message: "Valid assignment id is required." });
    return;
  }

  const assignment = findAssignmentById(assignmentId) as { teacher_id: number } | undefined;

  if (!assignment) {
    res.status(404).json({ message: "Assignment not found." });
    return;
  }

  const canAccess =
    req.user.role === "TEACHER"
      ? assignment.teacher_id === req.user.id
      : isAssignmentParticipant(assignmentId, req.user.id);

  if (!canAccess) {
    res.status(403).json({ message: "You do not have access to these evaluations." });
    return;
  }

  res.json({ evaluations: listEvaluationsForAssignment(assignmentId) });
});

// Creates a teacher evaluation for either one student or one team.
evaluationsRouter.post("/", requireAuth, requireRole("TEACHER"), (req: AuthenticatedRequest, res) => {
  const { assignmentId, studentId, teamId, feedback, scores } = req.body as {
    assignmentId?: unknown;
    studentId?: unknown;
    teamId?: unknown;
    feedback?: string;
    scores?: unknown;
  };
  const parsedAssignmentId = Number(assignmentId);
  const parsedStudentId = Number(studentId);
  const parsedTeamId = Number(teamId);

  if (!req.user || !Number.isInteger(parsedAssignmentId) || parsedAssignmentId <= 0) {
    res.status(400).json({ message: "Valid assignment id is required." });
    return;
  }

  const assignment = findAssignmentById(parsedAssignmentId) as
    | { teacher_id: number; mode: "INDIVIDUAL" | "TEAM" }
    | undefined;

  if (!assignment || assignment.teacher_id !== req.user.id) {
    res.status(404).json({ message: "Assignment not found for this teacher." });
    return;
  }

  if (!Array.isArray(scores) || scores.length === 0) {
    res.status(400).json({ message: "At least one score is required." });
    return;
  }

  const parsedScores = scores.map((score) => ({
    criterionId: Number((score as { criterionId?: unknown }).criterionId),
    score: Number((score as { score?: unknown }).score),
  }));
  const limits = new Map(listCriterionLimits(parsedAssignmentId).map((criterion) => [criterion.id, criterion.max_score]));

  if (
    parsedScores.some(
      (score) =>
        !Number.isInteger(score.criterionId) ||
        !Number.isInteger(score.score) ||
        !limits.has(score.criterionId) ||
        score.score < 0 ||
        score.score > Number(limits.get(score.criterionId))
    )
  ) {
    res.status(400).json({ message: "Every score must match an assignment criterion and max score." });
    return;
  }

  if (assignment.mode === "INDIVIDUAL") {
    if (!Number.isInteger(parsedStudentId) || !isAssignmentParticipant(parsedAssignmentId, parsedStudentId)) {
      res.status(400).json({ message: "A valid assignment student is required." });
      return;
    }

    const evaluation = createEvaluation({
      assignmentId: parsedAssignmentId,
      teacherId: req.user.id,
      studentId: parsedStudentId,
      feedback: feedback?.trim(),
      scores: parsedScores,
    });

    res.status(201).json({ evaluation });
    return;
  }

  const team = Number.isInteger(parsedTeamId) ? findTeamById(parsedTeamId) : undefined;

  if (!team || team.assignment_id !== parsedAssignmentId) {
    res.status(400).json({ message: "A valid assignment team is required." });
    return;
  }

  const evaluation = createEvaluation({
    assignmentId: parsedAssignmentId,
    teacherId: req.user.id,
    teamId: parsedTeamId,
    feedback: feedback?.trim(),
    scores: parsedScores,
  });

  res.status(201).json({ evaluation });
});
