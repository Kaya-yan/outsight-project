import type { Client, QueryResult } from "./base";
import { typedInsert, typedUpdate } from "./base";
import type { CodingNode } from "@/types/database";

export async function getNodeById(client: Client, id: string): Promise<QueryResult<CodingNode>> {
  const { data, error } = await client.from("coding_nodes").select("*").eq("id", id).single();
  return { data, error };
}

export async function listNodesByFramework(client: Client, frameworkId: string) {
  const { data, error } = await client
    .from("coding_nodes")
    .select("*")
    .eq("framework_id", frameworkId)
    .order("lft", { ascending: true });
  return { data, error };
}

export async function createNode(
  client: Client,
  input: {
    framework_id: string;
    parent_id?: string | null;
    code: string;
    label: string;
    label_zh?: string;
    description?: string;
    level?: number;
    sort_order?: number;
  },
): Promise<QueryResult<CodingNode>> {
  const { data, error } = await typedInsert(client, "coding_nodes", input).select().single();
  return { data, error };
}

export async function updateNode(
  client: Client,
  id: string,
  input: Partial<CodingNode>,
): Promise<QueryResult<CodingNode>> {
  const { data, error } = await typedUpdate(client, "coding_nodes", input).eq("id", id).select().single();
  return { data, error };
}

export async function deleteNode(client: Client, id: string): Promise<QueryResult<null>> {
  const { data, error } = await client.from("coding_nodes").delete().eq("id", id);
  return { data, error };
}
