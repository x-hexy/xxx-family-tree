export type Member = {
  id: string;
  name: string;
  title?: string;
  birthYear?: number;
  generation?: number;
  bio?: string;
  avatarUrl?: string;
};

export type RelationType = "parent" | "child" | "spouse" | "sibling";

export type Relationship = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  relationType: RelationType;
};

