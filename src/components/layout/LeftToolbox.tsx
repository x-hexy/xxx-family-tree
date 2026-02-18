import { useMemo, useState } from "react";
import { useFamilyStore } from "../../store/useFamilyStore";

const GENERATION_LABELS: Record<number, string> = {
  1: "第1代 祖辈",
  2: "第2代 父母辈",
  3: "第3代 同辈",
  4: "第4代 下一辈",
};

export function LeftToolbox() {
  const startCreateMember = useFamilyStore((s) => s.startCreateMember);
  const startCreateRelationship = useFamilyStore(
    (s) => s.startCreateRelationship,
  );
  const startDeleteRelationship = useFamilyStore(
    (s) => s.startDeleteRelationship,
  );
  const triggerAutoArrange = useFamilyStore((s) => s.triggerAutoArrange);
  const viewMode = useFamilyStore((s) => s.viewMode);
  const setViewMode = useFamilyStore((s) => s.setViewMode);
  const filterGenerations = useFamilyStore((s) => s.filterGenerations);
  const setFilterGenerations = useFamilyStore((s) => s.setFilterGenerations);
  const units = useFamilyStore((s) => s.units);
  const members = useFamilyStore((s) => s.members);

  const [showGenFilter, setShowGenFilter] = useState(false);

  // 提取数据中实际存在的代际
  const availableGenerations = useMemo(() => {
    const gens = new Set<number>();
    for (const u of units) {
      if (typeof u.generation === "number") gens.add(u.generation);
    }
    // 也从 members 中获取代际
    for (const m of members) {
      if (typeof m.generation === "number") gens.add(m.generation);
    }
    return [...gens].sort((a, b) => a - b);
  }, [units, members]);

  const toggleGeneration = (gen: number) => {
    if (!filterGenerations) {
      // 当前是全部显示，点击某代 → 只显示该代
      setFilterGenerations(new Set([gen]));
    } else if (filterGenerations.has(gen)) {
      const next = new Set(filterGenerations);
      next.delete(gen);
      // 如果全部取消，恢复显示全部
      setFilterGenerations(next.size === 0 ? null : next);
    } else {
      const next = new Set(filterGenerations);
      next.add(gen);
      // 如果选中了全部代际，等于没有筛选
      if (next.size >= availableGenerations.length) {
        setFilterGenerations(null);
      } else {
        setFilterGenerations(next);
      }
    }
  };

  const isGenActive = (gen: number) =>
    !filterGenerations || filterGenerations.has(gen);

  return (
    <aside className="scroll-frame w-56 border-r border-bronze/35 bg-[#efe5cf]/80 p-4">
      <h2 className="mb-3 font-serifCn text-sm tracking-[0.14em] text-ink">
        编辑工具
      </h2>
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

      <h3 className="mb-2 mt-6 font-serifCn text-sm tracking-[0.14em] text-ink">
        视图筛选
      </h3>
      <div className="space-y-2">
        {/* 按分支筛选 */}
        <div className="flex flex-wrap gap-1">
          {(["overview", "paternal", "maternal", "focus"] as const).map(
            (mode) => {
              const labels = {
                overview: "全景",
                paternal: "父系",
                maternal: "母系",
                focus: "焦点",
              };
              return (
                <button
                  key={mode}
                  className={`rounded px-2 py-1 text-xs ${
                    viewMode === mode
                      ? "border border-cinnabar/55 bg-cinnabar/15 text-cinnabar"
                      : "border border-bronze/30 text-soot hover:border-bronze/60"
                  }`}
                  onClick={() => setViewMode(mode)}
                >
                  {labels[mode]}
                </button>
              );
            },
          )}
        </div>

        {/* 按代际筛选 */}
        <button
          className="tool-btn w-full text-left"
          onClick={() => setShowGenFilter(!showGenFilter)}
        >
          按代际筛选{" "}
          {filterGenerations ? `(${filterGenerations.size}代)` : "(全部)"}
        </button>
        {showGenFilter && (
          <div className="space-y-1 rounded border border-bronze/30 bg-parchment/80 p-2">
            <button
              className="mb-1 block w-full text-left text-xs text-soot hover:text-cinnabar"
              onClick={() => setFilterGenerations(null)}
            >
              显示全部
            </button>
            {availableGenerations.map((gen) => (
              <label
                key={gen}
                className="flex items-center gap-2 text-xs text-soot"
              >
                <input
                  type="checkbox"
                  checked={isGenActive(gen)}
                  onChange={() => toggleGeneration(gen)}
                  className="accent-cinnabar"
                />
                {GENERATION_LABELS[gen] ?? `第${gen}代`}
              </label>
            ))}
          </div>
        )}

        <button className="tool-btn" onClick={triggerAutoArrange}>
          自动整理
        </button>
      </div>
    </aside>
  );
}
