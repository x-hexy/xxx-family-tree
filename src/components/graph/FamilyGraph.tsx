import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
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
  type ReactFlowInstance
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

type PendingUnitConnection = {
  source: string;
  target: string;
} | null;

const unitRelationLabels: Record<typeof REL_PARENT_CHILD | typeof REL_SIBLING, string> = {
  parent_child: "父母/子女",
  sibling: "兄弟姐妹"
};

function unitGeneration(
  unitId: string,
  unitGenerationValue: number | undefined,
  unitMemberIds: Map<string, string[]>,
  memberGenerationMap: Map<string, number>
): number {
  if (typeof unitGenerationValue === "number") return unitGenerationValue;
  const memberIds = unitMemberIds.get(unitId) ?? [];
  const gens = memberIds
    .map((id) => memberGenerationMap.get(id))
    .filter((v): v is number => typeof v === "number");
  if (gens.length === 0) return 99;
  return Math.min(...gens);
}

function calculateUnitLayout(
  units: Array<{ id: string; name: string; generation: number }>,
  xGap: number,
  yGap: number
): Record<string, { x: number; y: number }> {
  const grouped = new Map<number, Array<{ id: string; name: string }>>();
  for (const unit of units) {
    const group = grouped.get(unit.generation) ?? [];
    group.push({ id: unit.id, name: unit.name });
    grouped.set(unit.generation, group);
  }

  const generations = [...grouped.keys()].sort((a, b) => a - b);
  const positions: Record<string, { x: number; y: number }> = {};

  generations.forEach((generation, row) => {
    const group = (grouped.get(generation) ?? []).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    const totalWidth = (group.length - 1) * xGap;
    const startX = 360 - totalWidth / 2;
    group.forEach((unit, col) => {
      positions[unit.id] = { x: startX + col * xGap, y: 120 + row * yGap };
    });
  });

  return positions;
}

function pickHandles(
  sourceId: string,
  targetId: string,
  positions: Record<string, { x: number; y: number }>
): { sourceHandle?: string; targetHandle?: string } {
  const source = positions[sourceId];
  const target = positions[targetId];
  if (!source || !target) return {};
  const sourceCenterX = source.x + 150;
  const sourceCenterY = source.y + 80;
  const targetCenterX = target.x + 150;
  const targetCenterY = target.y + 80;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  if (Math.abs(dx) > Math.abs(dy) * 1.2) {
    return dx > 0 ? { sourceHandle: "s-right", targetHandle: "t-left" } : { sourceHandle: "s-left", targetHandle: "t-right" };
  }
  return dy > 0 ? { sourceHandle: "s-bottom", targetHandle: "t-top" } : { sourceHandle: "s-top", targetHandle: "t-bottom" };
}

function resolveNonOverlapX(
  candidateX: number,
  movingUnitId: string,
  generation: number,
  units: Array<{ id: string; generation: number }>,
  positions: Record<string, { x: number; y: number }>
): number {
  const blocked = units
    .filter((unit) => unit.id !== movingUnitId && unit.generation === generation)
    .map((unit) => positions[unit.id]?.x)
    .filter((x): x is number => typeof x === "number")
    .sort((a, b) => a - b);

  if (blocked.length === 0) return candidateX;

  const minDistance = UNIT_CARD_WIDTH + UNIT_CARD_MIN_GAP;
  const intersects = (x: number) => blocked.some((bx) => Math.abs(x - bx) < minDistance);
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

function toLegacyRelationType(type: typeof REL_PARENT_CHILD | typeof REL_SIBLING): RelationType {
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
  const nodePositions = useFamilyStore((s) => s.nodePositions);
  const setNodePosition = useFamilyStore((s) => s.setNodePosition);
  const swapUnitPartners = useFamilyStore((s) => s.swapUnitPartners);
  const addUnitRelation = useFamilyStore((s) => s.addUnitRelation);
  const reconnectUnitRelation = useFamilyStore((s) => s.reconnectUnitRelation);
  const deleteUnitRelation = useFamilyStore((s) => s.deleteUnitRelation);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingUnitConnection>(null);
  const [pendingRelationType, setPendingRelationType] = useState<typeof REL_PARENT_CHILD | typeof REL_SIBLING>(
    REL_PARENT_CHILD
  );
  const [connectMessage, setConnectMessage] = useState("");

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const memberGenerationMap = useMemo(() => new Map(members.map((m) => [m.id, m.generation ?? 99])), [members]);

  const unitMemberRows = useMemo(() => {
    const map = new Map<string, Array<{ memberId: string; role: "single" | "partner1" | "partner2" }>>();
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
      map.set(unitId, rows.map((row) => row.memberId));
    }
    return map;
  }, [unitMemberRows]);

  const normalizedUnits = useMemo(
    () =>
      units.map((u) => ({
        id: u.id,
        name: u.name,
        generation: unitGeneration(u.id, u.generation, unitMemberIds, memberGenerationMap)
      })),
    [units, unitMemberIds, memberGenerationMap]
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
    if (focusUnitId && units.some((u) => u.id === focusUnitId)) return focusUnitId;
    return units[0]?.id ?? null;
  }, [focusUnitId, units]);

  const visibleUnitIds = useMemo(() => {
    if (viewMode === "overview") return new Set(units.map((u) => u.id));
    if (!effectiveFocusUnitId) return new Set<string>();
    const focusNeighborhood = () => {
      const visited = new Set<string>([effectiveFocusUnitId]);
      const queue: Array<{ id: string; depth: number }> = [{ id: effectiveFocusUnitId, depth: 0 }];
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

    const focusParents = [...(childToParents.get(effectiveFocusUnitId) ?? new Set<string>())];
    if (focusParents.length === 0) return focusNeighborhood();

    const unitNameIncludes = (unitId: string, keywords: string[]) => {
      const rows = unitMemberRows.get(unitId) ?? [];
      return rows.some((row) => {
        const memberName = memberMap.get(row.memberId)?.name ?? "";
        return keywords.some((keyword) => memberName.includes(keyword));
      });
    };

    const paternalKeys = ["爸", "父", "爷", "伯", "叔", "姑"];
    const maternalKeys = ["妈", "母", "外", "舅", "姨", "姐"];
    const rootId =
      (viewMode === "paternal"
        ? focusParents.find((id) => unitNameIncludes(id, paternalKeys))
        : focusParents.find((id) => unitNameIncludes(id, maternalKeys))) ?? focusParents[0];

    const visited = new Set<string>([rootId, effectiveFocusUnitId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const children = parentToChildren.get(current) ?? new Set<string>();
      for (const child of children) {
        if (visited.has(child)) continue;
        visited.add(child);
        queue.push(child);
      }
      const parents = childToParents.get(current) ?? new Set<string>();
      for (const parent of parents) {
        if (visited.has(parent)) continue;
        visited.add(parent);
        queue.push(parent);
      }
      const siblingCandidates = neighbors.get(current) ?? new Set<string>();
      for (const siblingId of siblingCandidates) {
        const hasSiblingRelation = unitRelations.some(
          (relation) =>
            relation.relationType === REL_SIBLING &&
            ((relation.fromUnitId === current && relation.toUnitId === siblingId) ||
              (relation.toUnitId === current && relation.fromUnitId === siblingId))
        );
        if (!hasSiblingRelation) continue;
        if (visited.has(siblingId)) continue;
        visited.add(siblingId);
        queue.push(siblingId);
      }
    }
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
    unitRelations
  ]);

  const visibleUnits = useMemo(() => normalizedUnits.filter((u) => visibleUnitIds.has(u.id)), [normalizedUnits, visibleUnitIds]);

  const visibleRelations = useMemo(
    () =>
      unitRelations.filter((r) => {
        if (!visibleUnitIds.has(r.fromUnitId) || !visibleUnitIds.has(r.toUnitId)) return false;
        if (r.relationType === REL_PARENT_CHILD) return showParentChildLines;
        if (r.relationType === REL_SIBLING) return showSiblingLines;
        return false;
      }),
    [unitRelations, visibleUnitIds, showParentChildLines, showSiblingLines]
  );

  const autoPositions = useMemo(() => {
    const compact = viewMode === "overview" ? { xGap: 360, yGap: 260 } : { xGap: 320, yGap: 260 };
    return calculateUnitLayout(visibleUnits, compact.xGap, compact.yGap);
  }, [visibleUnits, viewMode]);

  const positions = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const unit of visibleUnits) {
      const key = `unit:${unit.id}`;
      const fromStore = viewMode === "overview" ? nodePositions[key] : undefined;
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
          style: { background: "transparent", border: "none", boxShadow: "none", padding: 0 },
          data: {
            label: (
              <div className="generation-strip ink-fade">
                <div className="generation-strip-seal">谱</div>
                <div className="generation-strip-text">第 {generation} 代</div>
              </div>
            )
          }
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
        style: { background: "transparent", border: "none", boxShadow: "none", padding: 0 },
        data: {
          members: membersInUnit,
          selectedMemberId,
          onSelectMember: (memberId: string) => {
            setSelectedMemberId(memberId);
            setSelectedUnitId(unit.id);
            setFocusUnitId(unit.id);
            setSelectedEdgeId(null);
          },
          canSwap: unitRows.filter((row) => row.role === "partner1" || row.role === "partner2").length === 2,
          onSwap: () => swapUnitPartners(unit.id)
        }
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
    swapUnitPartners,
    selectedMemberId,
    setSelectedMemberId,
    setSelectedUnitId,
    setFocusUnitId
  ]);

  const edges = useMemo<Edge[]>(() => {
    return visibleRelations.map((rel, idx) => {
      const handles = pickHandles(rel.fromUnitId, rel.toUnitId, positions);
      const relationType = toLegacyRelationType(rel.relationType);
      const style =
        relationType === "sibling"
          ? { stroke: "#6D6255", strokeWidth: 1.7, strokeDasharray: "2 5", strokeLinecap: "round" }
          : { stroke: "#4D4235", strokeWidth: 1.45, strokeLinecap: "round" };
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
        interactionWidth: 44,
        markerEnd: relationType === "parent" ? { type: MarkerType.ArrowClosed, color: "#4D4235" } : undefined,
        style,
        data: { relationType, lane: (idx % 3) - 1 }
      } as Edge;
    });
  }, [visibleRelations, positions, selectedEdgeId]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (node.id.startsWith("gen-label-")) return;
    setSelectedUnitId(node.id);
    setFocusUnitId(node.id);
    const firstMemberId = (unitMemberRows.get(node.id) ?? [])[0]?.memberId ?? null;
    if (firstMemberId) {
      setSelectedMemberId(firstMemberId);
    }
    setSelectedEdgeId(null);
  };

  const handleConnect = (connection: Connection) => {
    if (readOnly) return;
    const source = connection.source;
    const target = connection.target;
    if (!source || !target) return;
    setPendingConnection({ source, target });
    setPendingRelationType(REL_PARENT_CHILD);
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
      toUnitId: target
    });
    if (!result.ok) {
      setConnectMessage(result.reason);
      return;
    }
    setConnectMessage("");
    setSelectedEdgeId(oldEdge.id);
  };

  const submitPendingConnection = () => {
    if (!pendingConnection) return;
    const result = addUnitRelation({
      fromUnitId: pendingConnection.source,
      toUnitId: pendingConnection.target,
      relationType: pendingRelationType
    });
    if (!result.ok) {
      setConnectMessage(result.reason);
      return;
    }
    setPendingConnection(null);
    setConnectMessage("");
  };

  const handleConnectEnd = () => {
    if (!pendingConnection) {
      setConnectMessage("");
    }
  };

  const handleNodeDragStop = (_event: ReactMouseEvent<Element, MouseEvent>, node: Node) => {
    if (viewMode !== "overview") return;
    if (node.id.startsWith("gen-label-")) return;
    const unit = visibleUnits.find((u) => u.id === node.id);
    if (!unit) return;
    const lockedY = generationYMap.get(unit.generation);
    const nextX = resolveNonOverlapX(node.position.x, unit.id, unit.generation, visibleUnits, positions);
    if (typeof lockedY === "number") {
      node.position = { x: nextX, y: lockedY };
    } else {
      node.position = { ...node.position, x: nextX };
    }
    setNodePosition(`unit:${node.id}`, node.position);
  };

  const handleNodeDrag = (_event: ReactMouseEvent<Element, MouseEvent>, node: Node) => {
    if (viewMode !== "overview") return;
    if (node.id.startsWith("gen-label-")) return;
    const unit = visibleUnits.find((u) => u.id === node.id);
    if (!unit) return;
    const lockedY = generationYMap.get(unit.generation);
    const nextX = resolveNonOverlapX(node.position.x, unit.id, unit.generation, visibleUnits, positions);
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
    reactFlowInstance.setCenter(node.position.x + 140, node.position.y + 70, { zoom: 0.9, duration: 250 });
  }, [reactFlowInstance, selectedUnitId, nodes]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (visibleRelations.some((relation) => relation.id === selectedEdgeId)) return;
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
          setPendingConnection(null);
          setConnectMessage("");
        }}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onReconnect={handleReconnect}
        reconnectRadius={36}
        connectionRadius={36}
        nodesDraggable={!readOnly && viewMode === "overview"}
        nodesConnectable={!readOnly}
        edgesReconnectable={!readOnly}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={false}
        onlyRenderVisibleElements
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
            删除该关系
          </button>
        </div>
      )}

      {pendingConnection && !readOnly && (
        <div className="panel-reveal absolute right-4 top-4 z-20 w-72 rounded border border-bronze/55 bg-parchment p-3 shadow-panel-soft">
          <p className="mb-2 text-sm text-ink">选择新关系类型</p>
          <select
            value={pendingRelationType}
            onChange={(event) => setPendingRelationType(event.target.value as typeof REL_PARENT_CHILD | typeof REL_SIBLING)}
            className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-2 text-sm text-ink outline-none focus:border-cinnabar"
          >
            {Object.entries(unitRelationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {connectMessage && <p className="mt-2 text-xs text-cinnabar">{connectMessage}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="tool-btn text-center" onClick={submitPendingConnection}>
              确认
            </button>
            <button
              className="tool-btn text-center"
              onClick={() => {
                setPendingConnection(null);
                setConnectMessage("");
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
