import { useState, type KeyboardEvent } from "react";
import { useFamilyStore } from "../../store/useFamilyStore";
import { ShareDialog } from "./ShareDialog";
import { ExportDialog } from "./ExportDialog";

type TopBarProps = {
  readOnly?: boolean;
};

export function TopBar({ readOnly = false }: TopBarProps) {
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const findAndSelectMemberByName = useFamilyStore((s) => s.findAndSelectMemberByName);

  const runSearch = () => {
    const result = findAndSelectMemberByName(keyword);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    setMessage("");
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    runSearch();
  };

  return (
    <>
      <header className="relative flex h-16 items-center justify-between border-b border-bronze/40 bg-parchment/90 px-5 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bronze/80 to-transparent" />
        <div>
          <h1 className="font-serifCn text-xl tracking-[0.16em] text-ink">X氏家谱</h1>
          <p className="text-xs tracking-[0.22em] text-soot">卷轴家族图谱</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="搜索姓名"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={onSearchKeyDown}
                className="h-9 w-48 rounded border border-bronze/40 bg-[#f8f1e0] px-3 text-sm outline-none transition focus:border-cinnabar"
              />
              <button className="rounded border border-bronze/50 px-3 py-1 text-sm text-soot" onClick={runSearch}>
                搜索
              </button>
            </div>
            <p className="mt-1 h-4 text-xs text-cinnabar">{message}</p>
          </div>
          {readOnly ? (
            <button className="rounded border border-bronze/50 px-3 py-1 text-sm text-soot">图例</button>
          ) : (
            <>
              <button
                className="rounded border border-bronze/50 px-3 py-1 text-sm text-soot"
                onClick={() => setExportDialogOpen(true)}
              >
                导出图谱
              </button>
              <button
                className="rounded border border-cinnabar px-3 py-1 text-sm text-cinnabar"
                onClick={() => setShareDialogOpen(true)}
              >
                分享链接
              </button>
            </>
          )}
        </div>
      </header>
      {!readOnly && <ShareDialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />}
      {!readOnly && <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />}
    </>
  );
}
