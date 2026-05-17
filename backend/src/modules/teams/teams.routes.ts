import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import {
  findAssignmentById,
  isAssignmentParticipant,
  toPositiveId,
} from "../assignments/assignments.service.js";
import {
  addTeamMember,
  createTeam,
  findTeamById,
  isTeamMember,
  listTeamsForAssignment,
  studentHasTeamForAssignment,
} from "./teams.service.js";

export const teamsRouter = Router();

// Lists teams for an assignment when the current user can view that assignment.
teamsRouter.get("/assignment/:assignmentId", requireAuth, (req: AuthenticatedRequest, res) => {
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
    res.status(403).json({ message: "You do not have access to these teams." });
    return;
  }

  res.json({ teams: listTeamsForAssignment(assignmentId) });
});

// Creates a team for a team-based assignment and adds selected participants.
teamsRouter.post("/", requireAuth, requireRole("STUDENT"), (req: AuthenticatedRequest, res) => {
  const { assignmentId, name, memberIds } = req.body as {
    assignmentId?: unknown;
    name?: string;
    memberIds?: unknown;
  };
  const parsedAssignmentId = Number(assignmentId);

  if (!req.user || !Number.isInteger(parsedAssignmentId) || parsedAssignmentId <= 0 || !name?.trim()) {
    res.status(400).json({ message: "Assignment id and team name are required." });
    return;
  }

  const assignment = findAssignmentById(parsedAssignmentId) as
    | { mode: "INDIVIDUAL" | "TEAM"; status: "OPEN" | "CLOSED" }
    | undefined;

  if (!assignment || assignment.mode !== "TEAM" || assignment.status !== "OPEN") {
    res.status(400).json({ message: "Teams can only be created for open team assignments." });
    return;
  }

  const selectedMemberIds = Array.isArray(memberIds)
    ? memberIds.filter((id): id is number => Number.isInteger(id))
    : [];
  const allMemberIds = [req.user.id, ...selectedMemberIds];

  if (allMemberIds.some((studentId) => !isAssignmentParticipant(parsedAssignmentId, studentId))) {
    res.status(400).json({ message: "Every team member must be part of the assignment." });
    return;
  }

  if (allMemberIds.some((studentId) => studentHasTeamForAssignment(parsedAssignmentId, studentId))) {
    res.status(400).json({ message: "Each student can belong to only one team for this assignment." });
    return;
  }

  const team = createTeam(parsedAssignmentId, req.user.id, name.trim(), selectedMemberIds);

  res.status(201).json({ team });
});

// Adds an assignment participant to an existing team.
teamsRouter.post("/:teamId/members", requireAuth, requireRole("STUDENT"), (req: AuthenticatedRequest, res) => {
  const teamId = toPositiveId(req.params.teamId);
  const { studentId } = req.body as { studentId?: unknown };
  const parsedStudentId = Number(studentId);

  if (!req.user || !teamId || !Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
    res.status(400).json({ message: "Valid team id and student id are required." });
    return;
  }

  const team = findTeamById(teamId);

  if (!team || team.status !== "OPEN") {
    res.status(404).json({ message: "Open team not found." });
    return;
  }

  if (!isTeamMember(teamId, req.user.id)) {
    res.status(403).json({ message: "Only current team members can add another member." });
    return;
  }

  if (!isAssignmentParticipant(team.assignment_id, parsedStudentId)) {
    res.status(400).json({ message: "Student must be part of the assignment." });
    return;
  }

  if (studentHasTeamForAssignment(team.assignment_id, parsedStudentId)) {
    res.status(400).json({ message: "Student already belongs to a team for this assignment." });
    return;
  }

  res.json({ team: addTeamMember(teamId, parsedStudentId) });
});
