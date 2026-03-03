import { useEffect, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { LeftToolbox } from "../components/layout/LeftToolbox";
import { RightPanel } from "../components/layout/RightPanel";
import { FamilyGraph } from "../components/graph/FamilyGraph";
import { TemplatePickerModal } from "../components/layout/TemplatePickerModal";
import { useFamilyStore } from "../store/useFamilyStore";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { getOrCreateTree } from "../lib/treePersistence";

export function EditorPage() {
  const authState = useAuthGuard();
  const isHydrated = useFamilyStore((s) => s.isHydrated);
  const syncError = useFamilyStore((s) => s.syncError);
  const initializeData = useFamilyStore((s) => s.initializeData);
  const units = useFamilyStore((s) => s.units);
  const treeId = useFamilyStore((s) => s.treeId);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  // null = not yet decided; true = show picker; false = dismissed
  const [showTemplatePicker, setShowTemplatePicker] = useState<boolean | null>(null);

  useEffect(() => {
    if (authState.status !== "authenticated") return;
    void getOrCreateTree(authState.userId).then((tree) =>
      initializeData(tree.id),
    );
  }, [authState, initializeData]);

  // Show template picker once after data loads if the tree is empty
  useEffect(() => {
    if (!isHydrated || showTemplatePicker !== null) return;
    setShowTemplatePicker(units.length === 0);
  }, [isHydrated, units.length, showTemplatePicker]);

  const handleTemplateApplied = () => {
    setShowTemplatePicker(false);
    if (treeId) void initializeData(treeId);
  };

  if (authState.status === "loading" || !isHydrated) {
    return (
      <main className="relative z-[1] flex h-screen items-center justify-center bg-parchment text-ink">
        <div className="scroll-frame rounded-md bg-[#f8f2e3] px-6 py-4 text-sm text-soot">
          正在加载家谱数据...
        </div>
      </main>
    );
  }

  return (
    <main className="relative z-[1] h-screen bg-parchment text-ink">
      <TopBar />
      {syncError && (
        <div className="mx-3 mt-2 rounded border border-cinnabar/45 bg-cinnabar/10 px-3 py-1 text-xs text-cinnabar">
          同步提示: {syncError}
        </div>
      )}
      <section className="flex h-[calc(100vh-4rem)]">
        <div className="ink-fade delay-1">
          <LeftToolbox />
        </div>
        <div className="relative flex-1 p-3 panel-reveal">
          <div
            id="family-graph-canvas"
            className="scroll-frame h-full overflow-hidden rounded-md bg-[#f8f2e3]"
          >
            <FamilyGraph />
          </div>
          <button
            className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-l border border-r-0 border-bronze/45 bg-parchment px-1 py-4 text-xs text-soot transition hover:text-cinnabar"
            onClick={() => setRightPanelOpen((prev) => !prev)}
            title={rightPanelOpen ? "收起面板" : "展开面板"}
          >
            {rightPanelOpen ? "▶" : "◀"}
          </button>
        </div>
        {rightPanelOpen && (
          <div className="ink-fade delay-2">
            <RightPanel />
          </div>
        )}
      </section>

      {showTemplatePicker && treeId && (
        <TemplatePickerModal
          treeId={treeId}
          onApplied={handleTemplateApplied}
          onSkip={() => setShowTemplatePicker(false)}
        />
      )}
    </main>
  );
}
