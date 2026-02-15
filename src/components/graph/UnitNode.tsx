import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Member } from "../../types/family";

type UnitNodeData = {
  members: Member[];
  selectedMemberId?: string | null;
  onSelectMember?: (memberId: string) => void;
  canSwap?: boolean;
  onSwap?: () => void;
};

function MemberAvatar({ member }: { member: Member }) {
  return member.avatarUrl ? (
    <img
      src={member.avatarUrl}
      alt={member.name}
      className="node-avatar-ring h-14 w-14 rounded-full border border-bronze/50 object-cover"
    />
  ) : (
    <div className="node-avatar-ring flex h-14 w-14 items-center justify-center rounded-full border border-bronze/50 bg-[#e7dcc5] text-xs text-soot">
      照片
    </div>
  );
}

export function UnitNode({ data, selected }: NodeProps) {
  const nodeData = data as UnitNodeData;
  const members = nodeData.members;
  const canSwap = Boolean(nodeData.canSwap && typeof nodeData.onSwap === "function");
  return (
    <div className={`node-card ink-fade relative w-[300px] rounded p-3 ${selected ? "is-selected" : ""}`}>
      <Handle id="t-top" type="target" position={Position.Top} className="member-handle" />
      <Handle id="t-right" type="target" position={Position.Right} className="member-handle" />
      <Handle id="t-bottom" type="target" position={Position.Bottom} className="member-handle" />
      <Handle id="t-left" type="target" position={Position.Left} className="member-handle" />
      <Handle id="s-top" type="source" position={Position.Top} className="member-handle" />
      <Handle id="s-right" type="source" position={Position.Right} className="member-handle" />
      <Handle id="s-bottom" type="source" position={Position.Bottom} className="member-handle" />
      <Handle id="s-left" type="source" position={Position.Left} className="member-handle" />
      {canSwap && (
        <button
          className="absolute right-2 top-2 rounded border border-bronze/40 bg-[#f8f1df] px-2 py-1 text-xs text-soot hover:border-cinnabar hover:text-cinnabar"
          onClick={(event) => {
            event.stopPropagation();
            nodeData.onSwap?.();
          }}
          title="夫妻位置互换"
        >
          互换
        </button>
      )}
      <div className={`grid gap-4 ${members.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {members.map((member) => (
          <button
            key={member.id}
            className="text-center"
            onClick={(event) => {
              event.stopPropagation();
              nodeData.onSelectMember?.(member.id);
            }}
          >
            <div className="mb-2 flex justify-center">
              <div
                className={
                  nodeData.selectedMemberId === member.id
                    ? "rounded-full ring-2 ring-cinnabar/70 ring-offset-2 ring-offset-parchment"
                    : ""
                }
              >
                <MemberAvatar member={member} />
              </div>
            </div>
            <div className="font-serifCn text-2xl tracking-wide text-ink">{member.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
