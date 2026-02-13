import { TopBar } from "../components/layout/TopBar";
import { LeftToolbox } from "../components/layout/LeftToolbox";
import { RightPanel } from "../components/layout/RightPanel";
import { FamilyGraph } from "../components/graph/FamilyGraph";

export function EditorPage() {
  return (
    <main className="relative z-[1] h-screen bg-parchment text-ink">
      <TopBar />
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
