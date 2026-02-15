import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Member } from "../../types/family";

type MemberNodeData = {
  member: Member;
};

function NodeHandle({ position, id }: { position: Position; id: string }) {
  return (
    <Handle
      id={id}
      type="source"
      position={position}
      className="member-handle"
      style={{ background: "#6f6558" }}
    />
  );
}

function TargetHandle({ position, id }: { position: Position; id: string }) {
  return (
    <Handle
      id={id}
      type="target"
      position={position}
      className="member-handle"
      style={{ background: "#6f6558" }}
    />
  );
}

export function MemberNode({ data, selected }: NodeProps) {
  const nodeData = data as MemberNodeData;
  const member = nodeData.member;

  return (
    <div className={`node-card ink-fade w-[190px] rounded p-3 text-center ${selected ? "is-selected" : ""}`}>
      <TargetHandle id="t-top" position={Position.Top} />
      <TargetHandle id="t-right" position={Position.Right} />
      <TargetHandle id="t-bottom" position={Position.Bottom} />
      <TargetHandle id="t-left" position={Position.Left} />

      <NodeHandle id="s-top" position={Position.Top} />
      <NodeHandle id="s-right" position={Position.Right} />
      <NodeHandle id="s-bottom" position={Position.Bottom} />
      <NodeHandle id="s-left" position={Position.Left} />

      <div className="mb-2 flex justify-center">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="node-avatar-ring h-20 w-20 rounded-full border border-bronze/50 object-cover"
          />
        ) : (
          <div className="node-avatar-ring flex h-20 w-20 items-center justify-center rounded-full border border-bronze/50 bg-[#e7dcc5] text-sm text-soot">
            照片
          </div>
        )}
      </div>
      <div className="font-serifCn text-lg tracking-wide text-ink">{member.name}</div>
    </div>
  );
}
