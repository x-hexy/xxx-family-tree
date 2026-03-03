import { useState } from "react";
import { TEMPLATES } from "../../data/templates";
import type { TemplateId } from "../../data/templates";
import { applyTemplate } from "../../lib/templatePersistence";

type Props = {
  treeId: string;
  onApplied: () => void;
  onSkip: () => void;
};

export function TemplatePickerModal({ treeId, onApplied, onSkip }: Props) {
  const [loading, setLoading] = useState<TemplateId | null>(null);
  const [applyError, setApplyError] = useState("");

  const handleSelect = async (templateId: TemplateId) => {
    setLoading(templateId);
    setApplyError("");
    try {
      await applyTemplate(treeId, templateId);
      onApplied();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "应用模板失败，请重试");
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="scroll-frame w-full max-w-2xl rounded-md bg-parchment px-8 py-8 shadow-panel-soft">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="font-serifCn text-xl tracking-[0.16em] text-ink">
            选择家谱模板
          </h2>
          <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-bronze/50 to-transparent" />
          <p className="mt-2 text-xs tracking-wide text-soot">
            选择一个起点，稍后可以自由增减成员和关系
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => {
            const isLoading = loading === tpl.id;
            const isDisabled = loading !== null;
            return (
              <button
                key={tpl.id}
                onClick={() => void handleSelect(tpl.id)}
                disabled={isDisabled}
                className="group rounded border border-bronze/35 bg-[#f8f1e0] px-4 py-4 text-left transition hover:border-cinnabar/50 hover:bg-cinnabar/5 disabled:opacity-60"
              >
                <div className="mb-1 text-sm font-medium text-ink">
                  {tpl.name}
                </div>
                <div className="mb-3 text-[11px] leading-relaxed text-soot">
                  {tpl.description}
                </div>
                {/* ASCII preview */}
                <pre className="overflow-hidden text-[9px] leading-[1.4] text-bronze/70 font-mono">
                  {tpl.preview.join("\n")}
                </pre>
                {isLoading && (
                  <div className="mt-2 text-[11px] text-cinnabar">正在应用…</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {applyError && (
          <p className="mt-3 text-center text-xs text-cinnabar">{applyError}</p>
        )}

        {/* Skip */}
        <div className="mt-6 border-t border-bronze/25 pt-4 text-center">
          <button
            onClick={onSkip}
            disabled={loading !== null}
            className="text-xs text-soot transition hover:text-ink disabled:opacity-50"
          >
            从空白开始，手动添加成员
          </button>
        </div>
      </div>
    </div>
  );
}
