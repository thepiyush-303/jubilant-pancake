import type { AssignmentDetail, Evaluation, Submission, Team, User } from "./types";

const API_URL = "http://localhost:4000/api";

// Converts failed API responses into readable errors for the UI.
async function readApiError(response: Response) {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  return data?.message ?? "Request failed.";
}

// Sends an API request with JSON headers and optional bearer token.
async function request<T>(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as T;
}

// Logs in with a seeded account and returns the token plus user.
export function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Loads the current logged-in user from a stored token.
export function getMe(token: string) {
  return request<{ user: User }>("/auth/me", {}, token);
}

// Loads all students for teacher assignment creation.
export function getStudents(token: string) {
  return request<{ students: User[] }>("/users/students", {}, token);
}

// Loads assignments visible to the logged-in user.
export function getAssignments(token: string) {
  return request<{ assignments: AssignmentDetail["assignment"][] }>("/assignments", {}, token);
}

// Loads one assignment with participants and criteria.
export function getAssignmentDetail(token: string, assignmentId: number) {
  return request<AssignmentDetail>(`/assignments/${assignmentId}`, {}, token);
}

// Creates a teacher assignment with selected participants and criteria.
export function createAssignment(
  token: string,
  payload: {
    title: string;
    description: string;
    mode: string;
    participantIds: number[];
    criteria: Array<{ label: string; maxScore: number }>;
  }
) {
  return request<{ assignment: AssignmentDetail["assignment"] }>("/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

// Changes an assignment between open and closed.
export function updateAssignmentStatus(token: string, assignmentId: number, status: string) {
  return request<{ assignment: AssignmentDetail["assignment"] }>(`/assignments/${assignmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, token);
}

// Loads teams for one assignment.
export function getTeams(token: string, assignmentId: number) {
  return request<{ teams: Team[] }>(`/teams/assignment/${assignmentId}`, {}, token);
}

// Creates a student team for a team-based assignment.
export function createTeam(token: string, payload: { assignmentId: number; name: string; memberIds: number[] }) {
  return request<{ team: Team }>("/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

// Loads submissions for one assignment.
export function getSubmissions(token: string, assignmentId: number) {
  return request<{ submissions: Submission[] }>(`/submissions/assignment/${assignmentId}`, {}, token);
}

// Creates a student submission for an individual assignment or team.
export function createSubmission(
  token: string,
  payload: { assignmentId: number; teamId?: number; fileUrl: string; notes: string }
) {
  return request<{ submission: Submission }>("/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

// Loads evaluations for one assignment.
export function getEvaluations(token: string, assignmentId: number) {
  return request<{ evaluations: Evaluation[] }>(`/evaluations/assignment/${assignmentId}`, {}, token);
}

// Creates a teacher evaluation for a student or team.
export function createEvaluation(
  token: string,
  payload: {
    assignmentId: number;
    studentId?: number;
    teamId?: number;
    feedback: string;
    scores: Array<{ criterionId: number; score: number }>;
  }
) {
  return request<{ evaluation: Evaluation }>("/evaluations", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}
