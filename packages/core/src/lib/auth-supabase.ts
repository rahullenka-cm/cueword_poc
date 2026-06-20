"use client";
// ============================================================================
// Real Supabase Auth (production) — additive alongside the POC config auth in
// auth.ts (which the student app still uses). The coach app uses THIS: a coach
// signs in with their provisioned login email + password; identity + role come
// from the `profiles` row (profiles.id = auth.users.id).
// ============================================================================
import { useEffect, useState } from "react";
import type { AuthUser, Role } from "./types";
import { getSupabaseBrowser } from "./supabase/client";

// Resolve the signed-in user's profile (role + name). Returns null if missing.
async function loadProfile(userId: string): Promise<AuthUser | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("profiles")
    .select("id, role, full_name, avatar_emoji")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    role: data.role as Role,
    full_name: (data.full_name as string) ?? "",
    avatar_emoji: (data.avatar_emoji as string | null) ?? null,
  };
}

/**
 * Sign in with a provisioned login email + password. Optionally assert the
 * account's role (the coach app passes "coach"). Throws on bad creds / wrong role.
 */
export async function signIn(
  email: string,
  password: string,
  expectRole?: Role,
): Promise<AuthUser> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Invalid email or password.");
  const profile = await loadProfile(data.user.id);
  if (!profile) {
    await sb.auth.signOut();
    throw new Error("No profile found for this account.");
  }
  if (expectRole && profile.role !== expectRole) {
    await sb.auth.signOut();
    throw new Error(`This login is not a ${expectRole} account.`);
  }
  return profile;
}

export async function signOut(): Promise<void> {
  await getSupabaseBrowser().auth.signOut();
}

/**
 * Current authenticated user (profile), reacting to auth-state changes.
 * `ready` flips true once the initial session check resolves.
 */
export function useSupabaseUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    let active = true;

    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ? await loadProfile(data.session.user.id) : null;
      if (active) {
        setUser(u);
        setReady(true);
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ? await loadProfile(session.user.id) : null;
      if (active) setUser(u);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}
