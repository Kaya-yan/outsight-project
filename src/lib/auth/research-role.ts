import type { Profile } from "@/types/database";

export type ResearchRole = "coder" | "reviewer" | "team_lead";

/** Fallback: infer research roles from system role when research_roles is empty */
function effectiveRoles(profile: Profile): string[] {
  const roles = profile.research_roles ?? [];
  if (roles.length > 0) return roles;

  // Fallback for profiles created before research_roles migration
  const sysRole = profile.role;
  if (sysRole === "admin" || sysRole === "lead_researcher") return ["coder", "reviewer", "team_lead"];
  if (sysRole === "researcher" || sysRole === "coder") return ["coder"];
  return [];
}

export function hasResearchRole(profile: Profile, role: ResearchRole): boolean {
  return effectiveRoles(profile).includes(role);
}

export function hasAnyResearchRole(profile: Profile, roles: ResearchRole[]): boolean {
  const eff = effectiveRoles(profile);
  return roles.some((r) => eff.includes(r));
}

export function canManageTasks(profile: Profile): boolean {
  return hasResearchRole(profile, "team_lead");
}

export function canReview(profile: Profile): boolean {
  return hasResearchRole(profile, "reviewer") || hasResearchRole(profile, "team_lead");
}

export function canCode(profile: Profile): boolean {
  return hasResearchRole(profile, "coder") || hasResearchRole(profile, "team_lead");
}
