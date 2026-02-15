import { members as mockMembers, relationships as mockRelationships } from "../data/mockFamily";
import type { Member, RelationType, Relationship } from "../types/family";
import { hasSupabaseConfig, supabase } from "./supabase";

type MemberRow = {
  id: string;
  name: string;
  title: string | null;
  birth_year: number | null;
  generation: number | null;
  bio: string | null;
  avatar_url: string | null;
};

type RelationshipRow = {
  id: string;
  from_member_id: string;
  to_member_id: string;
  relation_type: RelationType;
};

export type PersistedSnapshot = {
  members: Member[];
  relationships: Relationship[];
  shareToken: string;
  shareEnabled: boolean;
  source: "supabase" | "local";
};

const localShareKey = "xy-family-tree-share-config";

function generateToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}

function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? undefined,
    birthYear: row.birth_year ?? undefined,
    generation: row.generation ?? undefined,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined
  };
}

function mapRelationshipRow(row: RelationshipRow): Relationship {
  return {
    id: row.id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    relationType: row.relation_type
  };
}

function toMemberRow(member: Member): MemberRow {
  return {
    id: member.id,
    name: member.name,
    title: member.title ?? null,
    birth_year: member.birthYear ?? null,
    generation: member.generation ?? null,
    bio: member.bio ?? null,
    avatar_url: member.avatarUrl ?? null
  };
}

function loadLocalShare(): { shareToken: string; shareEnabled: boolean } {
  const fallback = { shareToken: generateToken(), shareEnabled: true };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(localShareKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { token?: string; enabled?: boolean };
    if (!parsed.token || typeof parsed.enabled !== "boolean") return fallback;
    return { shareToken: parsed.token, shareEnabled: parsed.enabled };
  } catch {
    return fallback;
  }
}

function saveLocalShare(token: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localShareKey, JSON.stringify({ token, enabled }));
}

export async function loadSnapshot(): Promise<PersistedSnapshot> {
  if (!hasSupabaseConfig || !supabase) {
    const share = loadLocalShare();
    return {
      members: mockMembers,
      relationships: mockRelationships,
      shareToken: share.shareToken,
      shareEnabled: share.shareEnabled,
      source: "local"
    };
  }

  const [membersResult, relationshipsResult, shareResult] = await Promise.all([
    supabase.from("members").select("id,name,title,birth_year,generation,bio,avatar_url"),
    supabase.from("relationships").select("id,from_member_id,to_member_id,relation_type"),
    supabase.from("share_settings").select("id,token,enabled").eq("id", 1).maybeSingle()
  ]);

  if (membersResult.error) throw membersResult.error;
  if (relationshipsResult.error) throw relationshipsResult.error;
  if (shareResult.error) throw shareResult.error;

  let shareToken = shareResult.data?.token ?? generateToken();
  let shareEnabled = shareResult.data?.enabled ?? true;
  if (!shareResult.data) {
    const upsert = await supabase.from("share_settings").upsert({ id: 1, token: shareToken, enabled: shareEnabled });
    if (upsert.error) throw upsert.error;
  }

  saveLocalShare(shareToken, shareEnabled);

  return {
    members: (membersResult.data ?? []).map((row: unknown) => mapMemberRow(row as MemberRow)),
    relationships: (relationshipsResult.data ?? []).map((row: unknown) =>
      mapRelationshipRow(row as RelationshipRow)
    ),
    shareToken,
    shareEnabled,
    source: "supabase"
  };
}

export async function persistMemberInsert(member: Member): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("members").insert(toMemberRow(member));
  if (error) throw error;
}

export async function persistMemberUpdate(memberId: string, patch: Partial<Omit<Member, "id">>): Promise<void> {
  if (!supabase) return;
  const row = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.title !== undefined ? { title: patch.title ?? null } : {}),
    ...(patch.birthYear !== undefined ? { birth_year: patch.birthYear ?? null } : {}),
    ...(patch.generation !== undefined ? { generation: patch.generation ?? null } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio ?? null } : {}),
    ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl ?? null } : {})
  };
  const { error } = await supabase.from("members").update(row).eq("id", memberId);
  if (error) throw error;
}

export async function persistMemberDelete(memberId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function persistRelationshipInsert(relationship: Relationship): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("relationships").insert({
    id: relationship.id,
    from_member_id: relationship.fromMemberId,
    to_member_id: relationship.toMemberId,
    relation_type: relationship.relationType
  });
  if (error) throw error;
}

export async function persistRelationshipDelete(relationshipId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("relationships").delete().eq("id", relationshipId);
  if (error) throw error;
}

export async function persistRelationshipReconnect(
  relationshipId: string,
  fromMemberId: string,
  toMemberId: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("relationships")
    .update({ from_member_id: fromMemberId, to_member_id: toMemberId })
    .eq("id", relationshipId);
  if (error) throw error;
}

export async function persistShareSettings(token: string, enabled: boolean): Promise<void> {
  if (!supabase) {
    saveLocalShare(token, enabled);
    return;
  }
  const { error } = await supabase.from("share_settings").upsert({ id: 1, token, enabled });
  if (error) throw error;
  saveLocalShare(token, enabled);
}

export async function uploadAvatar(memberId: string, dataUrl: string): Promise<string> {
  if (!supabase || !dataUrl.startsWith("data:image/")) return dataUrl;

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const path = `${memberId}/${Date.now()}.${ext}`;
  const upload = await supabase.storage.from("avatars").upload(path, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType: blob.type
  });
  if (upload.error) throw upload.error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
