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
    .select("student_id, status, students:student_id(grade, status, profiles:profile_id(full_name))")
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
      "id, student_id, scheduled_at, status, zoom_link, class_stories:class_story_id(title), profiles:student_id(full_name)",
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
    profiles: { full_name: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.profiles?.full_name ?? "—",
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
