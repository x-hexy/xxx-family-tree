import type { Member, Relationship } from "../types/family";
import { supabase } from "./supabase";

type MemberRow = {
  id: string;
  name: string;
  title: string | null;
  birth_year: number | null;
  generation: number | null;
  bio: string | null;
  avatar_url: string | null;
};

function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? undefined,
    birthYear: row.birth_year ?? undefined,
    generation: row.generation ?? undefined,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
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
    avatar_url: member.avatarUrl ?? null,
  };
}

export async function persistMemberInsert(
  member: Member,
  treeId: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("members")
    .insert({ ...toMemberRow(member), tree_id: treeId });
  if (error) throw error;
}

export async function persistMemberUpdate(
  memberId: string,
  patch: Partial<Omit<Member, "id">>,
): Promise<void> {
  if (!supabase) return;
  const row = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.title !== undefined ? { title: patch.title ?? null } : {}),
    ...(patch.birthYear !== undefined
      ? { birth_year: patch.birthYear ?? null }
      : {}),
    ...(patch.generation !== undefined
      ? { generation: patch.generation ?? null }
      : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio ?? null } : {}),
    ...(patch.avatarUrl !== undefined
      ? { avatar_url: patch.avatarUrl ?? null }
      : {}),
  };
  const { error } = await supabase
    .from("members")
    .update(row)
    .eq("id", memberId);
  if (error) throw error;
}

export async function persistMemberDelete(memberId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function persistRelationshipInsert(
  relationship: Relationship,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("relationships").insert({
    id: relationship.id,
    from_member_id: relationship.fromMemberId,
    to_member_id: relationship.toMemberId,
    relation_type: relationship.relationType,
  });
  if (error) throw error;
}

export async function persistRelationshipDelete(
  relationshipId: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", relationshipId);
  if (error) throw error;
}

export async function persistRelationshipReconnect(
  relationshipId: string,
  fromMemberId: string,
  toMemberId: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("relationships")
    .update({ from_member_id: fromMemberId, to_member_id: toMemberId })
    .eq("id", relationshipId);
  if (error) throw error;
}

export async function uploadAvatar(
  memberId: string,
  dataUrl: string,
  treeId?: string,
): Promise<string> {
  if (!supabase || !dataUrl.startsWith("data:image/")) return dataUrl;

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const ext = blob.type.includes("png")
    ? "png"
    : blob.type.includes("webp")
      ? "webp"
      : "jpg";
  // 路径格式：{treeId}/{memberId}/{timestamp}.{ext}（供 storage policy 验证归属）
  const folder = treeId ? `${treeId}/${memberId}` : memberId;
  const path = `${folder}/${Date.now()}.${ext}`;
  const upload = await supabase.storage.from("avatars").upload(path, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType: blob.type,
  });
  if (upload.error) throw upload.error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
