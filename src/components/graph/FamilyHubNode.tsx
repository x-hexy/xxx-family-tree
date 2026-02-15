import { Handle, Position, type NodeProps } from "@xyflow/react";

export function FamilyHubNode(_props: NodeProps) {
  return (
    <div className="family-hub-node ink-fade">
      <Handle id="t-top" type="target" position={Position.Top} className="member-handle" style={{ opacity: 0 }} />
      <Handle
        id="s-bottom"
        type="source"
        position={Position.Bottom}
        className="member-handle"
        style={{ opacity: 0 }}
      />
      <span className="family-hub-dot" />
    </div>
  );
}

