import type {
  FamilyUnit,
  FamilyUnitMember,
  UnitRelation,
  UnitSnapshot
} from "../types/familyUnit";
import type { Member } from "../types/family";
import { hasSupabaseConfig, supabase } from "./supabase";

type UnitRow = {
  id: string;
  name: string;
  generation: number | null;
  layout_x: number | null;
  layout_y: number | null;
};

type UnitMemberRow = {
  unit_id: string;
  member_id: string;
  role: "single" | "partner1" | "partner2";
};

type UnitRelationRow = {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  relation_type: "parent_child" | "sibling";
};

type MemberRow = {
  id: string;
  name: string;
  title: string | null;
  birth_year: number | null;
  generation: number | null;
  bio: string | null;
  avatar_url: string | null;
};

function mapMember(row: MemberRow): Member {
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

function mapUnit(row: UnitRow): FamilyUnit {
  return {
    id: row.id,
    name: row.name,
    generation: row.generation ?? undefined,
    layoutX: row.layout_x ?? undefined,
    layoutY: row.layout_y ?? undefined
  };
}

function mapUnitMember(row: UnitMemberRow): FamilyUnitMember {
  return {
    unitId: row.unit_id,
    memberId: row.member_id,
    role: row.role
  };
}

function mapUnitRelation(row: UnitRelationRow): UnitRelation {
  return {
    id: row.id,
    fromUnitId: row.from_unit_id,
    toUnitId: row.to_unit_id,
    relationType: row.relation_type
  };
}

export async function loadUnitSnapshot(): Promise<UnitSnapshot> {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase 未配置，无法加载 V2 单元模型。");
  }

  const [membersResult, unitsResult, unitMembersResult, unitRelationsResult, shareResult] = await Promise.all([
    supabase.from("members").select("id,name,title,birth_year,generation,bio,avatar_url"),
    supabase.from("family_units").select("id,name,generation,layout_x,layout_y"),
    supabase.from("family_unit_members").select("unit_id,member_id,role"),
    supabase.from("unit_relations").select("id,from_unit_id,to_unit_id,relation_type"),
    supabase.from("share_settings").select("id,token,enabled").eq("id", 1).maybeSingle()
  ]);

  if (membersResult.error) throw membersResult.error;
  if (unitsResult.error) throw unitsResult.error;
  if (unitMembersResult.error) throw unitMembersResult.error;
  if (unitRelationsResult.error) throw unitRelationsResult.error;

  const shareToken = shareResult.data?.token ?? "";
  const shareEnabled = shareResult.data?.enabled ?? true;

  return {
    members: (membersResult.data ?? []).map((row: unknown) => mapMember(row as MemberRow)),
    units: (unitsResult.data ?? []).map((row: unknown) => mapUnit(row as UnitRow)),
    unitMembers: (unitMembersResult.data ?? []).map((row: unknown) => mapUnitMember(row as UnitMemberRow)),
    unitRelations: (unitRelationsResult.data ?? []).map((row: unknown) => mapUnitRelation(row as UnitRelationRow)),
    shareToken,
    shareEnabled
  };
}

export async function persistUnitRelationInsert(relation: UnitRelation): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("unit_relations").insert({
    id: relation.id,
    from_unit_id: relation.fromUnitId,
    to_unit_id: relation.toUnitId,
    relation_type: relation.relationType
  });
  if (error) throw error;
}

export async function persistUnitRelationDelete(relationId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("unit_relations").delete().eq("id", relationId);
  if (error) throw error;
}

export async function persistUnitRelationReconnect(
  relationId: string,
  fromUnitId: string,
  toUnitId: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("unit_relations")
    .update({
      from_unit_id: fromUnitId,
      to_unit_id: toUnitId
    })
    .eq("id", relationId);
  if (error) throw error;
}

export async function persistUnitMemberRole(memberId: string, role: "single" | "partner1" | "partner2"): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("family_unit_members").update({ role }).eq("member_id", memberId);
  if (error) throw error;
}
