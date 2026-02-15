import { useParams } from "react-router-dom";
import { TopBar } from "../components/layout/TopBar";
import { RightPanel } from "../components/layout/RightPanel";
import { FamilyGraph } from "../components/graph/FamilyGraph";
import { useFamilyStore } from "../store/useFamilyStore";

export function ReadOnlyPage() {
  const { token } = useParams();
  const isHydrated = useFamilyStore((s) => s.isHydrated);
  const isValidShareAccess = useFamilyStore((s) => s.isValidShareAccess);
  if (!isHydrated) {
    return (
      <main className="relative z-[1] flex h-screen items-center justify-center bg-parchment text-ink">
        <div className="scroll-frame rounded-md bg-[#f8f2e3] px-6 py-4 text-sm text-soot">正在验证分享链接...</div>
      </main>
    );
  }
  const canAccess = isValidShareAccess(token);

  if (!canAccess) {
    return (
      <main className="relative z-[1] h-screen bg-parchment text-ink">
        <TopBar readOnly />
        <section className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
          <div className="scroll-frame panel-reveal w-full max-w-xl rounded-md bg-[#f8f2e3] p-6 text-center shadow-panel-soft">
            <h2 className="font-serifCn text-2xl text-ink">分享链接不可用</h2>
            <p className="mt-2 text-sm text-soot">
              该链接可能已失效、被停用，或 Token 不正确。请联系家谱编辑者获取最新链接。
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative z-[1] h-screen bg-parchment text-ink">
      <TopBar readOnly />
      <section className="flex h-[calc(100vh-4rem)]">
        <div className="flex flex-1 flex-col p-3 panel-reveal">
          <div className="mb-2 rounded border border-bronze/35 bg-[#efe4ce] px-3 py-2 text-xs text-soot">
            只读链接: {token ?? "unknown-token"}
          </div>
          <div id="family-graph-canvas" className="scroll-frame flex-1 overflow-hidden rounded-md bg-[#f8f2e3]">
            <FamilyGraph readOnly />
          </div>
        </div>
        <RightPanel readOnly />
      </section>
    </main>
  );
}
