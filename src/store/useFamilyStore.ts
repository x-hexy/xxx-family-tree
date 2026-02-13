import { create } from "zustand";
import { members, relationships } from "../data/mockFamily";
import type { Member, RelationType, Relationship } from "../types/family";

type MemberInput = Omit<Member, "id">;
type PanelMode = "view" | "create" | "create_relationship" | "delete_relationship";
const SHARE_STORAGE_KEY = "xy-family-tree-share-config";

type ShareConfig = {
  token: string;
  enabled: boolean;
};

type FamilyState = {
  members: Member[];
  relationships: Relationship[];
  selectedMemberId: string | null;
  panelMode: PanelMode;
  shareToken: string;
  shareEnabled: boolean;
  setSelectedMemberId: (id: string | null) => void;
  startCreateMember: () => void;
  cancelCreateMember: () => void;
  startCreateRelationship: () => void;
  startDeleteRelationship: () => void;
  cancelRelationshipMode: () => void;
  addMember: (input: MemberInput) => string;
  updateMember: (memberId: string, patch: Partial<Omit<Member, "id">>) => void;
  deleteMember: (memberId: string) => void;
  addRelationship: (input: {
    fromMemberId: string;
    toMemberId: string;
    relationType: RelationType;
  }) => { ok: true } | { ok: false; reason: string };
  deleteRelationship: (relationshipId: string) => void;
  findAndSelectMemberByName: (keyword: string) => { ok: true } | { ok: false; reason: string };
  setShareEnabled: (enabled: boolean) => void;
  refreshShareToken: () => string;
  isValidShareAccess: (token?: string | null) => boolean;
  updateMemberAvatar: (memberId: string, avatarUrl: string) => void;
};

function relationKey(fromMemberId: string, toMemberId: string, relationType: RelationType): string {
  if (relationType === "spouse" || relationType === "sibling") {
    const [a, b] = [fromMemberId, toMemberId].sort();
    return `${relationType}:${a}:${b}`;
  }
  return `${relationType}:${fromMemberId}:${toMemberId}`;
}

function generateShareToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}

function loadShareConfig(): ShareConfig {
  const defaultConfig = { token: generateShareToken(), enabled: true };
  if (typeof window === "undefined") return defaultConfig;
  try {
    const raw = window.localStorage.getItem(SHARE_STORAGE_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw) as Partial<ShareConfig>;
    if (!parsed.token || typeof parsed.enabled !== "boolean") return defaultConfig;
    return { token: parsed.token, enabled: parsed.enabled };
  } catch {
    return defaultConfig;
  }
}

function saveShareConfig(config: ShareConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(config));
}

const initialShareConfig = loadShareConfig();

export const useFamilyStore = create<FamilyState>((set, get) => ({
  members,
  relationships,
  selectedMemberId: null,
  panelMode: "view",
  shareToken: initialShareConfig.token,
  shareEnabled: initialShareConfig.enabled,
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
  startCreateMember: () => set({ panelMode: "create", selectedMemberId: null }),
  cancelCreateMember: () => set({ panelMode: "view" }),
  startCreateRelationship: () => set({ panelMode: "create_relationship" }),
  startDeleteRelationship: () => set({ panelMode: "delete_relationship" }),
  cancelRelationshipMode: () => set({ panelMode: "view" }),
  addMember: (input) => {
    const newId = `m${Date.now()}`;
    set((state) => ({
      members: [...state.members, { id: newId, ...input }],
      selectedMemberId: newId,
      panelMode: "view"
    }));
    return newId;
  },
  updateMember: (memberId, patch) =>
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId ? { ...member, ...patch } : member
      )
    })),
  deleteMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((member) => member.id !== memberId),
      relationships: state.relationships.filter(
        (relation) => relation.fromMemberId !== memberId && relation.toMemberId !== memberId
      ),
      selectedMemberId: state.selectedMemberId === memberId ? null : state.selectedMemberId,
      panelMode: "view"
    })),
  addRelationship: ({ fromMemberId, toMemberId, relationType }) => {
    if (fromMemberId === toMemberId) {
      return { ok: false, reason: "不能给同一成员建立关系。" };
    }

    let isDuplicated = false;
    set((state) => {
      const existing = new Set(
        state.relationships.map((relation) =>
          relationKey(relation.fromMemberId, relation.toMemberId, relation.relationType)
        )
      );
      const nextKey = relationKey(fromMemberId, toMemberId, relationType);
      if (existing.has(nextKey)) {
        isDuplicated = true;
        return state;
      }
      return {
        ...state,
        relationships: [
          ...state.relationships,
          { id: `r${Date.now()}`, fromMemberId, toMemberId, relationType }
        ],
        panelMode: "view"
      };
    });

    if (isDuplicated) {
      return { ok: false, reason: "该关系已存在，请勿重复添加。" };
    }
    return { ok: true };
  },
  deleteRelationship: (relationshipId) =>
    set((state) => ({
      relationships: state.relationships.filter((relation) => relation.id !== relationshipId),
      panelMode: "view"
    })),
  findAndSelectMemberByName: (keyword) => {
    const query = keyword.trim();
    if (!query) return { ok: false, reason: "请输入姓名。" };

    let foundId: string | null = null;
    set((state) => {
      const exact = state.members.find((member) => member.name === query);
      const partial = state.members.find((member) => member.name.includes(query));
      const target = exact ?? partial ?? null;
      if (!target) return state;
      foundId = target.id;
      return {
        ...state,
        selectedMemberId: target.id,
        panelMode: "view"
      };
    });

    if (!foundId) return { ok: false, reason: "未找到对应成员。" };
    return { ok: true };
  },
  setShareEnabled: (enabled) =>
    set((state) => {
      const next = { token: state.shareToken, enabled };
      saveShareConfig(next);
      return { shareEnabled: enabled };
    }),
  refreshShareToken: () => {
    const token = generateShareToken();
    set((state) => {
      const next = { token, enabled: state.shareEnabled };
      saveShareConfig(next);
      return { shareToken: token };
    });
    return token;
  },
  isValidShareAccess: (token) => !!token && get().shareEnabled && token === get().shareToken,
  updateMemberAvatar: (memberId, avatarUrl) =>
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId ? { ...member, avatarUrl } : member
      )
    }))
}));
