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
  const viewMode = useFamilyStore((s) => s.viewMode);
  const setViewMode = useFamilyStore((s) => s.setViewMode);
  const showParentChildLines = useFamilyStore((s) => s.showParentChildLines);
  const showSiblingLines = useFamilyStore((s) => s.showSiblingLines);
  const setLineVisibility = useFamilyStore((s) => s.setLineVisibility);

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
      <header className="relative flex h-[90px] items-center justify-between border-b border-bronze/40 bg-parchment/90 px-5 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bronze/80 to-transparent" />
        <div>
          <h1 className="font-serifCn text-xl tracking-[0.16em] text-ink">X氏家谱</h1>
          <p className="text-xs tracking-[0.22em] text-soot">卷轴家族图谱</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 rounded border border-bronze/35 bg-[#f8f1e0]/80 p-1">
              <ModeButton active={viewMode === "focus"} label="焦点树" onClick={() => setViewMode("focus")} />
              <ModeButton active={viewMode === "paternal"} label="父系" onClick={() => setViewMode("paternal")} />
              <ModeButton active={viewMode === "maternal"} label="母系" onClick={() => setViewMode("maternal")} />
              <ModeButton active={viewMode === "overview"} label="全景" onClick={() => setViewMode("overview")} />
            </div>
            <div className="flex items-center gap-2 text-xs text-soot">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showParentChildLines}
                  onChange={(event) => setLineVisibility({ showParentChildLines: event.target.checked })}
                  className="accent-cinnabar"
                />
                父母/子女
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showSiblingLines}
                  onChange={(event) => setLineVisibility({ showSiblingLines: event.target.checked })}
                  className="accent-cinnabar"
                />
                兄弟姐妹
              </label>
            </div>
          </div>
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

type ModeButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function ModeButton({ active, label, onClick }: ModeButtonProps) {
  return (
    <button
      className={`rounded px-2 py-1 text-xs ${active ? "bg-cinnabar/15 text-cinnabar border border-cinnabar/55" : "text-soot border border-transparent"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
