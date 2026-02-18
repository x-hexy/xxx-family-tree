import { BaseEdge, type EdgeProps } from "@xyflow/react";
import type { RelationType } from "../../types/family";

type EdgeData = {
  relationType: RelationType;
  bundleIndex?: number;
  bundleTotal?: number;
};

// 垂直贝塞尔曲线路径，带线条捆绑效果（所有关系统一从上到下）
function getBundledPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  bundleIndex: number,
  bundleTotal: number,
): string {
  const maxSpread = bundleTotal > 1 ? Math.min(bundleTotal * 12, 60) : 0;
  const offset =
    bundleTotal > 1
      ? (bundleIndex - (bundleTotal - 1) / 2) * (maxSpread / (bundleTotal - 1))
      : 0;

  const distance = Math.abs(targetY - sourceY);
  const controlPointY1 = sourceY + distance * 0.3;
  const controlPointY2 = targetY - distance * 0.3;

  return `M ${sourceX},${sourceY}
          L ${sourceX},${controlPointY1}
          Q ${sourceX},${controlPointY1 + 20} ${sourceX + offset},${controlPointY1 + 20}
          L ${targetX + offset * 0.5},${controlPointY2 - 20}
          Q ${targetX},${controlPointY2 - 20} ${targetX},${controlPointY2}
          L ${targetX},${targetY}`;
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data as EdgeData | undefined) ?? {};
  const bundleIndex = edgeData.bundleIndex ?? 0;
  const bundleTotal = edgeData.bundleTotal ?? 1;

  const edgeStyle = {
    ...(style ?? {}),
    ...(selected
      ? {
          strokeWidth:
            Number(
              (style as { strokeWidth?: number } | undefined)?.strokeWidth ?? 2,
            ) + 1.5,
          filter: "drop-shadow(0 0 6px rgba(166,58,46,0.75))",
        }
      : {}),
  };

  const path = getBundledPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    bundleIndex,
    bundleTotal,
  );

  return (
    <BaseEdge id={id} path={path} markerEnd={markerEnd} style={edgeStyle} />
  );
}
