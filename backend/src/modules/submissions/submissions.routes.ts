import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import {
  findAssignmentById,
  isAssignmentParticipant,
  toPositiveId,
} from "../assignments/assignments.service.js";
import { findTeamById, isTeamMember } from "../teams/teams.service.js";
import { createSubmission, listSubmissionsForAssignment } from "./submissions.service.js";

export const submissionsRouter = Router();

// Lists submissions for an assignment when the user can access that assignment.
submissionsRouter.get("/assignment/:assignmentId", requireAuth, (req: AuthenticatedRequest, res) => {
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
    res.status(403).json({ message: "You do not have access to these submissions." });
    return;
  }

  res.json({ submissions: listSubmissionsForAssignment(assignmentId) });
});

// Creates a simple submission using notes and an optional file URL/reference.
submissionsRouter.post("/", requireAuth, requireRole("STUDENT"), (req: AuthenticatedRequest, res) => {
  const { assignmentId, teamId, fileUrl, notes } = req.body as {
    assignmentId?: unknown;
    teamId?: unknown;
    fileUrl?: string;
    notes?: string;
  };
  const parsedAssignmentId = Number(assignmentId);

  if (!req.user || !Number.isInteger(parsedAssignmentId) || parsedAssignmentId <= 0) {
    res.status(400).json({ message: "Valid assignment id is required." });
    return;
  }

  const assignment = findAssignmentById(parsedAssignmentId) as
    | { mode: "INDIVIDUAL" | "TEAM"; status: "OPEN" | "CLOSED" }
    | undefined;

  if (!assignment || assignment.status !== "OPEN") {
    res.status(400).json({ message: "Submissions are only allowed for open assignments." });
    return;
  }

  if (!isAssignmentParticipant(parsedAssignmentId, req.user.id)) {
    res.status(403).json({ message: "You are not part of this assignment." });
    return;
  }

  if (assignment.mode === "INDIVIDUAL") {
    const submission = createSubmission({
      assignmentId: parsedAssignmentId,
      studentId: req.user.id,
      fileUrl: fileUrl?.trim(),
      notes: notes?.trim(),
    });

    res.status(201).json({ submission });
    return;
  }

  const parsedTeamId = Number(teamId);
  const team = Number.isInteger(parsedTeamId) ? findTeamById(parsedTeamId) : undefined;

  if (!team || team.assignment_id !== parsedAssignmentId || !isTeamMember(parsedTeamId, req.user.id)) {
    res.status(400).json({ message: "A valid team membership is required for team submissions." });
    return;
  }

  const submission = createSubmission({
    assignmentId: parsedAssignmentId,
    teamId: parsedTeamId,
    fileUrl: fileUrl?.trim(),
    notes: notes?.trim(),
  });

  res.status(201).json({ submission });
});
