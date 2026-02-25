import { supabase } from "./supabase";

export type Tree = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
};

export type ShareSettings = {
  treeId: string;
  token: string;
  enabled: boolean;
};

function generateTreeId(): string {
  const raw = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2);
  return `tree_${raw.slice(0, 20)}`;
}

function generateShareToken(): string {
  const raw = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2);
  return raw.slice(0, 16);
}

export async function getTreeByOwner(ownerId: string): Promise<Tree | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("trees")
    .select("id,owner_id,name,created_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    ownerId: data.owner_id as string,
    name: data.name as string,
    createdAt: data.created_at as string,
  };
}

export async function createTree(ownerId: string): Promise<Tree> {
  if (!supabase) throw new Error("Supabase 未配置");
  const id = generateTreeId();
  const { data, error } = await supabase
    .from("trees")
    .insert({ id, owner_id: ownerId, name: "我的家谱" })
    .select("id,owner_id,name,created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id as string,
    ownerId: data.owner_id as string,
    name: data.name as string,
    createdAt: data.created_at as string,
  };
}

export async function getOrCreateTree(ownerId: string): Promise<Tree> {
  const existing = await getTreeByOwner(ownerId);
  if (existing) return existing;
  return createTree(ownerId);
}

export async function getShareSettings(treeId: string): Promise<ShareSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("share_settings")
    .select("tree_id,token,enabled")
    .eq("tree_id", treeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    treeId: data.tree_id as string,
    token: data.token as string,
    enabled: data.enabled as boolean,
  };
}

export async function getOrCreateShareSettings(treeId: string): Promise<ShareSettings> {
  const existing = await getShareSettings(treeId);
  if (existing) return existing;
  if (!supabase) throw new Error("Supabase 未配置");
  const token = generateShareToken();
  const { data, error } = await supabase
    .from("share_settings")
    .insert({ tree_id: treeId, token, enabled: true })
    .select("tree_id,token,enabled")
    .single();
  if (error) throw error;
  return {
    treeId: data.tree_id as string,
    token: data.token as string,
    enabled: data.enabled as boolean,
  };
}

export async function updateShareSettings(
  treeId: string,
  patch: { token?: string; enabled?: boolean }
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("share_settings")
    .update(patch)
    .eq("tree_id", treeId);
  if (error) throw error;
}

export async function getTreeByToken(
  token: string
): Promise<{ treeId: string; enabled: boolean } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_tree_by_token", { p_token: token });
  if (error) throw error;
  const row = (data as Array<{ tree_id: string; enabled: boolean }>)?.[0];
  if (!row) return null;
  return { treeId: row.tree_id, enabled: row.enabled };
}
