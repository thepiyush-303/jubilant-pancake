import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import {
  createAssignment,
  findAssignmentById,
  isAssignmentMode,
  isAssignmentParticipant,
  isAssignmentStatus,
  listAssignmentCriteria,
  listAssignmentParticipants,
  listStudentAssignments,
  listTeacherAssignments,
  toPositiveId,
  updateAssignmentStatus,
} from "./assignments.service.js";

export const assignmentsRouter = Router();

// Lists assignments for the logged-in user's role.
assignmentsRouter.get("/", requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication is required." });
    return;
  }

  const assignments =
    req.user.role === "TEACHER"
      ? listTeacherAssignments(req.user.id)
      : listStudentAssignments(req.user.id);

  res.json({ assignments });
});

// Creates an assignment with participants and criteria for a teacher.
assignmentsRouter.post("/", requireAuth, requireRole("TEACHER"), (req: AuthenticatedRequest, res) => {
  const { title, description, mode, participantIds, criteria } = req.body as {
    title?: string;
    description?: string;
    mode?: unknown;
    participantIds?: unknown;
    criteria?: unknown;
  };

  if (!req.user) {
    res.status(401).json({ message: "Authentication is required." });
    return;
  }

  if (!title?.trim() || !isAssignmentMode(mode)) {
    res.status(400).json({ message: "Title and valid mode are required." });
    return;
  }

  if (!Array.isArray(participantIds) || participantIds.some((id) => !Number.isInteger(id))) {
    res.status(400).json({ message: "Participant ids must be an array of integers." });
    return;
  }

  if (
    !Array.isArray(criteria) ||
    criteria.length === 0 ||
    criteria.some(
      (criterion) =>
        typeof criterion !== "object" ||
        criterion === null ||
        typeof (criterion as { label?: unknown }).label !== "string" ||
        !(criterion as { label: string }).label.trim() ||
        !Number.isInteger((criterion as { maxScore?: unknown }).maxScore) ||
        Number((criterion as { maxScore?: unknown }).maxScore) <= 0
    )
  ) {
    res.status(400).json({ message: "At least one valid evaluation criterion is required." });
    return;
  }

  const assignment = createAssignment(req.user.id, {
    title: title.trim(),
    description: description?.trim(),
    mode,
    participantIds,
    criteria: criteria.map((criterion) => ({
      label: (criterion as { label: string }).label.trim(),
      maxScore: (criterion as { maxScore: number }).maxScore,
    })),
  });

  res.status(201).json({ assignment });
});

// Returns assignment details with participants and criteria when the user can access it.
assignmentsRouter.get("/:assignmentId", requireAuth, (req: AuthenticatedRequest, res) => {
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
    res.status(403).json({ message: "You do not have access to this assignment." });
    return;
  }

  res.json({
    assignment,
    participants: listAssignmentParticipants(assignmentId),
    criteria: listAssignmentCriteria(assignmentId),
  });
});

// Updates the open or closed status of a teacher-owned assignment.
assignmentsRouter.patch(
  "/:assignmentId/status",
  requireAuth,
  requireRole("TEACHER"),
  (req: AuthenticatedRequest, res) => {
    const assignmentId = toPositiveId(req.params.assignmentId);
    const { status } = req.body as { status?: unknown };

    if (!req.user || !assignmentId || !isAssignmentStatus(status)) {
      res.status(400).json({ message: "Valid assignment id and status are required." });
      return;
    }

    const assignment = updateAssignmentStatus(assignmentId, req.user.id, status);

    if (!assignment) {
      res.status(404).json({ message: "Assignment not found for this teacher." });
      return;
    }

    res.json({ assignment });
  }
);
