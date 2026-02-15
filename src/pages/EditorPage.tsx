import { TopBar } from "../components/layout/TopBar";
import { LeftToolbox } from "../components/layout/LeftToolbox";
import { RightPanel } from "../components/layout/RightPanel";
import { FamilyGraph } from "../components/graph/FamilyGraph";
import { useFamilyStore } from "../store/useFamilyStore";

export function EditorPage() {
  const isHydrated = useFamilyStore((s) => s.isHydrated);
  const syncError = useFamilyStore((s) => s.syncError);

  if (!isHydrated) {
    return (
      <main className="relative z-[1] flex h-screen items-center justify-center bg-parchment text-ink">
        <div className="scroll-frame rounded-md bg-[#f8f2e3] px-6 py-4 text-sm text-soot">正在加载家谱数据...</div>
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
        <div className="flex-1 p-3 panel-reveal">
          <div
            id="family-graph-canvas"
            className="scroll-frame h-full overflow-hidden rounded-md bg-[#f8f2e3]"
          >
            <FamilyGraph />
          </div>
        </div>
        <div className="ink-fade delay-2">
          <RightPanel />
        </div>
      </section>
    </main>
  );
}
