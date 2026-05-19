import type { Profile } from "@/types/database";

export type ResearchRole = "coder" | "reviewer" | "team_lead";

export function hasResearchRole(profile: Profile, role: ResearchRole): boolean {
  return profile.research_roles?.includes(role) ?? false;
}

export function hasAnyResearchRole(profile: Profile, roles: ResearchRole[]): boolean {
  return roles.some((r) => hasResearchRole(profile, r));
}

/** Can create tasks, assign coders, view all tasks */
export function canManageTasks(profile: Profile): boolean {
  return hasResearchRole(profile, "team_lead");
}

/** Can review and finalize completed tasks */
export function canReview(profile: Profile): boolean {
  return hasResearchRole(profile, "reviewer") || hasResearchRole(profile, "team_lead");
}

/** Can code assigned tasks */
export function canCode(profile: Profile): boolean {
  return hasResearchRole(profile, "coder") || hasResearchRole(profile, "team_lead");
}
