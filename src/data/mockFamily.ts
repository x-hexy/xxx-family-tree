import type { Member, Relationship } from "../types/family";

export const members: Member[] = [
  { id: "m1", name: "曾祖父", title: "家族长辈", generation: 1, birthYear: 1930 },
  { id: "m2", name: "曾祖母", generation: 1, birthYear: 1933 },
  { id: "m3", name: "祖父", generation: 2, birthYear: 1952 },
  { id: "m4", name: "祖母", generation: 2, birthYear: 1955 },
  { id: "m5", name: "父亲", generation: 3, birthYear: 1978, bio: "现居国内" },
  { id: "m6", name: "母亲", generation: 3, birthYear: 1980 },
  { id: "m7", name: "我", generation: 4, birthYear: 2005, bio: "海外求学" },
  { id: "m8", name: "妹妹", generation: 4, birthYear: 2008 }
];

export const relationships: Relationship[] = [
  { id: "r1", fromMemberId: "m1", toMemberId: "m3", relationType: "parent" },
  { id: "r2", fromMemberId: "m2", toMemberId: "m3", relationType: "parent" },
  { id: "r3", fromMemberId: "m3", toMemberId: "m5", relationType: "parent" },
  { id: "r4", fromMemberId: "m4", toMemberId: "m5", relationType: "parent" },
  { id: "r5", fromMemberId: "m5", toMemberId: "m7", relationType: "parent" },
  { id: "r6", fromMemberId: "m6", toMemberId: "m7", relationType: "parent" },
  { id: "r7", fromMemberId: "m5", toMemberId: "m8", relationType: "parent" },
  { id: "r8", fromMemberId: "m6", toMemberId: "m8", relationType: "parent" }
];

