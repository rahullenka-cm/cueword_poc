// ============================================================================
// Live coach data — real queries against the production tutored schema
// (dev project). Replaces the mock `coachData.ts` (CW) screen by screen.
// Reads run as the authenticated coach, so RLS scopes them to their own roster.
//
// Shapes here reflect the REAL schema (stages→terms→levels→class_stories,
// class_sessions, attendance, skill_trackers), not the old per-skill mock model.
// ============================================================================
import { getSupabaseBrowser } from "@cueword/core/lib/supabase/client";

// ---- result types ----------------------------------------------------------
export interface CoachLoad {
  active_students: number;
  sessions_today: number;
  items_to_mark: number;
}

export interface RosterEntry {
  studentId: string; // = profiles.id (= students.profile_id)
  name: string;
  grade: number | null;
  status: string;
}

export interface TodaySession {
  id: string;
  studentId: string;
  studentName: string;
  storyTitle: string | null;
  scheduledAt: string;
  status: string;
  zoomLink: string | null;
}

export interface AttendanceRate {
  studentId: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalMarked: number;
  attendanceRate: number | null;
}

// ---- queries ---------------------------------------------------------------

/** Dashboard KPIs for a coach (from v_coach_load). */
export async function getCoachLoad(coachId: string): Promise<CoachLoad> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("v_coach_load")
    .select("active_students, sessions_today, items_to_mark")
    .eq("coach_id", coachId)
    .maybeSingle();
  if (error) throw error;
  return {
    active_students: Number(data?.active_students ?? 0),
    sessions_today: Number(data?.sessions_today ?? 0),
    items_to_mark: Number(data?.items_to_mark ?? 0),
  };
}

/** The coach's active roster (enrollments → students → profiles). */
export async function getRoster(coachId: string): Promise<RosterEntry[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("enrollments")
    .select("student_id, status, students!enrollments_student_id_fkey(grade, status, profiles!students_profile_id_fkey(full_name))")
    .eq("coach_id", coachId)
    .eq("status", "active");
  if (error) throw error;
  type Row = {
    student_id: string;
    students: { grade: number | null; status: string; profiles: { full_name: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    studentId: r.student_id,
    name: r.students?.profiles?.full_name ?? "—",
    grade: r.students?.grade ?? null,
    status: r.students?.status ?? "—",
  }));
}

/** A coach's sessions scheduled for today (class_sessions → class_stories + student name). */
export async function getTodaySessions(coachId: string): Promise<TodaySession[]> {
  const sb = getSupabaseBrowser();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("class_sessions")
    .select(
      "id, student_id, scheduled_at, status, zoom_link, class_stories:class_story_id(title), students!class_sessions_student_id_fkey(profiles!students_profile_id_fkey(full_name))",
    )
    .eq("coach_id", coachId)
    .gte("scheduled_at", `${today}T00:00:00Z`)
    .lte("scheduled_at", `${today}T23:59:59Z`)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  type Row = {
    id: string;
    student_id: string;
    scheduled_at: string;
    status: string;
    zoom_link: string | null;
    class_stories: { title: string } | null;
    students: { profiles: { full_name: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? "—",
    storyTitle: r.class_stories?.title ?? null,
    scheduledAt: r.scheduled_at,
    status: r.status,
    zoomLink: r.zoom_link,
  }));
}

/** Attendance rates for a set of students (from v_attendance_rate). */
export async function getAttendanceRates(studentIds: string[]): Promise<AttendanceRate[]> {
  if (studentIds.length === 0) return [];
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("v_attendance_rate")
    .select("student_id, present_count, late_count, absent_count, total_marked, attendance_rate")
    .in("student_id", studentIds);
  if (error) throw error;
  type Row = {
    student_id: string;
    present_count: number;
    late_count: number;
    absent_count: number;
    total_marked: number;
    attendance_rate: number | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    studentId: r.student_id,
    presentCount: Number(r.present_count ?? 0),
    lateCount: Number(r.late_count ?? 0),
    absentCount: Number(r.absent_count ?? 0),
    totalMarked: Number(r.total_marked ?? 0),
    attendanceRate: r.attendance_rate,
  }));
}

// ---- coach profile (coaches + profiles + v_tutor_stats) --------------------
export interface CoachProfile {
  fullName: string;
  email: string | null;
  timezone: string | null;
  tzCity: string | null;
  type: string | null;
  capacity: number | null;
  zoomLink: string | null;
  sessionsHeld: number;
  hoursTaught: number;
  attendanceRate: number | null;
  avgAccuracy: number | null;
}
export async function getCoachProfile(coachId: string): Promise<CoachProfile | null> {
  const sb = getSupabaseBrowser();
  const { data: c } = await sb
    .from("coaches")
    .select("type, capacity, zoom_link, timezone, profiles!coaches_profile_id_fkey(full_name, email, timezone, tz_city)")
    .eq("profile_id", coachId)
    .maybeSingle();
  const { data: s } = await sb
    .from("v_tutor_stats")
    .select("sessions_held, hours_taught, attendance_rate, avg_accuracy")
    .eq("coach_id", coachId)
    .maybeSingle();
  if (!c) return null;
  const row = c as unknown as {
    type: string | null; capacity: number | null; zoom_link: string | null; timezone: string | null;
    profiles: { full_name: string; email: string | null; timezone: string | null; tz_city: string | null } | null;
  };
  const st = (s ?? {}) as { sessions_held?: number; hours_taught?: number; attendance_rate?: number | null; avg_accuracy?: number | null };
  return {
    fullName: row.profiles?.full_name ?? "—",
    email: row.profiles?.email ?? null,
    timezone: row.profiles?.timezone ?? row.timezone ?? null,
    tzCity: row.profiles?.tz_city ?? null,
    type: row.type,
    capacity: row.capacity,
    zoomLink: row.zoom_link,
    sessionsHeld: Number(st.sessions_held ?? 0),
    hoursTaught: Number(st.hours_taught ?? 0),
    attendanceRate: st.attendance_rate ?? null,
    avgAccuracy: st.avg_accuracy ?? null,
  };
}

// ---- parent comms log ------------------------------------------------------
export interface ParentComm {
  id: string;
  studentId: string;
  studentName: string;
  channel: string;
  template: string | null;
  note: string | null;
  sentAt: string | null;
}
export async function getParentComms(coachId: string): Promise<ParentComm[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("parent_comms")
    .select("id, student_id, channel, template, note, sent_at, students!parent_comms_student_id_fkey(profiles!students_profile_id_fkey(full_name))")
    .eq("coach_id", coachId)
    .order("sent_at", { ascending: false });
  if (error) throw error;
  type Row = {
    id: string; student_id: string; channel: string; template: string | null; note: string | null;
    sent_at: string | null; students: { profiles: { full_name: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? "—",
    channel: r.channel,
    template: r.template,
    note: r.note,
    sentAt: r.sent_at,
  }));
}

// ---- marking queue (submissions awaiting coach action) ---------------------
export interface MarkingItem {
  id: string;
  studentId: string;
  studentName: string;
  type: string; // spoken | written
  skill: string | null;
  status: string; // submitted | ai_scored
  storyTitle: string | null;
  createdAt: string;
}
export async function getMarkingQueue(studentIds: string[]): Promise<MarkingItem[]> {
  if (studentIds.length === 0) return [];
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("submissions")
    .select("id, student_id, type, skill, status, created_at, students!submissions_student_id_fkey(profiles!students_profile_id_fkey(full_name)), story_sections:section_id(class_stories:class_story_id(title))")
    .in("student_id", studentIds)
    .in("status", ["submitted", "ai_scored"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  type Row = {
    id: string; student_id: string; type: string; skill: string | null; status: string; created_at: string;
    students: { profiles: { full_name: string } | null } | null;
    story_sections: { class_stories: { title: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? "—",
    type: r.type,
    skill: r.skill,
    status: r.status,
    storyTitle: r.story_sections?.class_stories?.title ?? null,
    createdAt: r.created_at,
  }));
}

// ---- sessions over a date window (schedule) --------------------------------
export interface SessionRow {
  id: string;
  studentId: string;
  studentName: string;
  storyTitle: string | null;
  scheduledAt: string;
  status: string;
}
export async function getSessions(coachId: string, fromISO: string, toISO: string): Promise<SessionRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("class_sessions")
    .select("id, student_id, scheduled_at, status, class_stories:class_story_id(title), students!class_sessions_student_id_fkey(profiles!students_profile_id_fkey(full_name))")
    .eq("coach_id", coachId)
    .gte("scheduled_at", fromISO)
    .lte("scheduled_at", toISO)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  type Row = {
    id: string; student_id: string; scheduled_at: string; status: string;
    class_stories: { title: string } | null; students: { profiles: { full_name: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? "—",
    storyTitle: r.class_stories?.title ?? null,
    scheduledAt: r.scheduled_at,
    status: r.status,
  }));
}

// ---- student detail --------------------------------------------------------
export interface SkillTracker {
  skill: string;
  rating: number | null;
  status: string;
}
export interface StudentDetail {
  studentId: string;
  name: string;
  grade: number | null;
  status: string;
  skills: SkillTracker[];
  attendance: AttendanceRate | null;
}
export async function getStudentDetail(studentId: string): Promise<StudentDetail | null> {
  const sb = getSupabaseBrowser();
  const { data: stu } = await sb
    .from("students")
    .select("grade, status, profiles!students_profile_id_fkey(full_name)")
    .eq("profile_id", studentId)
    .maybeSingle();
  if (!stu) return null;
  const s = stu as unknown as { grade: number | null; status: string; profiles: { full_name: string } | null };
  const { data: trackers } = await sb
    .from("skill_trackers")
    .select("skill, rating, status")
    .eq("student_id", studentId);
  const att = await getAttendanceRates([studentId]);
  return {
    studentId,
    name: s.profiles?.full_name ?? "—",
    grade: s.grade,
    status: s.status,
    skills: ((trackers ?? []) as SkillTracker[]).map((t) => ({ skill: t.skill, rating: t.rating, status: t.status })),
    attendance: att[0] ?? null,
  };
}

// ---- curriculum (read-only hierarchy: stage → term → level → stories) ------
export interface CurriculumLevel {
  levelId: string;
  stageNumber: number;
  termNumber: number;
  numberInStage: number;
  lo: string | null;
  storyCount: number;
}
export async function getCurriculumLevels(): Promise<CurriculumLevel[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("levels")
    .select("id, number_in_stage, lo, terms:term_id(number, stages:stage_id(number)), class_stories(count)")
    .order("number_in_stage", { ascending: true });
  if (error) throw error;
  type Row = {
    id: string; number_in_stage: number; lo: string | null;
    terms: { number: number; stages: { number: number } | null } | null;
    class_stories: { count: number }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    levelId: r.id,
    stageNumber: r.terms?.stages?.number ?? 0,
    termNumber: r.terms?.number ?? 0,
    numberInStage: r.number_in_stage,
    lo: r.lo,
    storyCount: r.class_stories?.[0]?.count ?? 0,
  }));
}

// ---- single submission (marking detail) ------------------------------------
export interface MarkingDetail {
  id: string;
  studentId: string;
  studentName: string;
  type: string; // spoken | written
  skill: string | null;
  status: string;
  storyTitle: string | null;
  phase: string | null;
  createdAt: string;
  body: string | null; // written text
  contentUrl: string | null; // spoken audio (Storage)
  score: number | null;
  tutorFeedback: string | null;
  // AI scoring is produced by the eval function (deployed when we move to the
  // company repo); until then this is null and the UI shows a pending state.
  ai: { status: string; result: unknown | null; modelUsed: string | null } | null;
}
export async function getMarkingItem(id: string): Promise<MarkingDetail | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("submissions")
    .select(
      "id, student_id, type, skill, status, body, content_url, score, tutor_feedback, created_at, students!submissions_student_id_fkey(profiles!students_profile_id_fkey(full_name)), story_sections:section_id(phase, class_stories:class_story_id(title)), ai_evaluations(status, result, model_used, completed_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type Row = {
    id: string; student_id: string; type: string; skill: string | null; status: string;
    body: string | null; content_url: string | null; score: number | null; tutor_feedback: string | null;
    created_at: string;
    students: { profiles: { full_name: string } | null } | null;
    story_sections: { phase: string | null; class_stories: { title: string } | null } | null;
    ai_evaluations: { status: string; result: unknown | null; model_used: string | null; completed_at: string | null }[] | null;
  };
  const r = data as unknown as Row;
  // ai_evaluations is one-to-many; take the most recently completed.
  const evals = (r.ai_evaluations ?? []).slice().sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const e = evals[0] ?? null;
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? "—",
    type: r.type,
    skill: r.skill,
    status: r.status,
    storyTitle: r.story_sections?.class_stories?.title ?? null,
    phase: r.story_sections?.phase ?? null,
    createdAt: r.created_at,
    body: r.body,
    contentUrl: r.content_url,
    score: r.score,
    tutorFeedback: r.tutor_feedback,
    ai: e ? { status: e.status, result: e.result, modelUsed: e.model_used } : null,
  };
}
