import { useMemo, useState } from "react";
import { useFamilyStore } from "../../store/useFamilyStore";

type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  const shareToken = useFamilyStore((s) => s.shareToken);
  const shareEnabled = useFamilyStore((s) => s.shareEnabled);
  const setShareEnabled = useFamilyStore((s) => s.setShareEnabled);
  const refreshShareToken = useFamilyStore((s) => s.refreshShareToken);
  const [message, setMessage] = useState("");

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/view/${shareToken}`;
    return `${window.location.origin}/view/${shareToken}`;
  }, [shareToken]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("链接已复制。");
    } catch {
      setMessage("复制失败，请手动复制链接。");
    }
  };

  const regenerate = () => {
    refreshShareToken();
    setMessage("已刷新分享链接。");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
      <div className="w-full max-w-xl rounded border border-bronze/55 bg-parchment p-5 shadow-panel-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serifCn text-lg text-ink">分享设置</h3>
          <button className="rounded border border-bronze/45 px-2 py-1 text-xs text-soot" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between rounded border border-bronze/35 bg-[#fbf6ea] px-3 py-2">
            <span className="text-sm text-ink">只读链接状态</span>
            <input
              type="checkbox"
              checked={shareEnabled}
              onChange={(event) => setShareEnabled(event.target.checked)}
              className="h-4 w-4 accent-cinnabar"
            />
          </label>

          <div>
            <label className="block text-xs text-soot">分享链接</label>
            <input
              readOnly
              value={shareUrl}
              className="mt-1 w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-2 text-sm text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="tool-btn" onClick={copyLink}>
              复制链接
            </button>
            <button className="tool-btn border-cinnabar text-cinnabar" onClick={regenerate}>
              刷新链接Token
            </button>
          </div>
          <p className="h-4 text-xs text-cinnabar">{message}</p>
        </div>
      </div>
    </div>
  );
}

