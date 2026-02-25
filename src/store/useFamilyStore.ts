import { create } from "zustand";
import type { Member, RelationType, Relationship } from "../types/family";
import {
  persistMemberDelete,
  persistMemberInsert,
  persistMemberUpdate,
  persistRelationshipDelete,
  persistRelationshipInsert,
  persistRelationshipReconnect,
  uploadAvatar,
} from "../lib/familyPersistence";
import { loadUnitSnapshot } from "../lib/familyUnitPersistence";
import {
  getOrCreateShareSettings,
  updateShareSettings,
} from "../lib/treePersistence";
import type {
  FamilyUnit,
  FamilyUnitMember,
  UnitRelation,
} from "../types/familyUnit";
import {
  persistUnitRelationDelete,
  persistUnitRelationInsert,
  persistUnitRelationReconnect,
  persistUnitMemberRole,
} from "../lib/familyUnitPersistence";

type MemberInput = Omit<Member, "id">;
type PanelMode =
  | "view"
  | "create"
  | "create_relationship"
  | "delete_relationship";
type ViewMode = "focus" | "paternal" | "maternal" | "overview";
const nodePositionsStorageKey = "xy-family-tree-node-positions";
type NodePosition = { x: number; y: number };

type FamilyState = {
  treeId: string | null;
  members: Member[];
  relationships: Relationship[];
  units: FamilyUnit[];
  unitMembers: FamilyUnitMember[];
  unitRelations: UnitRelation[];
  selectedMemberId: string | null;
  selectedUnitId: string | null;
  panelMode: PanelMode;
  shareToken: string;
  shareEnabled: boolean;
  viewMode: ViewMode;
  focusMemberId: string | null;
  focusUnitId: string | null;
  showParentChildLines: boolean;
  showSpouseLines: boolean;
  showSiblingLines: boolean;
  filterGenerations: Set<number> | null;
  nodePositions: Record<string, NodePosition>;
  layoutRequestVersion: number;
  isHydrated: boolean;
  hydrationSource: "supabase" | "local" | null;
  syncError: string | null;
  initializeData: (treeId: string) => Promise<void>;
  setSelectedMemberId: (id: string | null) => void;
  setSelectedUnitId: (id: string | null) => void;
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
  reconnectRelationship: (input: {
    relationshipId: string;
    fromMemberId: string;
    toMemberId: string;
  }) => { ok: true } | { ok: false; reason: string };
  deleteRelationship: (relationshipId: string) => void;
  addUnitRelation: (input: {
    fromUnitId: string;
    toUnitId: string;
    relationType: "parent_child" | "sibling";
  }) => { ok: true } | { ok: false; reason: string };
  reconnectUnitRelation: (input: {
    relationId: string;
    fromUnitId: string;
    toUnitId: string;
  }) => { ok: true } | { ok: false; reason: string };
  deleteUnitRelation: (relationId: string) => void;
  swapUnitPartners: (unitId: string) => void;
  findAndSelectMemberByName: (
    keyword: string,
  ) => { ok: true } | { ok: false; reason: string };
  setShareEnabled: (enabled: boolean) => void;
  refreshShareToken: () => string;
  isValidShareAccess: (token?: string | null) => boolean;
  setViewMode: (mode: ViewMode) => void;
  setFocusMemberId: (memberId: string | null) => void;
  setFocusUnitId: (unitId: string | null) => void;
  setLineVisibility: (patch: {
    showParentChildLines?: boolean;
    showSpouseLines?: boolean;
    showSiblingLines?: boolean;
  }) => void;
  setFilterGenerations: (gens: Set<number> | null) => void;
  setNodePosition: (memberId: string, position: NodePosition) => void;
  setNodePositions: (positions: Record<string, NodePosition>) => void;
  triggerAutoArrange: () => void;
  updateMemberAvatar: (memberId: string, avatarUrl: string) => void;
};

function relationKey(
  fromMemberId: string,
  toMemberId: string,
  relationType: RelationType,
): string {
  if (relationType === "spouse" || relationType === "sibling") {
    const [a, b] = [fromMemberId, toMemberId].sort();
    return `${relationType}:${a}:${b}`;
  }
  return `${relationType}:${fromMemberId}:${toMemberId}`;
}

function generateShareToken(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}

function generateUnitRelationId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `ur_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  }
  return `ur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadNodePositions(): Record<string, NodePosition> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(nodePositionsStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, NodePosition>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function saveNodePositions(positions: Record<string, NodePosition>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    nodePositionsStorageKey,
    JSON.stringify(positions),
  );
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  treeId: null,
  members: [],
  relationships: [],
  units: [],
  unitMembers: [],
  unitRelations: [],
  selectedMemberId: null,
  selectedUnitId: null,
  panelMode: "view",
  shareToken: generateShareToken(),
  shareEnabled: true,
  viewMode: "focus",
  focusMemberId: null,
  focusUnitId: null,
  showParentChildLines: true,
  showSpouseLines: true,
  showSiblingLines: false,
  filterGenerations: null,
  nodePositions: loadNodePositions(),
  layoutRequestVersion: 0,
  isHydrated: false,
  hydrationSource: null,
  syncError: null,

  initializeData: async (treeId: string) => {
    set({ isHydrated: false, treeId: null, syncError: null });
    try {
      const [snapshot, shareSettings] = await Promise.all([
        loadUnitSnapshot(treeId),
        getOrCreateShareSettings(treeId).catch(() => null),
      ]);
      const focusUnitCandidate =
        snapshot.units.find((unit) => unit.name.includes("我"))?.id ??
        snapshot.units[0]?.id ??
        null;
      set({
        treeId,
        members: snapshot.members,
        relationships: [],
        units: snapshot.units,
        unitMembers: snapshot.unitMembers,
        unitRelations: snapshot.unitRelations.filter(
          (relation) =>
            !relation.id.startsWith("ur_pc_") &&
            !relation.id.startsWith("ur_sb_"),
        ),
        shareToken: shareSettings?.token ?? snapshot.shareToken,
        shareEnabled: shareSettings?.enabled ?? snapshot.shareEnabled,
        focusMemberId:
          snapshot.members.find((m) => m.name === "我")?.id ??
          snapshot.members[0]?.id ??
          null,
        focusUnitId: focusUnitCandidate,
        nodePositions: loadNodePositions(),
        isHydrated: true,
        hydrationSource: "supabase",
        syncError: null,
      });
    } catch (error) {
      set({
        isHydrated: true,
        hydrationSource: "local",
        syncError: error instanceof Error ? error.message : "加载数据失败",
      });
    }
  },

  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
  setSelectedUnitId: (id) => set({ selectedUnitId: id }),
  startCreateMember: () => set({ panelMode: "create", selectedMemberId: null }),
  cancelCreateMember: () => set({ panelMode: "view" }),
  startCreateRelationship: () => set({ panelMode: "create_relationship" }),
  startDeleteRelationship: () => set({ panelMode: "delete_relationship" }),
  cancelRelationshipMode: () => set({ panelMode: "view" }),

  addMember: (input) => {
    const treeId = get().treeId ?? "";
    const newId = `m${Date.now()}`;
    const member: Member = { id: newId, ...input };
    set((state) => ({
      members: [...state.members, member],
      selectedMemberId: newId,
      panelMode: "view",
    }));

    void persistMemberInsert(member, treeId).catch((error) => {
      set({
        syncError: error instanceof Error ? error.message : "成员新增同步失败",
      });
    });
    return newId;
  },

  updateMember: (memberId, patch) => {
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId ? { ...member, ...patch } : member,
      ),
    }));

    void persistMemberUpdate(memberId, patch).catch((error) => {
      set({
        syncError: error instanceof Error ? error.message : "成员更新同步失败",
      });
    });
  },

  deleteMember: (memberId) => {
    set((state) => ({
      nodePositions: (() => {
        const next = Object.fromEntries(
          Object.entries(state.nodePositions).filter(
            ([key]) => key !== memberId,
          ),
        );
        saveNodePositions(next);
        return next;
      })(),
      members: state.members.filter((member) => member.id !== memberId),
      relationships: state.relationships.filter(
        (relation) =>
          relation.fromMemberId !== memberId &&
          relation.toMemberId !== memberId,
      ),
      focusMemberId:
        state.focusMemberId === memberId
          ? (state.members.find((member) => member.id !== memberId)?.id ?? null)
          : state.focusMemberId,
      selectedMemberId:
        state.selectedMemberId === memberId ? null : state.selectedMemberId,
      panelMode: "view",
    }));

    void persistMemberDelete(memberId).catch((error) => {
      set({
        syncError: error instanceof Error ? error.message : "成员删除同步失败",
      });
    });
  },

  addRelationship: ({ fromMemberId, toMemberId, relationType }) => {
    if (fromMemberId === toMemberId) {
      return { ok: false, reason: "不能给同一成员建立关系。" };
    }

    const newRelation: Relationship = {
      id: `r${Date.now()}`,
      fromMemberId,
      toMemberId,
      relationType,
    };
    let isDuplicated = false;

    set((state) => {
      const existing = new Set(
        state.relationships.map((relation) =>
          relationKey(
            relation.fromMemberId,
            relation.toMemberId,
            relation.relationType,
          ),
        ),
      );
      const nextKey = relationKey(fromMemberId, toMemberId, relationType);
      if (existing.has(nextKey)) {
        isDuplicated = true;
        return state;
      }
      return {
        ...state,
        relationships: [...state.relationships, newRelation],
        panelMode: "view",
      };
    });

    if (isDuplicated) {
      return { ok: false, reason: "该关系已存在，请勿重复添加。" };
    }

    void persistRelationshipInsert(newRelation).catch((error) => {
      set({
        syncError: error instanceof Error ? error.message : "关系创建同步失败",
      });
    });
    return { ok: true };
  },

  reconnectRelationship: ({ relationshipId, fromMemberId, toMemberId }) => {
    if (fromMemberId === toMemberId) {
      return { ok: false, reason: "不能连接到同一成员。" };
    }

    const target = get().relationships.find(
      (relation) => relation.id === relationshipId,
    );
    if (!target) {
      return { ok: false, reason: "关系不存在。" };
    }

    const nextKey = relationKey(fromMemberId, toMemberId, target.relationType);
    const duplicated = get().relationships.some((relation) => {
      if (relation.id === relationshipId) return false;
      return (
        relationKey(
          relation.fromMemberId,
          relation.toMemberId,
          relation.relationType,
        ) === nextKey
      );
    });
    if (duplicated) {
      return { ok: false, reason: "目标关系已存在。" };
    }

    set((state) => ({
      relationships: state.relationships.map((relation) =>
        relation.id === relationshipId
          ? { ...relation, fromMemberId, toMemberId }
          : relation,
      ),
    }));

    void persistRelationshipReconnect(
      relationshipId,
      fromMemberId,
      toMemberId,
    ).catch((error) => {
      set({
        syncError: error instanceof Error ? error.message : "关系重连同步失败",
      });
    });

    return { ok: true };
  },

  deleteRelationship: (relationshipId) => {
    set((state) => ({
      relationships: state.relationships.filter(
        (relation) => relation.id !== relationshipId,
      ),
      panelMode: "view",
    }));

    void persistRelationshipDelete(relationshipId).catch((error) => {
      set({
        syncError: error instanceof Error ? error.message : "关系删除同步失败",
      });
    });
  },

  addUnitRelation: ({ fromUnitId, toUnitId, relationType }) => {
    if (fromUnitId === toUnitId) {
      return { ok: false, reason: "不能连接到同一家庭单元。" };
    }

    const normalized =
      relationType === "sibling" && fromUnitId > toUnitId
        ? { fromUnitId: toUnitId, toUnitId: fromUnitId }
        : { fromUnitId, toUnitId };

    const relation: UnitRelation = {
      id: generateUnitRelationId(),
      fromUnitId: normalized.fromUnitId,
      toUnitId: normalized.toUnitId,
      relationType,
    };

    const duplicated = get().unitRelations.some(
      (r) =>
        r.fromUnitId === relation.fromUnitId &&
        r.toUnitId === relation.toUnitId &&
        r.relationType === relation.relationType,
    );
    if (duplicated) return { ok: false, reason: "该家庭单元关系已存在。" };

    set((state) => ({ unitRelations: [...state.unitRelations, relation] }));
    void persistUnitRelationInsert(relation).catch((error) => {
      set((state) => ({
        unitRelations: state.unitRelations.filter(
          (item) => item.id !== relation.id,
        ),
      }));
      const code = (error as { code?: string } | null)?.code;
      if (code === "23505") {
        return;
      }
      set({
        syncError:
          error instanceof Error ? error.message : "单元关系创建同步失败",
      });
    });
    return { ok: true };
  },

  reconnectUnitRelation: ({ relationId, fromUnitId, toUnitId }) => {
    if (fromUnitId === toUnitId) {
      return { ok: false, reason: "不能连接到同一家庭单元。" };
    }
    const target = get().unitRelations.find((r) => r.id === relationId);
    if (!target) return { ok: false, reason: "单元关系不存在。" };

    const normalized =
      target.relationType === "sibling" && fromUnitId > toUnitId
        ? { fromUnitId: toUnitId, toUnitId: fromUnitId }
        : { fromUnitId, toUnitId };

    const duplicated = get().unitRelations.some((r) => {
      if (r.id === relationId) return false;
      return (
        r.fromUnitId === normalized.fromUnitId &&
        r.toUnitId === normalized.toUnitId &&
        r.relationType === target.relationType
      );
    });
    if (duplicated) return { ok: false, reason: "目标关系已存在。" };

    set((state) => ({
      unitRelations: state.unitRelations.map((r) =>
        r.id === relationId
          ? {
              ...r,
              fromUnitId: normalized.fromUnitId,
              toUnitId: normalized.toUnitId,
            }
          : r,
      ),
    }));
    void persistUnitRelationReconnect(
      relationId,
      normalized.fromUnitId,
      normalized.toUnitId,
    ).catch((error) => {
      set({
        syncError:
          error instanceof Error ? error.message : "单元关系重连同步失败",
      });
    });
    return { ok: true };
  },

  deleteUnitRelation: (relationId) => {
    set((state) => ({
      unitRelations: state.unitRelations.filter((r) => r.id !== relationId),
    }));
    void persistUnitRelationDelete(relationId).catch((error) => {
      set({
        syncError:
          error instanceof Error ? error.message : "单元关系删除同步失败",
      });
    });
  },

  swapUnitPartners: (unitId) => {
    const rows = get()
      .unitMembers.filter(
        (row) =>
          row.unitId === unitId &&
          (row.role === "partner1" || row.role === "partner2"),
      )
      .slice(0, 2);
    if (rows.length < 2) return;
    const partner1 = rows.find((row) => row.role === "partner1");
    const partner2 = rows.find((row) => row.role === "partner2");
    if (!partner1 || !partner2) return;

    set((state) => ({
      unitMembers: state.unitMembers.map((row) => {
        if (row.memberId === partner1.memberId)
          return { ...row, role: "partner2" };
        if (row.memberId === partner2.memberId)
          return { ...row, role: "partner1" };
        return row;
      }),
    }));

    void Promise.all([
      persistUnitMemberRole(partner1.memberId, "partner2"),
      persistUnitMemberRole(partner2.memberId, "partner1"),
    ]).catch((error) => {
      set({
        syncError:
          error instanceof Error ? error.message : "夫妻位置互换同步失败",
      });
    });
  },

  findAndSelectMemberByName: (keyword) => {
    const query = keyword.trim();
    if (!query) return { ok: false, reason: "请输入姓名。" };

    let foundId: string | null = null;
    set((state) => {
      const exact = state.members.find((member) => member.name === query);
      const partial = state.members.find((member) =>
        member.name.includes(query),
      );
      const target = exact ?? partial ?? null;
      if (!target) return state;
      foundId = target.id;
      const matchedUnitId =
        state.unitMembers.find((entry) => entry.memberId === target.id)
          ?.unitId ?? null;
      return {
        ...state,
        selectedMemberId: target.id,
        selectedUnitId: matchedUnitId,
        focusUnitId: matchedUnitId ?? state.focusUnitId,
        panelMode: "view",
      };
    });

    if (!foundId) return { ok: false, reason: "未找到对应成员。" };
    return { ok: true };
  },

  setShareEnabled: (enabled) => {
    const treeId = get().treeId;
    if (treeId) {
      void updateShareSettings(treeId, { enabled }).catch((error) => {
        set({
          syncError:
            error instanceof Error ? error.message : "分享配置同步失败",
        });
      });
    }
    set({ shareEnabled: enabled });
  },

  refreshShareToken: () => {
    const treeId = get().treeId;
    const token = generateShareToken();
    if (treeId) {
      void updateShareSettings(treeId, { token }).catch((error) => {
        set({
          syncError:
            error instanceof Error ? error.message : "分享 Token 同步失败",
        });
      });
    }
    set({ shareToken: token });
    return token;
  },

  isValidShareAccess: (token) =>
    !!token && get().shareEnabled && token === get().shareToken,

  setViewMode: (mode) => set({ viewMode: mode }),
  setFocusMemberId: (memberId) => set({ focusMemberId: memberId }),
  setFocusUnitId: (unitId) => set({ focusUnitId: unitId }),
  setLineVisibility: (patch) =>
    set((state) => ({
      showParentChildLines:
        patch.showParentChildLines ?? state.showParentChildLines,
      showSpouseLines: patch.showSpouseLines ?? state.showSpouseLines,
      showSiblingLines: patch.showSiblingLines ?? state.showSiblingLines,
    })),

  setFilterGenerations: (gens) => set({ filterGenerations: gens }),

  setNodePosition: (memberId, position) =>
    set((state) => {
      const next = { ...state.nodePositions, [memberId]: position };
      saveNodePositions(next);
      return { nodePositions: next };
    }),

  setNodePositions: (positions) =>
    set(() => {
      saveNodePositions(positions);
      return { nodePositions: positions };
    }),

  triggerAutoArrange: () =>
    set((state) => ({ layoutRequestVersion: state.layoutRequestVersion + 1 })),

  updateMemberAvatar: (memberId, avatarUrl) => {
    const treeId = get().treeId ?? undefined;
    set((state) => ({
      members: state.members.map((member) =>
        member.id === memberId ? { ...member, avatarUrl } : member,
      ),
    }));

    void (async () => {
      try {
        const persistedUrl = await uploadAvatar(memberId, avatarUrl, treeId);
        await persistMemberUpdate(memberId, { avatarUrl: persistedUrl });
        if (persistedUrl !== avatarUrl) {
          set((state) => ({
            members: state.members.map((member) =>
              member.id === memberId
                ? { ...member, avatarUrl: persistedUrl }
                : member,
            ),
          }));
        }
      } catch (error) {
        // Fallback: if storage upload fails, persist data URL directly so refresh won't lose avatar.
        try {
          await persistMemberUpdate(memberId, { avatarUrl });
          set({
            syncError:
              "头像未写入对象存储，已降级保存到数据库。请稍后修复 Storage Policy。",
          });
        } catch (persistError) {
          set({
            syncError:
              persistError instanceof Error
                ? persistError.message
                : "头像上传与降级保存都失败",
          });
        }
      }
    })();
  },
}));
