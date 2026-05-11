import type { Client, QueryResult } from "./base";
import { typedUpdate } from "./base";
import type { Profile } from "@/types/database";

export async function getProfileById(client: Client, id: string): Promise<QueryResult<Profile>> {
  const { data, error } = await client.from("profiles").select("*").eq("id", id).single();
  return { data, error };
}

export async function getProfileByEmail(client: Client, email: string): Promise<QueryResult<Profile>> {
  const { data, error } = await client.from("profiles").select("*").eq("email", email).single();
  return { data, error };
}

export async function getProfileByUsername(client: Client, username: string): Promise<QueryResult<Profile>> {
  const { data, error } = await client.from("profiles").select("*").eq("username", username).single();
  return { data, error };
}

export async function listProfiles(client: Client, opts?: { role?: string }) {
  let query = client.from("profiles").select("*");
  if (opts?.role) query = query.eq("role", opts.role);
  const { data, error } = await query;
  return { data, error };
}

export async function updateProfile(
  client: Client,
  id: string,
  input: Partial<Profile>,
): Promise<QueryResult<Profile>> {
  const { data, error } = await typedUpdate(client, "profiles", input).eq("id", id).select().single();
  return { data, error };
}
