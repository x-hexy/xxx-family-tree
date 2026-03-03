// Template definitions for new-user onboarding.
// Each template builder generates fresh UUIDs so templates can be
// applied multiple times without ID collisions.

export type TemplateId =
  | "three_gen"
  | "with_siblings"
  | "four_gen"
  | "both_lineages";

export type TemplateSpec = {
  id: TemplateId;
  name: string;
  description: string;
  /** ASCII lines for the visual preview card */
  preview: string[];
};

export const TEMPLATES: TemplateSpec[] = [
  {
    id: "three_gen",
    name: "三代核心",
    description: "爷爷奶奶 → 父母 → 我，最常见的家谱起点",
    preview: [
      "┌─────────┐",
      "│ 爷爷 奶奶 │",
      "└────┬────┘",
      "     ↓",
      "┌─────────┐",
      "│ 爸爸 妈妈 │",
      "└────┬────┘",
      "     ↓",
      "  ┌─────┐",
      "  │  我  │",
      "  └─────┘",
    ],
  },
  {
    id: "with_siblings",
    name: "有兄弟姐妹",
    description: "父母加我与兄弟姐妹，同代并列",
    preview: [
      "  ┌─────────┐",
      "  │ 爸爸 妈妈 │",
      "  └──┬───┬──┘",
      "     ↓   ↓",
      "  ┌──┐  ┌──┐",
      "  │我│──│兄│",
      "  └──┘  └──┘",
    ],
  },
  {
    id: "four_gen",
    name: "四代家庭",
    description: "曾祖父母到孙辈，四代完整传承",
    preview: [
      "┌──────────┐",
      "│ 曾祖父 曾祖母 │",
      "└─────┬────┘",
      "      ↓",
      "┌─────────┐",
      "│ 爷爷 奶奶 │",
      "└────┬────┘",
      "     ↓",
      "┌─────────┐",
      "│ 爸爸 妈妈 │",
      "└────┬────┘",
      "     ↓",
      "  ┌─────┐",
      "  │  我  │",
      "  └─────┘",
    ],
  },
  {
    id: "both_lineages",
    name: "父母系并列",
    description: "爷爷奶奶和外公外婆分列两侧，全景视图",
    preview: [
      "┌────────┐  ┌────────┐",
      "│爷爷 奶奶│  │外公 外婆│",
      "└───┬────┘  └────┬───┘",
      "    └─────┬──────┘",
      "          ↓",
      "    ┌──────────┐",
      "    │ 爸爸 妈妈  │",
      "    └─────┬────┘",
      "          ↓",
      "       ┌─────┐",
      "       │  我  │",
      "       └─────┘",
    ],
  },
];

// ─── Internal types (only used by buildTemplate) ─────────────────────────────

type MemberInsert = {
  id: string;
  tree_id: string;
  name: string;
  generation: number;
};

type UnitInsert = {
  id: string;
  tree_id: string;
  name: string;
  generation: number;
};

type UnitMemberInsert = {
  unit_id: string;
  member_id: string;
  role: "single" | "partner1" | "partner2";
};

type UnitRelationInsert = {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  relation_type: "parent_child" | "sibling";
};

export type TemplateData = {
  members: MemberInsert[];
  units: UnitInsert[];
  unitMembers: UnitMemberInsert[];
  unitRelations: UnitRelationInsert[];
};

// ─── ID generator ─────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  const raw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${prefix}_${raw.slice(0, 12)}`;
}

// ─── Template builders ────────────────────────────────────────────────────────

function buildThreeGen(treeId: string): TemplateData {
  const mGrandpa = uid("m"), mGrandma = uid("m");
  const mFather  = uid("m"), mMother  = uid("m");
  const mMe      = uid("m");

  const uGp = uid("u"), uFm = uid("u"), uMe = uid("u");

  return {
    members: [
      { id: mGrandpa, tree_id: treeId, name: "爷爷", generation: 1 },
      { id: mGrandma, tree_id: treeId, name: "奶奶", generation: 1 },
      { id: mFather,  tree_id: treeId, name: "爸爸", generation: 2 },
      { id: mMother,  tree_id: treeId, name: "妈妈", generation: 2 },
      { id: mMe,      tree_id: treeId, name: "我",   generation: 3 },
    ],
    units: [
      { id: uGp, tree_id: treeId, name: "爷爷奶奶", generation: 1 },
      { id: uFm, tree_id: treeId, name: "爸爸妈妈", generation: 2 },
      { id: uMe, tree_id: treeId, name: "我",       generation: 3 },
    ],
    unitMembers: [
      { unit_id: uGp, member_id: mGrandpa, role: "partner1" },
      { unit_id: uGp, member_id: mGrandma, role: "partner2" },
      { unit_id: uFm, member_id: mFather,  role: "partner1" },
      { unit_id: uFm, member_id: mMother,  role: "partner2" },
      { unit_id: uMe, member_id: mMe,      role: "single"   },
    ],
    unitRelations: [
      { id: uid("ur"), from_unit_id: uGp, to_unit_id: uFm, relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: uFm, to_unit_id: uMe, relation_type: "parent_child" },
    ],
  };
}

function buildWithSiblings(treeId: string): TemplateData {
  const mFather  = uid("m"), mMother  = uid("m");
  const mMe      = uid("m"), mSibling = uid("m");

  const uFm = uid("u"), uMe = uid("u"), uSib = uid("u");

  // Normalise sibling relation: smaller id → larger id (matches store convention)
  const sibFrom = uMe < uSib ? uMe : uSib;
  const sibTo   = uMe < uSib ? uSib : uMe;

  return {
    members: [
      { id: mFather,  tree_id: treeId, name: "爸爸", generation: 1 },
      { id: mMother,  tree_id: treeId, name: "妈妈", generation: 1 },
      { id: mMe,      tree_id: treeId, name: "我",   generation: 2 },
      { id: mSibling, tree_id: treeId, name: "兄弟", generation: 2 },
    ],
    units: [
      { id: uFm,  tree_id: treeId, name: "爸爸妈妈", generation: 1 },
      { id: uMe,  tree_id: treeId, name: "我",       generation: 2 },
      { id: uSib, tree_id: treeId, name: "兄弟",     generation: 2 },
    ],
    unitMembers: [
      { unit_id: uFm,  member_id: mFather,  role: "partner1" },
      { unit_id: uFm,  member_id: mMother,  role: "partner2" },
      { unit_id: uMe,  member_id: mMe,      role: "single"   },
      { unit_id: uSib, member_id: mSibling, role: "single"   },
    ],
    unitRelations: [
      { id: uid("ur"), from_unit_id: uFm,     to_unit_id: uMe,    relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: uFm,     to_unit_id: uSib,   relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: sibFrom, to_unit_id: sibTo,  relation_type: "sibling"      },
    ],
  };
}

function buildFourGen(treeId: string): TemplateData {
  const mGGpa    = uid("m"), mGGma    = uid("m");
  const mGrandpa = uid("m"), mGrandma = uid("m");
  const mFather  = uid("m"), mMother  = uid("m");
  const mMe      = uid("m");

  const uGG = uid("u"), uGp = uid("u"), uFm = uid("u"), uMe = uid("u");

  return {
    members: [
      { id: mGGpa,    tree_id: treeId, name: "曾祖父", generation: 1 },
      { id: mGGma,    tree_id: treeId, name: "曾祖母", generation: 1 },
      { id: mGrandpa, tree_id: treeId, name: "爷爷",   generation: 2 },
      { id: mGrandma, tree_id: treeId, name: "奶奶",   generation: 2 },
      { id: mFather,  tree_id: treeId, name: "爸爸",   generation: 3 },
      { id: mMother,  tree_id: treeId, name: "妈妈",   generation: 3 },
      { id: mMe,      tree_id: treeId, name: "我",     generation: 4 },
    ],
    units: [
      { id: uGG, tree_id: treeId, name: "曾祖父母", generation: 1 },
      { id: uGp, tree_id: treeId, name: "爷爷奶奶", generation: 2 },
      { id: uFm, tree_id: treeId, name: "爸爸妈妈", generation: 3 },
      { id: uMe, tree_id: treeId, name: "我",       generation: 4 },
    ],
    unitMembers: [
      { unit_id: uGG, member_id: mGGpa,    role: "partner1" },
      { unit_id: uGG, member_id: mGGma,    role: "partner2" },
      { unit_id: uGp, member_id: mGrandpa, role: "partner1" },
      { unit_id: uGp, member_id: mGrandma, role: "partner2" },
      { unit_id: uFm, member_id: mFather,  role: "partner1" },
      { unit_id: uFm, member_id: mMother,  role: "partner2" },
      { unit_id: uMe, member_id: mMe,      role: "single"   },
    ],
    unitRelations: [
      { id: uid("ur"), from_unit_id: uGG, to_unit_id: uGp, relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: uGp, to_unit_id: uFm, relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: uFm, to_unit_id: uMe, relation_type: "parent_child" },
    ],
  };
}

function buildBothLineages(treeId: string): TemplateData {
  const mPatGpa = uid("m"), mPatGma = uid("m");
  const mMatGpa = uid("m"), mMatGma = uid("m");
  const mFather = uid("m"), mMother = uid("m");
  const mMe     = uid("m");

  const uPg = uid("u"), uMg = uid("u"), uFm = uid("u"), uMe = uid("u");

  return {
    members: [
      { id: mPatGpa, tree_id: treeId, name: "爷爷", generation: 1 },
      { id: mPatGma, tree_id: treeId, name: "奶奶", generation: 1 },
      { id: mMatGpa, tree_id: treeId, name: "外公", generation: 1 },
      { id: mMatGma, tree_id: treeId, name: "外婆", generation: 1 },
      { id: mFather, tree_id: treeId, name: "爸爸", generation: 2 },
      { id: mMother, tree_id: treeId, name: "妈妈", generation: 2 },
      { id: mMe,     tree_id: treeId, name: "我",   generation: 3 },
    ],
    units: [
      { id: uPg, tree_id: treeId, name: "爷爷奶奶", generation: 1 },
      { id: uMg, tree_id: treeId, name: "外公外婆", generation: 1 },
      { id: uFm, tree_id: treeId, name: "爸爸妈妈", generation: 2 },
      { id: uMe, tree_id: treeId, name: "我",       generation: 3 },
    ],
    unitMembers: [
      { unit_id: uPg, member_id: mPatGpa, role: "partner1" },
      { unit_id: uPg, member_id: mPatGma, role: "partner2" },
      { unit_id: uMg, member_id: mMatGpa, role: "partner1" },
      { unit_id: uMg, member_id: mMatGma, role: "partner2" },
      { unit_id: uFm, member_id: mFather, role: "partner1" },
      { unit_id: uFm, member_id: mMother, role: "partner2" },
      { unit_id: uMe, member_id: mMe,     role: "single"   },
    ],
    unitRelations: [
      { id: uid("ur"), from_unit_id: uPg, to_unit_id: uFm, relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: uMg, to_unit_id: uFm, relation_type: "parent_child" },
      { id: uid("ur"), from_unit_id: uFm, to_unit_id: uMe, relation_type: "parent_child" },
    ],
  };
}

const BUILDERS: Record<TemplateId, (treeId: string) => TemplateData> = {
  three_gen:      buildThreeGen,
  with_siblings:  buildWithSiblings,
  four_gen:       buildFourGen,
  both_lineages:  buildBothLineages,
};

export function buildTemplate(treeId: string, templateId: TemplateId): TemplateData {
  return BUILDERS[templateId](treeId);
}
