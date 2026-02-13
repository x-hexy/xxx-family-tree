import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment p-6 text-ink">
      <div className="w-full max-w-md rounded border border-bronze/45 bg-[#f8f2e3] p-6 text-center shadow-panel-soft">
        <h1 className="font-serifCn text-2xl">页面不存在</h1>
        <p className="mt-2 text-sm text-soot">请返回编辑首页或检查只读链接。</p>
        <Link
          className="mt-4 inline-block rounded border border-cinnabar px-4 py-2 text-sm text-cinnabar"
          to="/"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}

