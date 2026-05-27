import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { LiteratureNote, LiteratureComment } from "@/types/database";

// ── Literature Notes ──

export interface LitListFilters {
  search?: string;
  tag?: string;
  forReview?: boolean;
  sort?: "rating" | "created_at" | "read_count";
  sortDir?: "asc" | "desc";
}

export async function listLiterature(
  client: Client,
  opts?: LitListFilters & PaginationParams,
) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("literature_notes").select("*, profiles:created_by(username, display_name)", { count: "exact" });

  if (opts?.search) {
    const like = `%${opts.search}%`;
    query = query.or(`title.ilike.${like},author.ilike.${like},abstract.ilike.${like},summary.ilike.${like}`);
  }
  if (opts?.forReview !== undefined) {
    query = query.eq("for_review", opts.forReview);
  }
  if (opts?.tag) {
    query = query.contains("tags", [opts.tag]);
  }

  const sort = opts?.sort ?? "created_at";
  const dir = opts?.sortDir ?? "desc";
  query = query.order(sort, { ascending: dir === "asc" });

  const { data, error, count } = await query.range(from, to);
  return { data, error, count };
}

export async function getLitById(client: Client, id: string): Promise<QueryResult<LiteratureNote>> {
  const { data, error } = await client.from("literature_notes").select("*").eq("id", id).single();
  return { data, error };
}

export async function createLit(
  client: Client,
  input: {
    title: string;
    author?: string | null;
    publish_date?: string | null;
    journal?: string | null;
    url?: string | null;
    summary?: string | null;
    abstract?: string | null;
    key_points?: string[];
    research_method?: string | null;
    reader_name?: string | null;
    inspiration?: string | null;
    notes?: string | null;
    for_review?: boolean;
    rating?: number | null;
    tags?: string[];
    attachment_path?: string | null;
    attachment_name?: string | null;
    created_by: string;
  },
): Promise<QueryResult<LiteratureNote>> {
  const { data, error } = await typedInsert(client, "literature_notes", input).select().single();
  return { data, error };
}

export async function updateLit(
  client: Client,
  id: string,
  input: Partial<LiteratureNote>,
): Promise<QueryResult<LiteratureNote>> {
  const { data, error } = await typedUpdate(client, "literature_notes", input).eq("id", id).select().single();
  return { data, error };
}

export async function deleteLit(client: Client, id: string): Promise<QueryResult<null>> {
  const { data, error } = await client.from("literature_notes").delete().eq("id", id);
  return { data, error };
}

// ── Comments ──

export async function listComments(client: Client, noteId: string) {
  const { data, error } = await client
    .from("literature_comments")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function createComment(
  client: Client,
  input: { note_id: string; author_id: string; content: string; parent_id?: string | null },
): Promise<QueryResult<LiteratureComment>> {
  const { data, error } = await typedInsert(client, "literature_comments", input).select().single();
  return { data, error };
}

export async function deleteComment(client: Client, id: string): Promise<QueryResult<null>> {
  const { data, error } = await client.from("literature_comments").delete().eq("id", id);
  return { data, error };
}

// ── Reactions ──

export async function listReactions(client: Client, noteId: string, userId: string) {
  const { data, error } = await client
    .from("literature_reactions")
    .select("*")
    .eq("note_id", noteId)
    .eq("user_id", userId);
  return { data, error };
}

export async function toggleReaction(
  client: Client,
  noteId: string,
  userId: string,
  reactionType: "read" | "like",
): Promise<{ added: boolean }> {
  // Check if already exists
  const { data: existing } = await client
    .from("literature_reactions")
    .select("id")
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .single();

  if (existing) {
    // Remove reaction
    await client.from("literature_reactions").delete().eq("id", existing.id);
    // Update count
    const field = reactionType === "read" ? "read_count" : "like_count";
    const { data: note } = await getLitById(client, noteId);
    if (note) {
      const newCount = Math.max(0, (note[field] ?? 0) - 1);
      await typedUpdate(client, "literature_notes", { [field]: newCount } as never).eq("id", noteId);
    }
    return { added: false };
  } else {
    // Add reaction
    await typedInsert(client, "literature_reactions", {
      note_id: noteId,
      user_id: userId,
      reaction_type: reactionType,
    });
    // Update count
    const field = reactionType === "read" ? "read_count" : "like_count";
    const { data: note } = await getLitById(client, noteId);
    if (note) {
      const newCount = (note[field] ?? 0) + 1;
      await typedUpdate(client, "literature_notes", { [field]: newCount } as never).eq("id", noteId);
    }
    return { added: true };
  }
}

// ── Stats ──

export interface LitStats {
  total: number;
  forReview: number;
  byTag: Record<string, number>;
  byContributor: Record<string, number>;
  byRating: Record<string, number>;
  avgRating: number;
}

export async function getLitStats(client: Client): Promise<LitStats> {
  const { data: all } = await client.from("literature_notes").select("tags, rating, for_review, created_by");

  const notes = all ?? [];
  const stats: LitStats = {
    total: notes.length,
    forReview: notes.filter((n) => n.for_review).length,
    byTag: {},
    byContributor: {},
    byRating: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    avgRating: 0,
  };

  let ratingSum = 0;
  let ratingCount = 0;

  for (const n of notes) {
    // Tags
    for (const tag of (n.tags ?? [])) {
      stats.byTag[tag] = (stats.byTag[tag] ?? 0) + 1;
    }
    // Contributors — need to look up username
    const cid = n.created_by as string;
    stats.byContributor[cid] = (stats.byContributor[cid] ?? 0) + 1;
    // Ratings
    if (n.rating) {
      stats.byRating[String(n.rating)] = (stats.byRating[String(n.rating)] ?? 0) + 1;
      ratingSum += n.rating;
      ratingCount++;
    }
  }

  stats.avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

  // Resolve contributor IDs to usernames
  const cids = Object.keys(stats.byContributor);
  if (cids.length > 0) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, username, display_name")
      .in("id", cids);
    const resolved: Record<string, number> = {};
    for (const cid of cids) {
      const p = (profiles ?? []).find((pr) => pr.id === cid);
      const label = p?.display_name || p?.username || cid.slice(0, 8);
      resolved[label] = stats.byContributor[cid];
    }
    stats.byContributor = resolved;
  }

  return stats;
}

// ── Export ──

export async function listForReview(client: Client) {
  const { data, error } = await client
    .from("literature_notes")
    .select("*")
    .eq("for_review", true)
    .order("rating", { ascending: false });
  return { data, error };
}
