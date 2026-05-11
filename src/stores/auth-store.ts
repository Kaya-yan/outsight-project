import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;

  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),

  hydrate: async () => {
    const supabase = createClient();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        set({ user: session.user, session });

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        set({ profile, isLoading: false });
      } else {
        set({ user: null, profile: null, session: null, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }

    // Subscribe to auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        set({ user: session.user, session });
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => set({ profile: data }));
      } else if (event === "SIGNED_OUT") {
        set({ user: null, profile: null, session: null });
      }
    });
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profile) set({ profile });
  },
}));

// Selectors
export const selectIsAdmin = (state: AuthState) => state.profile?.role === "admin";
export const selectCanManageAssignments = (state: AuthState) =>
  state.profile?.role === "admin" || state.profile?.role === "lead_researcher";
