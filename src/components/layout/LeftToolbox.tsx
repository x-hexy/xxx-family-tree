import { useFamilyStore } from "../../store/useFamilyStore";

export function LeftToolbox() {
  const startCreateMember = useFamilyStore((s) => s.startCreateMember);
  const startCreateRelationship = useFamilyStore((s) => s.startCreateRelationship);
  const startDeleteRelationship = useFamilyStore((s) => s.startDeleteRelationship);
  const triggerAutoArrange = useFamilyStore((s) => s.triggerAutoArrange);

  return (
    <aside className="scroll-frame w-56 border-r border-bronze/35 bg-[#efe5cf]/80 p-4">
      <h2 className="mb-3 font-serifCn text-sm tracking-[0.14em] text-ink">编辑工具</h2>
      <div className="space-y-2">
        <button className="tool-btn" onClick={startCreateMember}>
          新增成员
        </button>
        <button className="tool-btn" onClick={startCreateRelationship}>
          建立关系
        </button>
        <button className="tool-btn" onClick={startDeleteRelationship}>
          删除关系
        </button>
      </div>
      <h3 className="mb-2 mt-6 font-serifCn text-sm tracking-[0.14em] text-ink">视图筛选</h3>
      <div className="space-y-2">
        <button className="tool-btn">按代际筛选</button>
        <button className="tool-btn">按分支筛选</button>
        <button className="tool-btn" onClick={triggerAutoArrange}>
          自动整理
        </button>
      </div>
    </aside>
  );
}
