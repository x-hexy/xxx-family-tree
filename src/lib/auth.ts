import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthError = { message: string };

export type AuthResult = {
  user: User | null;
  error: AuthError | null;
};

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { user: null, error: { message: "Supabase 未配置" } };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return {
    user: data.user,
    error: error ? { message: error.message } : null,
  };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { user: null, error: { message: "Supabase 未配置" } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    user: data.user,
    error: error ? { message: error.message } : null,
  };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
