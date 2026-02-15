import type { Member } from "./family";

export type UnitMemberRole = "single" | "partner1" | "partner2";

export type FamilyUnit = {
  id: string;
  name: string;
  generation?: number;
  layoutX?: number;
  layoutY?: number;
};

export type FamilyUnitMember = {
  unitId: string;
  memberId: string;
  role: UnitMemberRole;
};

export type UnitRelationType = "parent_child" | "sibling";

export type UnitRelation = {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  relationType: UnitRelationType;
};

export type UnitSnapshot = {
  members: Member[];
  units: FamilyUnit[];
  unitMembers: FamilyUnitMember[];
  unitRelations: UnitRelation[];
  shareToken: string;
  shareEnabled: boolean;
};

