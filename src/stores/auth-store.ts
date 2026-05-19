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

// System role selectors (unchanged, for system-level operations)
export const selectIsAdmin = (state: AuthState) => state.profile?.role === "admin";
export const selectCanManageAssignments = (state: AuthState) =>
  state.profile?.role === "admin" || state.profile?.role === "lead_researcher";

// Research role helpers — decoupled from system role
export type ResearchRole = "coder" | "reviewer" | "team_lead";

/** Fallback: infer research roles from system role when research_roles is empty */
function effectiveRoles(state: AuthState): string[] {
  const roles = state.profile?.research_roles ?? [];
  if (roles.length > 0) return roles;
  const sysRole = state.profile?.role;
  if (sysRole === "admin" || sysRole === "lead_researcher") return ["coder", "reviewer", "team_lead"];
  if (sysRole === "researcher" || sysRole === "coder") return ["coder"];
  return [];
}

export function hasResearchRole(state: AuthState, role: ResearchRole): boolean {
  return effectiveRoles(state).includes(role);
}

export function hasAnyResearchRole(state: AuthState, roles: ResearchRole[]): boolean {
  const eff = effectiveRoles(state);
  return roles.some((r) => eff.includes(r));
}

export const selectIsTeamLead = (state: AuthState) => hasResearchRole(state, "team_lead");
export const selectIsReviewer = (state: AuthState) => hasResearchRole(state, "reviewer");
export const selectIsCoder = (state: AuthState) => hasResearchRole(state, "coder");
export const selectCanCreateTasks = (state: AuthState) => hasResearchRole(state, "team_lead");
export const selectCanReview = (state: AuthState) =>
  hasResearchRole(state, "reviewer") || hasResearchRole(state, "team_lead");
export const selectCanManageTasks = (state: AuthState) => hasResearchRole(state, "team_lead");
