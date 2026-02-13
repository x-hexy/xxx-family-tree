import { useEffect, useMemo, useState } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance
} from "@xyflow/react";
import { useFamilyStore } from "../../store/useFamilyStore";
import type { Member, Relationship } from "../../types/family";

type FamilyGraphProps = {
  readOnly?: boolean;
};

type LayoutNodeKind = "member" | "family";
type LayoutEdgeKind = "parent" | "child" | "parent_to_family" | "family_to_child" | "spouse" | "sibling";

type LayoutNodeMeta = {
  id: string;
  kind: LayoutNodeKind;
  member?: Member;
  generation?: number;
};

type LayoutEdgeMeta = {
  id: string;
  source: string;
  target: string;
  kind: LayoutEdgeKind;
};

type BuiltGraph = {
  metaMap: Map<string, LayoutNodeMeta>;
  layoutNodes: Array<{ id: string; width: number; height: number }>;
  layoutEdges: Array<{ id: string; sources: string[]; targets: string[] }>;
  renderEdges: LayoutEdgeMeta[];
};

const elk = new ELK();

function uniq<T>(list: T[]): T[] {
  return [...new Set(list)];
}

function buildLayoutGraph(members: Member[], relationships: Relationship[]): BuiltGraph {
  const metaMap = new Map<string, LayoutNodeMeta>();
  const layoutNodes: Array<{ id: string; width: number; height: number }> = [];
  const layoutEdges: Array<{ id: string; sources: string[]; targets: string[] }> = [];
  const renderEdges: LayoutEdgeMeta[] = [];

  const memberById = new Map(members.map((member) => [member.id, member]));

  for (const member of members) {
    metaMap.set(member.id, {
      id: member.id,
      kind: "member",
      member,
      generation: member.generation
    });
    layoutNodes.push({ id: member.id, width: 190, height: 150 });
  }

  const rawParentLinks: Array<{ parentId: string; childId: string }> = [];
  const spouseLinks: LayoutEdgeMeta[] = [];
  const siblingLinks: LayoutEdgeMeta[] = [];

  for (const relation of relationships) {
    if (relation.relationType === "parent") {
      rawParentLinks.push({ parentId: relation.fromMemberId, childId: relation.toMemberId });
      continue;
    }
    if (relation.relationType === "child") {
      rawParentLinks.push({ parentId: relation.toMemberId, childId: relation.fromMemberId });
      continue;
    }
    if (relation.relationType === "spouse") {
      spouseLinks.push({
        id: relation.id,
        source: relation.fromMemberId,
        target: relation.toMemberId,
        kind: "spouse"
      });
      continue;
    }
    if (relation.relationType === "sibling") {
      siblingLinks.push({
        id: relation.id,
        source: relation.fromMemberId,
        target: relation.toMemberId,
        kind: "sibling"
      });
    }
  }

  const parentLinks = rawParentLinks.filter(
    (link) => memberById.has(link.parentId) && memberById.has(link.childId) && link.parentId !== link.childId
  );

  const parentsByChild = new Map<string, string[]>();
  for (const link of parentLinks) {
    const parents = parentsByChild.get(link.childId) ?? [];
    parents.push(link.parentId);
    parentsByChild.set(link.childId, parents);
  }

  const createdParentFamily = new Set<string>();

  for (const [childId, parentIdsRaw] of parentsByChild.entries()) {
    const parentIds = uniq(parentIdsRaw).sort();
    if (parentIds.length >= 2) {
      const familyId = `family:${parentIds.join("|")}`;
      if (!metaMap.has(familyId)) {
        const parentGenerations = parentIds
          .map((id) => memberById.get(id)?.generation)
          .filter((v): v is number => typeof v === "number");
        const generation =
          parentGenerations.length > 0 ? Math.min(...parentGenerations) : memberById.get(childId)?.generation;

        metaMap.set(familyId, { id: familyId, kind: "family", generation });
        layoutNodes.push({ id: familyId, width: 28, height: 28 });
      }

      for (const parentId of parentIds) {
        const key = `${parentId}->${familyId}`;
        if (createdParentFamily.has(key)) continue;
        createdParentFamily.add(key);
        const edgeId = `pf:${parentId}:${familyId}`;
        layoutEdges.push({ id: edgeId, sources: [parentId], targets: [familyId] });
        renderEdges.push({
          id: edgeId,
          source: parentId,
          target: familyId,
          kind: "parent_to_family"
        });
      }

      const familyChildId = `fc:${familyId}:${childId}`;
      layoutEdges.push({ id: familyChildId, sources: [familyId], targets: [childId] });
      renderEdges.push({
        id: familyChildId,
        source: familyId,
        target: childId,
        kind: "family_to_child"
      });
      continue;
    }

    if (parentIds.length === 1) {
      const edgeId = `pc:${parentIds[0]}:${childId}`;
      layoutEdges.push({ id: edgeId, sources: [parentIds[0]], targets: [childId] });
      renderEdges.push({ id: edgeId, source: parentIds[0], target: childId, kind: "child" });
    }
  }

  for (const edge of [...spouseLinks, ...siblingLinks]) {
    if (!metaMap.has(edge.source) || !metaMap.has(edge.target) || edge.source === edge.target) continue;
    renderEdges.push(edge);
  }

  return { metaMap, layoutNodes, layoutEdges, renderEdges };
}

function edgeFromKind(edge: LayoutEdgeMeta): Edge {
  if (edge.kind === "spouse") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      markerEnd: undefined,
      style: {
        stroke: "#8C6A37",
        strokeWidth: 1.9,
        strokeDasharray: "7 4",
        strokeLinecap: "round"
      }
    };
  }

  if (edge.kind === "sibling") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      markerEnd: undefined,
      style: {
        stroke: "#6D6255",
        strokeWidth: 1.7,
        strokeDasharray: "2 5",
        strokeLinecap: "round"
      }
    };
  }

  if (edge.kind === "parent_to_family") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "step",
      markerEnd: undefined,
      style: { stroke: "#5A4C3B", strokeWidth: 1.35, strokeLinecap: "round" }
    };
  }

  if (edge.kind === "family_to_child") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "step",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#4D4235" },
      style: { stroke: "#4D4235", strokeWidth: 1.45, strokeLinecap: "round" }
    };
  }

  if (edge.kind === "child") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#5E554A" },
      style: { stroke: "#5E554A", strokeWidth: 1.35, strokeLinecap: "round" }
    };
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#4D4235" },
      style: { stroke: "#4D4235", strokeWidth: 1.55, strokeLinecap: "round" }
    };
}

export function FamilyGraph({ readOnly = false }: FamilyGraphProps) {
  const members = useFamilyStore((s) => s.members);
  const relationships = useFamilyStore((s) => s.relationships);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  const setSelectedMemberId = useFamilyStore((s) => s.setSelectedMemberId);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<Node[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>([]);

  const graphInput = useMemo(() => buildLayoutGraph(members, relationships), [members, relationships]);

  useEffect(() => {
    let cancelled = false;

    const runLayout = async () => {
      const elkGraph = {
        id: "family-root",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.layered.spacing.nodeNodeBetweenLayers": "120",
          "elk.spacing.nodeNode": "90",
          "elk.edgeRouting": "ORTHOGONAL",
          "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
          "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
          "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
          "elk.layered.thoroughness": "8"
        },
        children: graphInput.layoutNodes,
        edges: graphInput.layoutEdges
      };

      const result = await elk.layout(elkGraph);
      if (cancelled) return;

      const positionMap = new Map<string, { x: number; y: number }>();
      for (const node of result.children ?? []) {
        positionMap.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
      }

      // Snap same-generation members onto the same horizontal layer.
      const generationToMemberIds = new Map<number, string[]>();
      for (const member of members) {
        const generation = member.generation ?? 99;
        const group = generationToMemberIds.get(generation) ?? [];
        group.push(member.id);
        generationToMemberIds.set(generation, group);
      }

      const sortedGenerations = [...generationToMemberIds.keys()].sort((a, b) => a - b);
      const generationBaseYs = sortedGenerations
        .map((generation) => {
          const ids = generationToMemberIds.get(generation) ?? [];
          const ys = ids
            .map((id) => positionMap.get(id)?.y)
            .filter((value): value is number => typeof value === "number");
          if (ys.length === 0) return 0;
          return ys.reduce((sum, y) => sum + y, 0) / ys.length;
        })
        .filter((y) => y !== 0);

      const topLayerY = generationBaseYs.length > 0 ? Math.min(...generationBaseYs) : 60;
      const layerGap = 260;
      const generationToSnappedY = new Map<number, number>();
      sortedGenerations.forEach((generation, index) => {
        generationToSnappedY.set(generation, topLayerY + index * layerGap);
      });

      for (const member of members) {
        const generation = member.generation ?? 99;
        const snappedY = generationToSnappedY.get(generation);
        if (snappedY === undefined) continue;
        const current = positionMap.get(member.id);
        if (!current) continue;
        positionMap.set(member.id, { x: current.x, y: snappedY });
      }

      // Place family hub nodes between parent layer and child layer.
      const parentLinks = graphInput.renderEdges.filter((edge) => edge.kind === "parent_to_family");
      const childLinks = graphInput.renderEdges.filter((edge) => edge.kind === "family_to_child");
      const familyToParents = new Map<string, string[]>();
      const familyToChildren = new Map<string, string[]>();

      for (const edge of parentLinks) {
        const list = familyToParents.get(edge.target) ?? [];
        list.push(edge.source);
        familyToParents.set(edge.target, list);
      }

      for (const edge of childLinks) {
        const list = familyToChildren.get(edge.source) ?? [];
        list.push(edge.target);
        familyToChildren.set(edge.source, list);
      }

      for (const [nodeId, meta] of graphInput.metaMap.entries()) {
        if (meta.kind !== "family") continue;
        const current = positionMap.get(nodeId);
        if (!current) continue;

        const parents = familyToParents.get(nodeId) ?? [];
        const children = familyToChildren.get(nodeId) ?? [];
        const parentYs = parents
          .map((id) => positionMap.get(id)?.y)
          .filter((value): value is number => typeof value === "number");
        const childYs = children
          .map((id) => positionMap.get(id)?.y)
          .filter((value): value is number => typeof value === "number");

        if (parentYs.length > 0 && childYs.length > 0) {
          const parentY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
          const childY = childYs.reduce((sum, y) => sum + y, 0) / childYs.length;
          positionMap.set(nodeId, { x: current.x, y: (parentY + childY) / 2 });
        }
      }

      const memberNodes: Node[] = [];
      const byGeneration = new Map<number, Array<{ x: number; y: number }>>();

      for (const [nodeId, meta] of graphInput.metaMap.entries()) {
        const pos = positionMap.get(nodeId);
        if (!pos) continue;

        if (meta.kind === "family") {
          memberNodes.push({
            id: nodeId,
            position: pos,
            style: { background: "transparent", border: "none", boxShadow: "none", padding: 0 },
            draggable: false,
            selectable: false,
            connectable: false,
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: {
              label: (
                <div className="family-hub-node ink-fade">
                  <span className="family-hub-dot" />
                </div>
              )
            }
          });
          continue;
        }

        const member = meta.member;
        if (!member) continue;
        const isSelected = selectedMemberId === member.id;
        const gen = member.generation ?? 99;
        const points = byGeneration.get(gen) ?? [];
        points.push(pos);
        byGeneration.set(gen, points);

        memberNodes.push({
          id: member.id,
          position: pos,
          style: { background: "transparent", border: "none", boxShadow: "none", padding: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          draggable: !readOnly,
          data: {
            label: (
              <div className={`node-card ink-fade w-[190px] rounded p-3 text-center ${isSelected ? "is-selected" : ""}`}>
                <div className="mb-2 flex justify-center">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="node-avatar-ring h-14 w-14 rounded-full border border-bronze/50 object-cover"
                    />
                  ) : (
                    <div className="node-avatar-ring flex h-14 w-14 items-center justify-center rounded-full border border-bronze/50 bg-[#e7dcc5] text-xs text-soot">
                      照片
                    </div>
                  )}
                </div>
                <div className="font-serifCn text-lg tracking-wide text-ink">{member.name}</div>
                <div className="mt-1 text-xs tracking-wider text-soot">第 {member.generation ?? "?"} 代</div>
              </div>
            )
          }
        });
      }

      const generationNodes: Node[] = [];
      for (const [generation, points] of byGeneration.entries()) {
        if (points.length === 0 || generation === 99) continue;
        const minX = Math.min(...points.map((p) => p.x));
        const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        generationNodes.push({
          id: `gen-label-${generation}`,
          position: { x: minX - 160, y: avgY + 50 },
          style: { background: "transparent", border: "none", boxShadow: "none", padding: 0 },
          draggable: false,
          selectable: false,
          connectable: false,
          data: {
            label: (
              <div className="generation-strip ink-fade">
                <div className="generation-strip-seal">谱</div>
                <div className="generation-strip-text">第 {generation} 代</div>
              </div>
            )
          }
        });
      }

      setLayoutNodes([...generationNodes, ...memberNodes]);
      setLayoutEdges(graphInput.renderEdges.map((edge) => edgeFromKind(edge)));
    };

    void runLayout();
    return () => {
      cancelled = true;
    };
  }, [graphInput, readOnly, selectedMemberId]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (node.id.startsWith("family:") || node.id.startsWith("gen-label-")) return;
    setSelectedMemberId(node.id);
  };

  useEffect(() => {
    if (!reactFlowInstance || !selectedMemberId) return;
    const selectedNode = layoutNodes.find((node) => node.id === selectedMemberId);
    if (!selectedNode) return;
    reactFlowInstance.setCenter(selectedNode.position.x + 95, selectedNode.position.y + 75, {
      zoom: 0.92,
      duration: 450
    });
  }, [reactFlowInstance, selectedMemberId, layoutNodes]);

  return (
    <div className="relative h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),_rgba(243,235,216,0.9))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_28%,transparent_72%,rgba(118,88,46,0.06))]" />
      <ReactFlow
        nodes={layoutNodes}
        edges={layoutEdges}
        fitView
        minZoom={0.35}
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        nodesDraggable={!readOnly}
        elementsSelectable
      >
        <Background gap={20} size={1.1} color="#d2c4a8" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
