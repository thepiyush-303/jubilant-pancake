export type UserRole = "TEACHER" | "STUDENT";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type AssignmentMode = "INDIVIDUAL" | "TEAM";

export type AssignmentStatus = "OPEN" | "CLOSED";

export type Assignment = {
  id: number;
  title: string;
  description: string | null;
  mode: AssignmentMode;
  status: AssignmentStatus;
  teacher_id: number;
  teacher_name: string;
  participant_count?: number;
  criteria_count?: number;
};

export type Criterion = {
  id: number;
  assignment_id: number;
  label: string;
  max_score: number;
};

export type Team = {
  id: number;
  assignment_id: number;
  name: string;
  created_by_student_id: number;
  created_by_name?: string;
  members?: User[];
};

export type Submission = {
  id: number;
  assignment_id: number;
  student_id: number | null;
  student_name: string | null;
  team_id: number | null;
  team_name: string | null;
  file_url: string | null;
  notes: string | null;
  submitted_at: string;
};

export type Evaluation = {
  id: number;
  assignment_id: number;
  student_id: number | null;
  student_name: string | null;
  team_id: number | null;
  team_name: string | null;
  feedback: string | null;
  scores?: Array<{
    id: number;
    criterion_id: number;
    label: string;
    max_score: number;
    score: number;
  }>;
};

export type AssignmentDetail = {
  assignment: Assignment;
  participants: User[];
  criteria: Criterion[];
};
