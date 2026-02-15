import { BaseEdge, getBezierPath, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import type { RelationType } from "../../types/family";

type EdgeData = {
  relationType: RelationType;
  lane: number;
};

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected
}: EdgeProps) {
  const relationType = ((data as EdgeData | undefined)?.relationType ?? "parent") as RelationType;
  const lane = (data as EdgeData | undefined)?.lane ?? 0;

  const laneShift = lane * 34;

  const edgeStyle = {
    ...(style ?? {}),
    ...(selected
      ? {
          strokeWidth: Number((style as { strokeWidth?: number } | undefined)?.strokeWidth ?? 1.6) + 1.2,
          filter: "drop-shadow(0 0 4px rgba(166,58,46,0.55))"
        }
      : {})
  };

  if (relationType === "spouse" || relationType === "sibling") {
    const curvatureBase = relationType === "spouse" ? 0.3 : 0.24;
    const [path] = getBezierPath({
      sourceX: sourceX + laneShift * 0.15,
      sourceY,
      targetX: targetX - laneShift * 0.15,
      targetY,
      sourcePosition,
      targetPosition,
      curvature: curvatureBase + Math.abs(lane) * 0.06
    });
    return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={edgeStyle} />;
  }

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 20,
    centerX: (sourceX + targetX) / 2 + laneShift,
    offset: 20 + Math.abs(lane) * 8
  });

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={edgeStyle} />;
}
