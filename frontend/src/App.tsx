import { BookOpen, Check, ClipboardList, LogOut, Plus, RefreshCw, Send, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createAssignment,
  createEvaluation,
  createSubmission,
  createTeam,
  getAssignmentDetail,
  getAssignments,
  getEvaluations,
  getMe,
  getStudents,
  getSubmissions,
  getTeams,
  login,
  updateAssignmentStatus,
} from "./api";
import type { Assignment, AssignmentDetail, Evaluation, Submission, Team, User } from "./types";

const tokenKey = "academic-evaluation-token";

// Renders the full application and owns the logged-in session state.
export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  // Restores a saved session when the page loads.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    getMe(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem(tokenKey);
        setToken("");
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Stores a new login session after successful authentication.
  function handleLogin(nextToken: string, nextUser: User) {
    localStorage.setItem(tokenKey, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setError("");
  }

  // Clears the saved session and returns to the login screen.
  function handleLogout() {
    localStorage.removeItem(tokenKey);
    setToken("");
    setUser(null);
  }

  if (loading) {
    return <PageShell>Loading session...</PageShell>;
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} error={error} setError={setError} />;
  }

  return (
    <PageShell>
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{user.role === "TEACHER" ? "Teacher portal" : "Student portal"}</p>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{user.name}</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </header>
      {user.role === "TEACHER" ? <TeacherDashboard token={token} /> : <StudentDashboard token={token} user={user} />}
    </PageShell>
  );
}

// Provides the common page background and width constraints.
function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-50">{children}</main>;
}

// Renders the seeded-account login form.
function LoginScreen({
  onLogin,
  error,
  setError,
}: {
  onLogin: (token: string, user: User) => void;
  error: string;
  setError: (message: string) => void;
}) {
  const [email, setEmail] = useState("teacher@example.com");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);

  // Authenticates against the backend and stores the returned user session.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const data = await login(email, password);
      onLogin(data.token, data.user);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-slate-900 text-white">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Academic Evaluation</h1>
            <p className="text-sm text-slate-500">Use seeded accounts</p>
          </div>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60" disabled={submitting}>
          <Check size={16} />
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// Renders teacher workflows for assignment creation and evaluation.
function TeacherDashboard({ token }: { token: string }) {
  const [students, setStudents] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [message, setMessage] = useState("");

  // Loads teacher dashboard data from the backend.
  async function loadDashboard() {
    const [studentData, assignmentData] = await Promise.all([getStudents(token), getAssignments(token)]);
    setStudents(studentData.students);
    setAssignments(assignmentData.assignments);
    setSelectedId((current) => current ?? assignmentData.assignments[0]?.id ?? null);
  }

  // Loads the selected assignment workflow data.
  async function loadDetail(assignmentId: number) {
    const [assignmentData, teamData, submissionData, evaluationData] = await Promise.all([
      getAssignmentDetail(token, assignmentId),
      getTeams(token, assignmentId),
      getSubmissions(token, assignmentId),
      getEvaluations(token, assignmentId),
    ]);
    setDetail(assignmentData);
    setTeams(teamData.teams);
    setSubmissions(submissionData.submissions);
    setEvaluations(evaluationData.evaluations);
  }

  // Initializes teacher dashboard data on first render.
  useEffect(() => {
    loadDashboard().catch((error: Error) => setMessage(error.message));
  }, []);

  // Refreshes selected assignment details when selection changes.
  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId).catch((error: Error) => setMessage(error.message));
    }
  }, [selectedId]);

  // Updates the selected assignment status and refreshes the dashboard.
  async function handleStatus(status: string) {
    if (!detail) return;
    await updateAssignmentStatus(token, detail.assignment.id, status);
    await loadDashboard();
    await loadDetail(detail.assignment.id);
  }

  return (
    <section className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <CreateAssignmentForm token={token} students={students} onCreated={loadDashboard} />
        <AssignmentList assignments={assignments} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="space-y-6">
        {message ? <Notice message={message} /> : null}
        {detail ? (
          <>
            <AssignmentSummary detail={detail} onStatus={handleStatus} />
            <TeacherWorkspace token={token} detail={detail} teams={teams} submissions={submissions} evaluations={evaluations} onChanged={() => loadDetail(detail.assignment.id)} />
          </>
        ) : (
          <EmptyState label="No assignment selected" />
        )}
      </div>
    </section>
  );
}

// Renders the teacher form for creating assignments.
function CreateAssignmentForm({ token, students, onCreated }: { token: string; students: User[]; onCreated: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState("INDIVIDUAL");
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [criteria, setCriteria] = useState([{ label: "Viva", maxScore: 10 }]);
  const [message, setMessage] = useState("");

  // Toggles a student id inside the participant selection list.
  function toggleParticipant(studentId: number) {
    setParticipantIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
  }

  // Updates one criterion row in the local form state.
  function updateCriterion(index: number, key: "label" | "maxScore", value: string) {
    setCriteria((current) =>
      current.map((criterion, currentIndex) =>
        currentIndex === index
          ? { ...criterion, [key]: key === "maxScore" ? Number(value) : value }
          : criterion
      )
    );
  }

  // Sends the new assignment to the backend and clears the form.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      await createAssignment(token, { title, description, mode, participantIds, criteria });
      setTitle("");
      setDescription("");
      setParticipantIds([]);
      setCriteria([{ label: "Viva", maxScore: 10 }]);
      await onCreated();
      setMessage("Assignment created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create assignment.");
    }
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus size={18} />Create assignment</h2>
      <input className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea className="mb-3 h-20 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      <select className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2" value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="INDIVIDUAL">Individual</option>
        <option value="TEAM">Team</option>
      </select>
      <div className="mb-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Students</p>
        <div className="grid gap-2">
          {students.map((student) => (
            <label className="flex items-center gap-2 text-sm" key={student.id}>
              <input type="checkbox" checked={participantIds.includes(student.id)} onChange={() => toggleParticipant(student.id)} />
              {student.name}
            </label>
          ))}
        </div>
      </div>
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Criteria</p>
          <button className="rounded-md border border-slate-300 px-2 py-1 text-sm" type="button" onClick={() => setCriteria((current) => [...current, { label: "", maxScore: 10 }])}>Add</button>
        </div>
        {criteria.map((criterion, index) => (
          <div className="grid grid-cols-[1fr_80px] gap-2" key={index}>
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Label" value={criterion.label} onChange={(event) => updateCriterion(index, "label", event.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2" type="number" min={1} value={criterion.maxScore} onChange={(event) => updateCriterion(index, "maxScore", event.target.value)} />
          </div>
        ))}
      </div>
      {message ? <p className="mb-3 text-sm text-slate-600">{message}</p> : null}
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white">
        <Send size={16} />
        Create
      </button>
    </form>
  );
}

// Renders a selectable assignment list.
function AssignmentList({ assignments, selectedId, onSelect }: { assignments: Assignment[]; selectedId: number | null; onSelect: (id: number) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><ClipboardList size={18} />Assignments</h2>
      <div className="space-y-2">
        {assignments.map((assignment) => (
          <button className={`w-full rounded-md border px-3 py-2 text-left ${selectedId === assignment.id ? "border-slate-900 bg-slate-100" : "border-slate-200 hover:bg-slate-50"}`} key={assignment.id} onClick={() => onSelect(assignment.id)}>
            <span className="block font-medium">{assignment.title}</span>
            <span className="text-sm text-slate-500">{assignment.mode} · {assignment.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Renders summary information for the selected assignment.
function AssignmentSummary({ detail, onStatus }: { detail: AssignmentDetail; onStatus?: (status: string) => Promise<void> }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{detail.assignment.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{detail.assignment.description}</p>
          <p className="mt-2 text-sm text-slate-500">{detail.assignment.mode} · {detail.assignment.status} · {detail.assignment.teacher_name}</p>
        </div>
        {onStatus ? (
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" onClick={() => onStatus(detail.assignment.status === "OPEN" ? "CLOSED" : "OPEN")}>
            <RefreshCw size={16} />
            {detail.assignment.status === "OPEN" ? "Close" : "Open"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

// Renders teacher-side teams, submissions, and evaluation form.
function TeacherWorkspace({ token, detail, teams, submissions, evaluations, onChanged }: { token: string; detail: AssignmentDetail; teams: Team[]; submissions: Submission[]; evaluations: Evaluation[]; onChanged: () => Promise<void> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <DataPanel title="Teams" items={teams.map((team) => `${team.name}: ${(team.members ?? []).map((member) => member.name).join(", ") || "No members"}`)} />
      <DataPanel title="Submissions" items={submissions.map((submission) => submission.team_name ?? submission.student_name ?? "Submission")} />
      <EvaluationForm token={token} detail={detail} teams={teams} onChanged={onChanged} />
      <DataPanel title="Evaluations" items={evaluations.map((evaluation) => `${evaluation.team_name ?? evaluation.student_name}: ${evaluation.feedback ?? "No feedback"}`)} />
    </div>
  );
}

// Renders the teacher evaluation form for the selected assignment.
function EvaluationForm({ token, detail, teams, onChanged }: { token: string; detail: AssignmentDetail; teams: Team[]; onChanged: () => Promise<void> }) {
  const targets = detail.assignment.mode === "TEAM" ? teams : detail.participants;
  const [targetId, setTargetId] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");
  const [scores, setScores] = useState<Record<number, number>>({});
  const [message, setMessage] = useState("");

  // Submits scores and feedback for the selected target.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!targetId) return;

    try {
      await createEvaluation(token, {
        assignmentId: detail.assignment.id,
        ...(detail.assignment.mode === "TEAM" ? { teamId: Number(targetId) } : { studentId: Number(targetId) }),
        feedback,
        scores: detail.criteria.map((criterion) => ({
          criterionId: criterion.id,
          score: Number(scores[criterion.id] ?? 0),
        })),
      });
      setFeedback("");
      setScores({});
      await onChanged();
      setMessage("Evaluation saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save evaluation.");
    }
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <h3 className="mb-4 text-lg font-semibold">Evaluation</h3>
      <select className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2" value={targetId} onChange={(event) => setTargetId(Number(event.target.value))}>
        <option value="">Select target</option>
        {targets.map((target) => (
          <option key={target.id} value={target.id}>{target.name}</option>
        ))}
      </select>
      {detail.criteria.map((criterion) => (
        <label className="mb-3 block" key={criterion.id}>
          <span className="mb-1 block text-sm font-medium text-slate-700">{criterion.label} / {criterion.max_score}</span>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" type="number" min={0} max={criterion.max_score} value={scores[criterion.id] ?? 0} onChange={(event) => setScores((current) => ({ ...current, [criterion.id]: Number(event.target.value) }))} />
        </label>
      ))}
      <textarea className="mb-3 h-20 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} />
      {message ? <p className="mb-3 text-sm text-slate-600">{message}</p> : null}
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white">
        <Check size={16} />
        Save evaluation
      </button>
    </form>
  );
}

// Renders student workflows for assignments, teams, and submissions.
function StudentDashboard({ token, user }: { token: string; user: User }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [message, setMessage] = useState("");

  // Loads student assignments from the backend.
  async function loadAssignments() {
    const data = await getAssignments(token);
    setAssignments(data.assignments);
    setSelectedId((current) => current ?? data.assignments[0]?.id ?? null);
  }

  // Loads the selected student assignment workflow data.
  async function loadDetail(assignmentId: number) {
    const [assignmentData, teamData, submissionData, evaluationData] = await Promise.all([
      getAssignmentDetail(token, assignmentId),
      getTeams(token, assignmentId),
      getSubmissions(token, assignmentId),
      getEvaluations(token, assignmentId),
    ]);
    setDetail(assignmentData);
    setTeams(teamData.teams);
    setSubmissions(submissionData.submissions);
    setEvaluations(evaluationData.evaluations);
  }

  // Initializes student assignment data on first render.
  useEffect(() => {
    loadAssignments().catch((error: Error) => setMessage(error.message));
  }, []);

  // Refreshes student assignment details when selection changes.
  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId).catch((error: Error) => setMessage(error.message));
    }
  }, [selectedId]);

  return (
    <section className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
      <AssignmentList assignments={assignments} selectedId={selectedId} onSelect={setSelectedId} />
      <div className="space-y-6">
        {message ? <Notice message={message} /> : null}
        {detail ? (
          <>
            <AssignmentSummary detail={detail} />
            <StudentWorkspace token={token} user={user} detail={detail} teams={teams} submissions={submissions} evaluations={evaluations} onChanged={() => loadDetail(detail.assignment.id)} />
          </>
        ) : (
          <EmptyState label="No assignment selected" />
        )}
      </div>
    </section>
  );
}

// Renders student-side team and submission controls.
function StudentWorkspace({ token, user, detail, teams, submissions, evaluations, onChanged }: { token: string; user: User; detail: AssignmentDetail; teams: Team[]; submissions: Submission[]; evaluations: Evaluation[]; onChanged: () => Promise<void> }) {
  const ownTeam = useMemo(() => teams.find((team) => (team.members ?? []).some((member) => member.id === user.id)), [teams, user.id]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {detail.assignment.mode === "TEAM" ? <TeamForm token={token} detail={detail} ownTeam={ownTeam} onChanged={onChanged} /> : null}
      <SubmissionForm token={token} detail={detail} ownTeam={ownTeam} onChanged={onChanged} />
      <DataPanel title="Teams" items={teams.map((team) => `${team.name}: ${(team.members ?? []).map((member) => member.name).join(", ") || "No members"}`)} />
      <DataPanel title="Submissions" items={submissions.map((submission) => submission.team_name ?? submission.student_name ?? "Submission")} />
      <DataPanel title="Evaluations" items={evaluations.map((evaluation) => `${evaluation.team_name ?? evaluation.student_name}: ${evaluation.feedback ?? "No feedback"}`)} />
    </div>
  );
}

// Renders the student form for creating a team.
function TeamForm({ token, detail, ownTeam, onChanged }: { token: string; detail: AssignmentDetail; ownTeam?: Team; onChanged: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  // Toggles a selected teammate id for team creation.
  function toggleMember(studentId: number) {
    setMemberIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
  }

  // Creates a team for the selected assignment.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      await createTeam(token, { assignmentId: detail.assignment.id, name, memberIds });
      setName("");
      setMemberIds([]);
      await onChanged();
      setMessage("Team created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create team.");
    }
  }

  if (ownTeam) {
    return <DataPanel title="Your team" items={[`${ownTeam.name}: ${(ownTeam.members ?? []).map((member) => member.name).join(", ")}`]} />;
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Users size={18} />Team</h3>
      <input className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Team name" value={name} onChange={(event) => setName(event.target.value)} />
      <div className="mb-4 grid gap-2">
        {detail.participants.map((student) => (
          <label className="flex items-center gap-2 text-sm" key={student.id}>
            <input type="checkbox" checked={memberIds.includes(student.id)} onChange={() => toggleMember(student.id)} />
            {student.name}
          </label>
        ))}
      </div>
      {message ? <p className="mb-3 text-sm text-slate-600">{message}</p> : null}
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white">
        <Plus size={16} />
        Create team
      </button>
    </form>
  );
}

// Renders the student submission form.
function SubmissionForm({ token, detail, ownTeam, onChanged }: { token: string; detail: AssignmentDetail; ownTeam?: Team; onChanged: () => Promise<void> }) {
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  // Creates a submission for the selected assignment.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      await createSubmission(token, {
        assignmentId: detail.assignment.id,
        ...(detail.assignment.mode === "TEAM" && ownTeam ? { teamId: ownTeam.id } : {}),
        fileUrl,
        notes,
      });
      setFileUrl("");
      setNotes("");
      await onChanged();
      setMessage("Submission saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit.");
    }
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <h3 className="mb-4 text-lg font-semibold">Submission</h3>
      <input className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="File URL or reference" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
      <textarea className="mb-3 h-24 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      {message ? <p className="mb-3 text-sm text-slate-600">{message}</p> : null}
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white" disabled={detail.assignment.mode === "TEAM" && !ownTeam}>
        <Send size={16} />
        Submit
      </button>
    </form>
  );
}

// Renders a compact list panel for workflow data.
function DataPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <p className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" key={`${item}-${index}`}>{item}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No records</p>
      )}
    </section>
  );
}

// Renders a small message box for API errors and status messages.
function Notice({ message }: { message: string }) {
  return <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p>;
}

// Renders an empty state label in a bordered panel.
function EmptyState({ label }: { label: string }) {
  return <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">{label}</p>;
}
