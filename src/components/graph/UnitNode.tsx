import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Member } from "../../types/family";

type UnitNodeData = {
  members: Member[];
  selectedMemberId?: string | null;
  isHovered?: boolean;
  onSelectMember?: (memberId: string) => void;
  onHover?: (isHovering: boolean) => void;
};

// 根据中文名推断性别：女性关键字返回 "F"，否则 "M"
const FEMALE_KEYS = ["奶", "婆", "妈", "母", "姑", "姨", "姐", "妹", "嫂", "妻", "老婆", "女儿", "女"];
function inferGender(member: Member): "M" | "F" {
  const name = member.name;
  const id = member.id;
  if (id.endsWith("_wife") || id.includes("_wife_")) return "F";
  if (id.endsWith("_husband") || id.includes("_husband_")) return "M";
  if (id.endsWith("_daughter")) return "F";
  if (id.endsWith("_son")) return "M";
  for (const key of FEMALE_KEYS) {
    if (name.includes(key)) return "F";
  }
  return "M";
}

// 排序成员：男左女右；同性别保持原序
function sortMaleFemale(members: Member[]): Member[] {
  if (members.length <= 1) return members;
  const males = members.filter((m) => inferGender(m) === "M");
  const females = members.filter((m) => inferGender(m) === "F");
  return [...males, ...females];
}

function MemberAvatar({ member }: { member: Member }) {
  return member.avatarUrl ? (
    <img
      src={member.avatarUrl}
      alt={member.name}
      className="node-avatar-ring h-20 w-20 rounded-full border-2 border-bronze/60 object-cover transition-transform duration-200 hover:scale-110"
    />
  ) : (
    <div className="node-avatar-ring flex h-20 w-20 items-center justify-center rounded-full border-2 border-bronze/50 bg-[#e7dcc5] text-sm text-soot">
      照片
    </div>
  );
}

// 只保留上下2个锚点
function renderHandles() {
  return (
    <>
      <Handle
        id="t-top"
        type="target"
        position={Position.Top}
        className="member-handle member-handle--top"
        style={{ left: "50%" }}
      />
      <Handle
        id="s-bottom"
        type="source"
        position={Position.Bottom}
        className="member-handle member-handle--bottom"
        style={{ left: "50%" }}
      />
    </>
  );
}

export function UnitNode({ data, selected }: NodeProps) {
  const nodeData = data as UnitNodeData;
  const members = sortMaleFemale(nodeData.members);
  const isHovered = Boolean(nodeData.isHovered);

  return (
    <div
      className={`node-card ink-fade relative w-[300px] rounded p-3 ${selected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""}`}
      onMouseEnter={() => nodeData.onHover?.(true)}
      onMouseLeave={() => nodeData.onHover?.(false)}
    >
      {renderHandles()}
      <div
        className={`grid gap-4 ${members.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {members.map((member) => (
          <button
            key={member.id}
            className="flex flex-col items-center text-center"
            onClick={(event) => {
              event.stopPropagation();
              nodeData.onSelectMember?.(member.id);
            }}
          >
            <div className="mb-2 flex h-24 items-center justify-center">
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
            <div className="font-serifCn text-2xl leading-tight tracking-wide text-ink">
              {member.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
