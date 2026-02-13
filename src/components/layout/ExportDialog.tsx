import { useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

type ExportDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ExportFormat = "png" | "pdf";
type ExportScope = "current" | "full";

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scope, setScope] = useState<ExportScope>("current");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  const getExportTarget = (): HTMLElement | null => {
    const wrapper = document.getElementById("family-graph-canvas");
    if (!wrapper) return null;
    if (scope === "current") return wrapper;
    return wrapper.querySelector(".react-flow__viewport") as HTMLElement | null;
  };

  const downloadByHref = (href: string, filename: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
  };

  const runExport = async () => {
    const target = getExportTarget();
    if (!target) {
      setMessage("未找到图谱容器，导出失败。");
      return;
    }

    setExporting(true);
    setMessage("");
    try {
      const pngDataUrl = await toPng(target, {
        cacheBust: true,
        backgroundColor: "#f3ebd8",
        pixelRatio: 2
      });
      const time = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      if (format === "png") {
        downloadByHref(pngDataUrl, `family-tree-${scope}-${time}.png`);
        setMessage("PNG 导出成功。");
      } else {
        const image = new Image();
        image.src = pngDataUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("图像加载失败"));
        });

        const pdf = new jsPDF({
          orientation: image.width >= image.height ? "landscape" : "portrait",
          unit: "px",
          format: [image.width, image.height]
        });
        pdf.addImage(pngDataUrl, "PNG", 0, 0, image.width, image.height);
        pdf.save(`family-tree-${scope}-${time}.pdf`);
        setMessage("PDF 导出成功。");
      }
    } catch {
      setMessage("导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
      <div className="w-full max-w-lg rounded border border-bronze/55 bg-parchment p-5 shadow-panel-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serifCn text-lg text-ink">导出图谱</h3>
          <button className="rounded border border-bronze/45 px-2 py-1 text-xs text-soot" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-soot">导出格式</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={
                  format === "png"
                    ? "tool-btn border-cinnabar bg-cinnabar/10 text-center text-cinnabar ring-1 ring-cinnabar/60"
                    : "tool-btn text-center"
                }
                onClick={() => setFormat("png")}
              >
                PNG
              </button>
              <button
                className={
                  format === "pdf"
                    ? "tool-btn border-cinnabar bg-cinnabar/10 text-center text-cinnabar ring-1 ring-cinnabar/60"
                    : "tool-btn text-center"
                }
                onClick={() => setFormat("pdf")}
              >
                PDF
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-soot">导出范围</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={
                  scope === "current"
                    ? "tool-btn border-cinnabar bg-cinnabar/10 text-center text-cinnabar ring-1 ring-cinnabar/60"
                    : "tool-btn text-center"
                }
                onClick={() => setScope("current")}
              >
                当前视图
              </button>
              <button
                className={
                  scope === "full"
                    ? "tool-btn border-cinnabar bg-cinnabar/10 text-center text-cinnabar ring-1 ring-cinnabar/60"
                    : "tool-btn text-center"
                }
                onClick={() => setScope("full")}
              >
                全图
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="tool-btn" onClick={onClose}>
              取消
            </button>
            <button
              className="tool-btn border-cinnabar text-center text-cinnabar"
              onClick={runExport}
              disabled={exporting}
            >
              {exporting ? "导出中..." : "开始导出"}
            </button>
          </div>
          <p className="h-4 text-xs text-cinnabar">{message}</p>
        </div>
      </div>
    </div>
  );
}
