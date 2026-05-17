export type AssignmentMode = "INDIVIDUAL" | "TEAM";

export type AssignmentStatus = "OPEN" | "CLOSED";

export type AssignmentRow = {
  id: number;
  title: string;
  description: string | null;
  mode: AssignmentMode;
  status: AssignmentStatus;
  teacher_id: number;
  teacher_name: string;
  created_at: string;
  updated_at: string;
};

export type CreateAssignmentInput = {
  title: string;
  description?: string;
  mode: AssignmentMode;
  participantIds: number[];
  criteria: Array<{
    label: string;
    maxScore: number;
  }>;
};
