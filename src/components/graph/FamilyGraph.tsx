import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Background,
  ConnectionMode,
  ConnectionLineType,
  Controls,
  MarkerType,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnReconnect,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useFamilyStore } from "../../store/useFamilyStore";
import type { RelationType } from "../../types/family";
import { RelationshipEdge } from "./RelationshipEdge";
import { UnitNode } from "./UnitNode";

const REL_PARENT_CHILD = "parent_child" as const;
const REL_SIBLING = "sibling" as const;
const UNIT_CARD_WIDTH = 300;
const UNIT_CARD_MIN_GAP = 26;

type FamilyGraphProps = {
  readOnly?: boolean;
};

function unitGeneration(
  unitId: string,
  unitGenerationValue: number | undefined,
  unitMemberIds: Map<string, string[]>,
  memberGenerationMap: Map<string, number>,
): number {
  if (typeof unitGenerationValue === "number") return unitGenerationValue;
  const memberIds = unitMemberIds.get(unitId) ?? [];
  const gens = memberIds
    .map((id) => memberGenerationMap.get(id))
    .filter((v): v is number => typeof v === "number");
  if (gens.length === 0) return 99;
  return Math.min(...gens);
}

function calculateTreeLayout(
  units: Array<{ id: string; name: string; generation: number }>,
  parentToChildren: Map<string, Set<string>>,
  xGap: number,
  yGap: number,
): Record<string, { x: number; y: number }> {
  const unitSet = new Set(units.map((u) => u.id));
  const grouped = new Map<number, Array<{ id: string; name: string }>>();
  for (const unit of units) {
    const group = grouped.get(unit.generation) ?? [];
    group.push({ id: unit.id, name: unit.name });
    grouped.set(unit.generation, group);
  }
  const generations = [...grouped.keys()].sort((a, b) => a - b);
  if (generations.length === 0) return {};

  // 判断unit是否属于母系（名称含"外"字）
  const isMaternalUnit = (unitId: string) => {
    const name = units.find((u) => u.id === unitId)?.name ?? "";
    return name.includes("外");
  };

  // 每个子节点只归属一个"主父节点"（避免多父导致重复计算子树宽度）
  const primaryParent = new Map<string, string>();
  const primaryChildren = new Map<string, string[]>();
  for (const unit of units) {
    const parents: string[] = [];
    for (const [pid, children] of parentToChildren.entries()) {
      if (children.has(unit.id) && unitSet.has(pid)) parents.push(pid);
    }
    if (parents.length > 0) {
      // 多个父时：优先选父系（非"外"）parent，同辈按名字排序
      parents.sort((a, b) => {
        const ga = units.find((u) => u.id === a)?.generation ?? 99;
        const gb = units.find((u) => u.id === b)?.generation ?? 99;
        if (ga !== gb) return ga - gb;
        // 同辈时，父系优先于母系
        const ma = isMaternalUnit(a) ? 1 : 0;
        const mb = isMaternalUnit(b) ? 1 : 0;
        return ma - mb || a.localeCompare(b);
      });
      primaryParent.set(unit.id, parents[0]);
      const list = primaryChildren.get(parents[0]) ?? [];
      list.push(unit.id);
      primaryChildren.set(parents[0], list);
    }
  }

  // 计算每个节点的子树宽度（基于primaryChildren）
  const subtreeWidth = new Map<string, number>();
  const calcWidth = (id: string): number => {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!;
    const children = (primaryChildren.get(id) ?? []).filter((c) =>
      unitSet.has(c),
    );
    const w =
      children.length === 0
        ? 1
        : children.reduce((s, c) => s + calcWidth(c), 0);
    subtreeWidth.set(id, w);
    return w;
  };
  for (const u of units) calcWidth(u.id);

  // 从第一代开始分配x坐标
  const positions: Record<string, { x: number; y: number }> = {};
  // 父系（非"外"）排左边，母系（含"外"）排右边
  const topGroup = (grouped.get(generations[0]) ?? []).sort((a, b) => {
    const ma = a.name.includes("外") ? 1 : 0;
    const mb = b.name.includes("外") ? 1 : 0;
    return ma - mb || a.name.localeCompare(b.name, "zh-CN");
  });

  let totalTopWidth = 0;
  for (const unit of topGroup) {
    totalTopWidth += (subtreeWidth.get(unit.id) ?? 1) * xGap;
  }
  totalTopWidth -= xGap;

  let cursor = 360 - totalTopWidth / 2;
  for (const unit of topGroup) {
    const w = (subtreeWidth.get(unit.id) ?? 1) * xGap;
    positions[unit.id] = { x: cursor + w / 2 - xGap / 2, y: 120 };
    cursor += w;
  }

  // 逐代分配：子节点居中于主父节点下方
  const placed = new Set(topGroup.map((u) => u.id));
  const minDist = UNIT_CARD_WIDTH + UNIT_CARD_MIN_GAP;

  for (let i = 1; i < generations.length; i++) {
    const gen = generations[i];
    const row = grouped.get(gen) ?? [];
    const y = 120 + i * yGap;

    // 按主父节点分组
    const parentGroupsMap = new Map<
      string,
      Array<{ id: string; name: string }>
    >();
    const orphans: Array<{ id: string; name: string }> = [];

    for (const unit of row) {
      const pid = primaryParent.get(unit.id);
      if (pid && placed.has(pid)) {
        const group = parentGroupsMap.get(pid) ?? [];
        group.push(unit);
        parentGroupsMap.set(pid, group);
      } else {
        orphans.push(unit);
      }
    }

    // 按父节点x坐标排序分配
    const sortedParents = [...parentGroupsMap.entries()].sort(
      ([a], [b]) => (positions[a]?.x ?? 0) - (positions[b]?.x ?? 0),
    );

    for (const [parentId, children] of sortedParents) {
      const parentPos = positions[parentId];
      if (!parentPos) continue;
      const totalChildWidth = (children.length - 1) * xGap;
      const startX = parentPos.x - totalChildWidth / 2;
      children.forEach((child, idx) => {
        positions[child.id] = { x: startX + idx * xGap, y };
        placed.add(child.id);
      });
    }

    // 孤立节点排在最右
    if (orphans.length > 0) {
      const allPlacedX = Object.values(positions).map((p) => p.x);
      const maxX = allPlacedX.length > 0 ? Math.max(...allPlacedX) : 0;
      let orphanCursor = maxX + xGap;
      for (const unit of orphans.sort((a, b) =>
        a.name.localeCompare(b.name, "zh-CN"),
      )) {
        positions[unit.id] = { x: orphanCursor, y };
        placed.add(unit.id);
        orphanCursor += xGap;
      }
    }

    // 碰撞检测与修正：同一行内，按x排序，发现重叠则向右推
    const rowUnits = row.filter((u) => positions[u.id]);
    rowUnits.sort(
      (a, b) => (positions[a.id]?.x ?? 0) - (positions[b.id]?.x ?? 0),
    );
    for (let j = 1; j < rowUnits.length; j++) {
      const prev = positions[rowUnits[j - 1].id];
      const curr = positions[rowUnits[j].id];
      if (!prev || !curr) continue;
      const gap = curr.x - prev.x;
      if (gap < minDist) {
        const shift = minDist - gap;
        // 向右推当前及后续所有节点
        for (let k = j; k < rowUnits.length; k++) {
          const p = positions[rowUnits[k].id];
          if (p) p.x += shift;
        }
      }
    }

    // 推完后重新居中整行（保持整体居中）
    if (rowUnits.length > 1) {
      const xs = rowUnits.map((u) => positions[u.id]?.x ?? 0);
      const rowCenter = (Math.min(...xs) + Math.max(...xs)) / 2;
      // 计算所有父节点的中心
      const parentXs = sortedParents.map(([pid]) => positions[pid]?.x ?? 0);
      if (parentXs.length > 0) {
        const parentsCenter =
          (Math.min(...parentXs) + Math.max(...parentXs)) / 2;
        const drift = parentsCenter - rowCenter;
        for (const u of rowUnits) {
          const p = positions[u.id];
          if (p) p.x += drift;
        }
      }
    }
  }

  // 处理未布局的节点
  for (const unit of units) {
    if (!positions[unit.id]) {
      positions[unit.id] = { x: 100, y: 100 };
    }
  }

  return positions;
}

// 所有关系统一使用上下锚点
function resolveRelationHandles(): {
  sourceHandle: string;
  targetHandle: string;
} {
  return { sourceHandle: "s-bottom", targetHandle: "t-top" };
}

function resolveNonOverlapX(
  candidateX: number,
  movingUnitId: string,
  generation: number,
  units: Array<{ id: string; generation: number }>,
  positions: Record<string, { x: number; y: number }>,
): number {
  const blocked = units
    .filter(
      (unit) => unit.id !== movingUnitId && unit.generation === generation,
    )
    .map((unit) => positions[unit.id]?.x)
    .filter((x): x is number => typeof x === "number")
    .sort((a, b) => a - b);

  if (blocked.length === 0) return candidateX;

  const minDistance = UNIT_CARD_WIDTH + UNIT_CARD_MIN_GAP;
  const intersects = (x: number) =>
    blocked.some((bx) => Math.abs(x - bx) < minDistance);
  if (!intersects(candidateX)) return candidateX;

  const step = 12;
  for (let i = 1; i < 320; i += 1) {
    const right = candidateX + i * step;
    if (!intersects(right)) return right;
    const left = candidateX - i * step;
    if (!intersects(left)) return left;
  }
  return candidateX;
}

function toLegacyRelationType(
  type: typeof REL_PARENT_CHILD | typeof REL_SIBLING,
): RelationType {
  return type === REL_PARENT_CHILD ? "parent" : "sibling";
}

export function FamilyGraph({ readOnly = false }: FamilyGraphProps) {
  const members = useFamilyStore((s) => s.members);
  const units = useFamilyStore((s) => s.units);
  const unitMembers = useFamilyStore((s) => s.unitMembers);
  const unitRelations = useFamilyStore((s) => s.unitRelations);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  const setSelectedMemberId = useFamilyStore((s) => s.setSelectedMemberId);
  const selectedUnitId = useFamilyStore((s) => s.selectedUnitId);
  const setSelectedUnitId = useFamilyStore((s) => s.setSelectedUnitId);
  const viewMode = useFamilyStore((s) => s.viewMode);
  const focusUnitId = useFamilyStore((s) => s.focusUnitId);
  const setFocusUnitId = useFamilyStore((s) => s.setFocusUnitId);
  const showParentChildLines = useFamilyStore((s) => s.showParentChildLines);
  const showSiblingLines = useFamilyStore((s) => s.showSiblingLines);
  const filterGenerations = useFamilyStore((s) => s.filterGenerations);
  const nodePositions = useFamilyStore((s) => s.nodePositions);
  const setNodePosition = useFamilyStore((s) => s.setNodePosition);
  const setNodePositions = useFamilyStore((s) => s.setNodePositions);
  const layoutRequestVersion = useFamilyStore((s) => s.layoutRequestVersion);
  const addUnitRelation = useFamilyStore((s) => s.addUnitRelation);
  const reconnectUnitRelation = useFamilyStore((s) => s.reconnectUnitRelation);
  const deleteUnitRelation = useFamilyStore((s) => s.deleteUnitRelation);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [connectMessage, setConnectMessage] = useState("");
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const connectingRef = useRef(false);
  const connectedRef = useRef(false);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const memberGenerationMap = useMemo(
    () => new Map(members.map((m) => [m.id, m.generation ?? 99])),
    [members],
  );

  const unitMemberRows = useMemo(() => {
    const map = new Map<
      string,
      Array<{ memberId: string; role: "single" | "partner1" | "partner2" }>
    >();
    for (const row of unitMembers) {
      const list = map.get(row.unitId) ?? [];
      list.push({ memberId: row.memberId, role: row.role });
      map.set(row.unitId, list);
    }
    for (const [unitId, rows] of map.entries()) {
      const roleOrder = { partner1: 0, single: 1, partner2: 2 };
      rows.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
      map.set(unitId, rows);
    }
    return map;
  }, [unitMembers]);

  const unitMemberIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [unitId, rows] of unitMemberRows.entries()) {
      map.set(
        unitId,
        rows.map((row) => row.memberId),
      );
    }
    return map;
  }, [unitMemberRows]);

  const normalizedUnits = useMemo(
    () =>
      units.map((u) => ({
        id: u.id,
        name: u.name,
        generation: unitGeneration(
          u.id,
          u.generation,
          unitMemberIds,
          memberGenerationMap,
        ),
      })),
    [units, unitMemberIds, memberGenerationMap],
  );

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const u of units) map.set(u.id, new Set<string>());
    for (const rel of unitRelations) {
      map.get(rel.fromUnitId)?.add(rel.toUnitId);
      map.get(rel.toUnitId)?.add(rel.fromUnitId);
    }
    return map;
  }, [units, unitRelations]);

  const parentToChildren = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const relation of unitRelations) {
      if (relation.relationType !== REL_PARENT_CHILD) continue;
      const set = map.get(relation.fromUnitId) ?? new Set<string>();
      set.add(relation.toUnitId);
      map.set(relation.fromUnitId, set);
    }
    return map;
  }, [unitRelations]);

  const childToParents = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const relation of unitRelations) {
      if (relation.relationType !== REL_PARENT_CHILD) continue;
      const set = map.get(relation.toUnitId) ?? new Set<string>();
      set.add(relation.fromUnitId);
      map.set(relation.toUnitId, set);
    }
    return map;
  }, [unitRelations]);

  const effectiveFocusUnitId = useMemo(() => {
    if (focusUnitId && units.some((u) => u.id === focusUnitId))
      return focusUnitId;
    return units[0]?.id ?? null;
  }, [focusUnitId, units]);

  const visibleUnitIds = useMemo(() => {
    if (viewMode === "overview") return new Set(units.map((u) => u.id));
    if (!effectiveFocusUnitId) return new Set<string>();
    const focusNeighborhood = () => {
      const visited = new Set<string>([effectiveFocusUnitId]);
      const queue: Array<{ id: string; depth: number }> = [
        { id: effectiveFocusUnitId, depth: 0 },
      ];
      const maxDepth = 2;
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        if (current.depth >= maxDepth) continue;
        const ns = neighbors.get(current.id);
        if (!ns) continue;
        for (const next of ns) {
          if (visited.has(next)) continue;
          visited.add(next);
          queue.push({ id: next, depth: current.depth + 1 });
        }
      }
      return visited;
    };

    if (viewMode === "focus") return focusNeighborhood();

    // 父系/母系筛选：找到祖辈unit作为分支根节点
    const unitHasKeyword = (unitId: string, keywords: string[]) => {
      const rows = unitMemberRows.get(unitId) ?? [];
      return rows.some((row) => {
        const name = memberMap.get(row.memberId)?.name ?? "";
        return keywords.some((k) => name.includes(k));
      });
    };

    // 父系根关键字：爷爷奶奶一辈
    const paternalRootKeys = ["爷", "奶"];
    // 母系根关键字：外公外婆一辈
    const maternalRootKeys = ["外公", "外婆", "外"];
    const rootKeys =
      viewMode === "paternal" ? paternalRootKeys : maternalRootKeys;

    // 策略1：从焦点unit向上追溯所有祖先，找到匹配分支根关键字的unit
    const allAncestors = new Set<string>();
    const ancestorQueue = [effectiveFocusUnitId];
    while (ancestorQueue.length > 0) {
      const cur = ancestorQueue.shift()!;
      const parents = childToParents.get(cur) ?? new Set<string>();
      for (const p of parents) {
        if (allAncestors.has(p)) continue;
        allAncestors.add(p);
        ancestorQueue.push(p);
      }
    }

    let branchRoots = [...allAncestors]
      .filter((id) => unitHasKeyword(id, rootKeys))
      .sort((a, b) => {
        const genA = normalizedUnits.find((u) => u.id === a)?.generation ?? 99;
        const genB = normalizedUnits.find((u) => u.id === b)?.generation ?? 99;
        return genA - genB;
      });

    // 策略2：若祖先中找不到（可能缺少跨分支parent_child链接），搜索全部unit
    if (branchRoots.length === 0) {
      branchRoots = normalizedUnits
        .filter((u) => unitHasKeyword(u.id, rootKeys))
        .map((u) => u.id)
        .sort((a, b) => {
          const genA =
            normalizedUnits.find((u) => u.id === a)?.generation ?? 99;
          const genB =
            normalizedUnits.find((u) => u.id === b)?.generation ?? 99;
          return genA - genB;
        });
    }

    if (branchRoots.length === 0) return focusNeighborhood();

    // 只取最高辈（generation最小）的根，避免跨分支污染
    const topGen =
      normalizedUnits.find((u) => u.id === branchRoots[0])?.generation ?? 99;
    const topRoots = branchRoots.filter((id) => {
      const gen = normalizedUnits.find((u) => u.id === id)?.generation ?? 99;
      return gen === topGen;
    });

    // 从根开始BFS向下展开（只走parent_child，不走sibling，避免跨分支污染）
    const visited = new Set<string>([effectiveFocusUnitId]);
    for (const root of topRoots) visited.add(root);
    const queue = [...topRoots];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = parentToChildren.get(current) ?? new Set<string>();
      for (const child of children) {
        if (visited.has(child)) continue;
        visited.add(child);
        queue.push(child);
      }
    }
    // 也包含焦点unit的直接父unit（爸妈合并unit）
    const focusParents =
      childToParents.get(effectiveFocusUnitId) ?? new Set<string>();
    for (const p of focusParents) visited.add(p);

    // 跨分支连线：对于已在可见集合中的unit，如果它有来自另一分支的parent，
    // 也纳入可见集合，以便渲染跨分支连线（如：爸爸妈妈 ← 外公外婆）
    const crossBranchParents: string[] = [];
    for (const uid of visited) {
      const parents = childToParents.get(uid) ?? new Set<string>();
      for (const p of parents) {
        if (!visited.has(p)) crossBranchParents.push(p);
      }
    }
    for (const p of crossBranchParents) visited.add(p);

    return visited;
  }, [
    viewMode,
    units,
    effectiveFocusUnitId,
    neighbors,
    childToParents,
    parentToChildren,
    unitMemberRows,
    memberMap,
    unitRelations,
    normalizedUnits,
  ]);

  const visibleUnits = useMemo(
    () =>
      normalizedUnits.filter((u) => {
        if (!visibleUnitIds.has(u.id)) return false;
        if (filterGenerations && !filterGenerations.has(u.generation))
          return false;
        return true;
      }),
    [normalizedUnits, visibleUnitIds, filterGenerations],
  );

  const visibleRelations = useMemo(
    () =>
      unitRelations.filter((r) => {
        if (
          !visibleUnitIds.has(r.fromUnitId) ||
          !visibleUnitIds.has(r.toUnitId)
        )
          return false;
        if (r.relationType === REL_PARENT_CHILD) return showParentChildLines;
        if (r.relationType === REL_SIBLING) return showSiblingLines;
        return false;
      }),
    [unitRelations, visibleUnitIds, showParentChildLines, showSiblingLines],
  );

  const autoPositions = useMemo(() => {
    const xGap = viewMode === "overview" ? 380 : 360;
    const yGap = 300;
    return calculateTreeLayout(visibleUnits, parentToChildren, xGap, yGap);
  }, [visibleUnits, parentToChildren, viewMode]);

  // 自动整理：清除手动位置，回到自动布局
  const lastLayoutVersion = useRef(0);
  useEffect(() => {
    if (layoutRequestVersion === 0) return;
    if (layoutRequestVersion === lastLayoutVersion.current) return;
    lastLayoutVersion.current = layoutRequestVersion;
    setNodePositions({});
    if (reactFlowInstance) {
      setTimeout(
        () => reactFlowInstance.fitView({ duration: 400, padding: 0.2 }),
        50,
      );
    }
  }, [layoutRequestVersion, setNodePositions, reactFlowInstance]);

  const positions = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const unit of visibleUnits) {
      const key = `unit:${unit.id}`;
      const fromStore =
        viewMode === "overview" ? nodePositions[key] : undefined;
      out[unit.id] = fromStore ?? autoPositions[unit.id] ?? { x: 100, y: 100 };
    }
    return out;
  }, [visibleUnits, viewMode, nodePositions, autoPositions]);

  const generationStrips = useMemo<Node[]>(() => {
    const grouped = new Map<number, Array<{ x: number; y: number }>>();
    for (const unit of visibleUnits) {
      const pos = positions[unit.id];
      const list = grouped.get(unit.generation) ?? [];
      list.push(pos);
      grouped.set(unit.generation, list);
    }

    return [...grouped.entries()]
      .filter(([generation]) => generation !== 99)
      .map(([generation, pts]) => {
        const minX = Math.min(...pts.map((p) => p.x));
        const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        return {
          id: `gen-label-${generation}`,
          position: { x: minX - 165, y: avgY + 50 },
          draggable: false,
          selectable: false,
          connectable: false,
          style: {
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
          },
          data: {
            label: (
              <div className="generation-strip ink-fade">
                <div className="generation-strip-seal">谱</div>
                <div className="generation-strip-text">第 {generation} 代</div>
              </div>
            ),
          },
        } as Node;
      });
  }, [visibleUnits, positions]);

  const generationYMap = useMemo(() => {
    const grouped = new Map<number, number[]>();
    for (const unit of visibleUnits) {
      const y = positions[unit.id]?.y;
      if (typeof y !== "number") continue;
      const list = grouped.get(unit.generation) ?? [];
      list.push(y);
      grouped.set(unit.generation, list);
    }
    const map = new Map<number, number>();
    for (const [generation, ys] of grouped.entries()) {
      if (ys.length === 0) continue;
      map.set(generation, ys.reduce((sum, v) => sum + v, 0) / ys.length);
    }
    return map;
  }, [visibleUnits, positions]);

  const nodes = useMemo<Node[]>(() => {
    const unitNodes = visibleUnits.map((unit) => {
      const unitRows = unitMemberRows.get(unit.id) ?? [];
      const membersInUnit = unitRows
        .map((row) => memberMap.get(row.memberId))
        .filter((m): m is NonNullable<typeof m> => !!m);
      return {
        id: unit.id,
        type: "unitNode",
        position: positions[unit.id] ?? { x: 100, y: 100 },
        draggable: !readOnly && viewMode === "overview",
        style: {
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
        },
        data: {
          members: membersInUnit,
          selectedMemberId,
          isHovered: hoveredUnitId === unit.id,
          onSelectMember: (memberId: string) => {
            setSelectedMemberId(memberId);
            setSelectedUnitId(unit.id);
            setFocusUnitId(unit.id);
            setSelectedEdgeId(null);
          },
          onHover: (isHovering: boolean) => {
            setHoveredUnitId(isHovering ? unit.id : null);
          },
        },
      } as Node;
    });
    return [...generationStrips, ...unitNodes];
  }, [
    visibleUnits,
    unitMemberRows,
    memberMap,
    positions,
    readOnly,
    viewMode,
    generationStrips,
    selectedMemberId,
    setSelectedMemberId,
    setSelectedUnitId,
    setFocusUnitId,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const handles = resolveRelationHandles();

    // 计算线条捆绑信息：统计从同一源节点出发的边数量
    const bundleGroups = new Map<string, string[]>();
    for (const rel of visibleRelations) {
      const group = bundleGroups.get(rel.fromUnitId) ?? [];
      group.push(rel.id);
      bundleGroups.set(rel.fromUnitId, group);
    }

    return visibleRelations.map((rel) => {
      const relationType = toLegacyRelationType(rel.relationType);

      const bundleGroup = bundleGroups.get(rel.fromUnitId) ?? [];
      const bundleIndex = bundleGroup.indexOf(rel.id);
      const bundleTotal = bundleGroup.length;

      const isRelated =
        hoveredUnitId &&
        (rel.fromUnitId === hoveredUnitId || rel.toUnitId === hoveredUnitId);
      const isUnrelated = hoveredUnitId && !isRelated;

      const baseStyle =
        relationType === "sibling"
          ? {
              stroke: "#9B7B3D",
              strokeWidth: 1.5,
              strokeDasharray: "4 8",
              strokeLinecap: "round",
              opacity: 0.65,
            }
          : {
              stroke: "#4D4235",
              strokeWidth: 2.2,
              strokeLinecap: "round",
              opacity: 0.9,
              filter: "drop-shadow(0 1px 2px rgba(77, 66, 53, 0.15))",
            };

      const style = isRelated
        ? {
            ...baseStyle,
            stroke: "#A63A2E",
            strokeWidth: Number(baseStyle.strokeWidth) + 1.2,
            opacity: 1,
            filter: "drop-shadow(0 0 6px rgba(166, 58, 46, 0.6))",
            strokeDasharray: relationType === "sibling" ? "4 8" : undefined,
          }
        : isUnrelated
          ? { ...baseStyle, opacity: 0.2 }
          : baseStyle;

      return {
        id: rel.id,
        source: rel.fromUnitId,
        target: rel.toUnitId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: "relationshipEdge",
        selectable: true,
        reconnectable: true,
        selected: rel.id === selectedEdgeId,
        interactionWidth: 64,
        zIndex: relationType === "parent" ? 2 : 1,
        markerEnd:
          relationType === "parent"
            ? {
                type: MarkerType.ArrowClosed,
                color: "#4D4235",
                width: 20,
                height: 20,
              }
            : undefined,
        style,
        data: { relationType, bundleIndex, bundleTotal },
      } as Edge;
    });
  }, [visibleRelations, selectedEdgeId, hoveredUnitId]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (node.id.startsWith("gen-label-")) return;
    setSelectedUnitId(node.id);
    setFocusUnitId(node.id);
    const firstMemberId =
      (unitMemberRows.get(node.id) ?? [])[0]?.memberId ?? null;
    if (firstMemberId) {
      setSelectedMemberId(firstMemberId);
    }
    setSelectedEdgeId(null);
  };

  const handleConnect = (connection: Connection) => {
    if (readOnly) return;
    connectedRef.current = true;
    const source = connection.source;
    const target = connection.target;
    if (!source || !target) {
      setConnectMessage("连接失败：请从家庭单元锚点拖拽到另一个单元锚点。");
      return;
    }
    // 根据两个单元的代际判断关系类型：同代=兄弟，不同代=父子
    const sourceGen =
      normalizedUnits.find((u) => u.id === source)?.generation ?? 99;
    const targetGen =
      normalizedUnits.find((u) => u.id === target)?.generation ?? 99;
    const relationType =
      sourceGen === targetGen ? REL_SIBLING : REL_PARENT_CHILD;
    const result = addUnitRelation({
      fromUnitId: source,
      toUnitId: target,
      relationType,
    });
    if (!result.ok) {
      setConnectMessage(result.reason);
      return;
    }
    setConnectMessage("");
  };

  const handleReconnect: OnReconnect = (oldEdge, newConnection) => {
    if (readOnly) return;
    const source = newConnection.source;
    const target = newConnection.target;
    if (!source || !target) return;
    const result = reconnectUnitRelation({
      relationId: oldEdge.id,
      fromUnitId: source,
      toUnitId: target,
    });
    if (!result.ok) {
      setConnectMessage(result.reason);
      return;
    }
    setConnectMessage("");
    setSelectedEdgeId(oldEdge.id);
  };

  const handleConnectStart = () => {
    connectingRef.current = true;
    connectedRef.current = false;
    setConnectMessage("");
  };

  const handleConnectEnd = () => {
    if (!connectingRef.current) return;
    connectingRef.current = false;
    if (!connectedRef.current) {
      setConnectMessage("未连接成功：请把鼠标拖到高亮锚点后再松开。");
    }
  };

  const handleNodeDragStop = (
    _event: ReactMouseEvent<Element, MouseEvent>,
    node: Node,
  ) => {
    if (viewMode !== "overview") return;
    if (node.id.startsWith("gen-label-")) return;
    const unit = visibleUnits.find((u) => u.id === node.id);
    if (!unit) return;
    const lockedY = generationYMap.get(unit.generation);
    const nextX = resolveNonOverlapX(
      node.position.x,
      unit.id,
      unit.generation,
      visibleUnits,
      positions,
    );
    if (typeof lockedY === "number") {
      node.position = { x: nextX, y: lockedY };
    } else {
      node.position = { ...node.position, x: nextX };
    }
    setNodePosition(`unit:${node.id}`, node.position);
  };

  const handleNodeDrag = (
    _event: ReactMouseEvent<Element, MouseEvent>,
    node: Node,
  ) => {
    if (viewMode !== "overview") return;
    if (node.id.startsWith("gen-label-")) return;
    const unit = visibleUnits.find((u) => u.id === node.id);
    if (!unit) return;
    const lockedY = generationYMap.get(unit.generation);
    const nextX = resolveNonOverlapX(
      node.position.x,
      unit.id,
      unit.generation,
      visibleUnits,
      positions,
    );
    if (typeof lockedY !== "number") {
      node.position = { ...node.position, x: nextX };
      return;
    }
    node.position = { x: nextX, y: lockedY };
  };

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) return;
    reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
  }, [reactFlowInstance, nodes.length, viewMode]);

  useEffect(() => {
    if (!reactFlowInstance || !selectedUnitId) return;
    const node = nodes.find((n) => n.id === selectedUnitId);
    if (!node) return;
    reactFlowInstance.setCenter(node.position.x + 140, node.position.y + 70, {
      zoom: 0.9,
      duration: 250,
    });
  }, [reactFlowInstance, selectedUnitId, nodes]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (visibleRelations.some((relation) => relation.id === selectedEdgeId))
      return;
    setSelectedEdgeId(null);
  }, [selectedEdgeId, visibleRelations]);

  const nodeTypes = useMemo(() => ({ unitNode: UnitNode }), []);
  const edgeTypes = useMemo(() => ({ relationshipEdge: RelationshipEdge }), []);

  return (
    <div className="relative h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),_rgba(243,235,216,0.9))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_28%,transparent_72%,rgba(118,88,46,0.06))]" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.35}
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={(_e, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          setConnectMessage("");
        }}
        onConnectStart={handleConnectStart}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onReconnect={handleReconnect}
        reconnectRadius={64}
        connectionRadius={56}
        nodesDraggable={!readOnly && viewMode === "overview"}
        nodesConnectable={!readOnly}
        edgesReconnectable={!readOnly}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={false}
        onlyRenderVisibleElements
        elevateEdgesOnSelect
        defaultEdgeOptions={{ zIndex: 20 }}
        elementsSelectable
      >
        <Background gap={20} size={1.1} color="#d2c4a8" />
        <Controls />
      </ReactFlow>

      {selectedEdgeId && !readOnly && (
        <div className="panel-reveal absolute right-4 top-4 z-20 w-72 rounded border border-bronze/55 bg-parchment p-3 shadow-panel-soft">
          <p className="mb-2 text-sm text-ink">已选中关系线</p>
          <button
            className="tool-btn text-center text-cinnabar"
            onClick={() => {
              deleteUnitRelation(selectedEdgeId);
              setSelectedEdgeId(null);
            }}
          >
            删除关系
          </button>
        </div>
      )}

      {connectMessage && !readOnly && (
        <div className="panel-reveal absolute right-4 top-4 z-20 w-80 rounded border border-bronze/55 bg-parchment p-3 shadow-panel-soft">
          <p className="text-sm text-cinnabar">{connectMessage}</p>
        </div>
      )}
    </div>
  );
}
