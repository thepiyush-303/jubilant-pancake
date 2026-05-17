import { db } from "../../db/connection.js";

// Reads all teams for one assignment with their members grouped as JSON.
export function listTeamsForAssignment(assignmentId: number) {
  const rows = db
    .prepare(
      `SELECT
        t.id,
        t.assignment_id,
        t.name,
        t.created_by_student_id,
        creator.name AS created_by_name,
        t.created_at,
        COALESCE(
          json_group_array(
            json_object('id', member.id, 'name', member.name, 'email', member.email)
          ) FILTER (WHERE member.id IS NOT NULL),
          '[]'
        ) AS members
       FROM teams t
       JOIN users creator ON creator.id = t.created_by_student_id
       LEFT JOIN team_members tm ON tm.team_id = t.id
       LEFT JOIN users member ON member.id = tm.student_id
       WHERE t.assignment_id = ?
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )
    .all(assignmentId) as Array<{ members: string }>;

  return rows.map((row) => ({
    ...row,
    members: JSON.parse(row.members) as Array<{ id: number; name: string; email: string }>,
  }));
}

// Checks whether a student is already in a team for the same assignment.
export function studentHasTeamForAssignment(assignmentId: number, studentId: number) {
  const row = db
    .prepare(
      `SELECT tm.id
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE t.assignment_id = ? AND tm.student_id = ?`
    )
    .get(assignmentId, studentId);

  return Boolean(row);
}

// Checks whether a student is a member of one team.
export function isTeamMember(teamId: number, studentId: number) {
  const row = db
    .prepare("SELECT id FROM team_members WHERE team_id = ? AND student_id = ?")
    .get(teamId, studentId);

  return Boolean(row);
}

// Finds a team by id with its assignment mode and status.
export function findTeamById(teamId: number) {
  return db
    .prepare(
      `SELECT
        t.id,
        t.assignment_id,
        t.name,
        t.created_by_student_id,
        a.mode,
        a.status
       FROM teams t
       JOIN assignments a ON a.id = t.assignment_id
       WHERE t.id = ?`
    )
    .get(teamId) as
    | {
        id: number;
        assignment_id: number;
        name: string;
        created_by_student_id: number;
        mode: "INDIVIDUAL" | "TEAM";
        status: "OPEN" | "CLOSED";
      }
    | undefined;
}

// Creates a team and adds the creator plus selected members in one transaction.
export function createTeam(assignmentId: number, creatorId: number, name: string, memberIds: number[]) {
  const createInTransaction = db.transaction(() => {
    const result = db
      .prepare(
        "INSERT INTO teams (assignment_id, name, created_by_student_id) VALUES (?, ?, ?)"
      )
      .run(assignmentId, name, creatorId);
    const teamId = Number(result.lastInsertRowid);
    const insertMember = db.prepare("INSERT OR IGNORE INTO team_members (team_id, student_id) VALUES (?, ?)");

    for (const studentId of [creatorId, ...memberIds]) {
      insertMember.run(teamId, studentId);
    }

    return teamId;
  });

  return findTeamById(createInTransaction());
}

// Adds one student to an existing team.
export function addTeamMember(teamId: number, studentId: number) {
  db.prepare("INSERT OR IGNORE INTO team_members (team_id, student_id) VALUES (?, ?)").run(teamId, studentId);

  return findTeamById(teamId);
}
