import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../lib/auth";
import { supabase } from "../lib/supabase";

export type AuthGuardState =
  | { status: "loading" }
  | { status: "authenticated"; userId: string }
  | { status: "unauthenticated" };

export function useAuthGuard(): AuthGuardState {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthGuardState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    // Initial session check
    void getSession().then((session) => {
      if (!mounted) return;
      if (!session) {
        setState({ status: "unauthenticated" });
        void navigate("/login", { replace: true });
      } else {
        setState({ status: "authenticated", userId: session.user.id });
      }
    });

    // Subscribe to auth state changes (handles token expiry, sign-out, etc.)
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session) {
        setState({ status: "unauthenticated" });
        void navigate("/login", { replace: true });
      } else if (event === "SIGNED_IN" && session) {
        setState({ status: "authenticated", userId: session.user.id });
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return state;
}
