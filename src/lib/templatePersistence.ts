import { supabase } from "./supabase";
import { buildTemplate } from "../data/templates";
import type { TemplateId } from "../data/templates";

/**
 * Batch-insert a template's members, units, unit_members, and unit_relations
 * into Supabase for the given tree.  Inserts run sequentially to respect FK
 * order (members → family_units → family_unit_members → unit_relations).
 */
export async function applyTemplate(
  treeId: string,
  templateId: TemplateId,
): Promise<void> {
  if (!supabase) throw new Error("Supabase 未配置");

  const data = buildTemplate(treeId, templateId);

  const r1 = await supabase.from("members").insert(data.members);
  if (r1.error) throw r1.error;

  const r2 = await supabase.from("family_units").insert(data.units);
  if (r2.error) throw r2.error;

  const r3 = await supabase.from("family_unit_members").insert(data.unitMembers);
  if (r3.error) throw r3.error;

  const r4 = await supabase.from("unit_relations").insert(data.unitRelations);
  if (r4.error) throw r4.error;
}
