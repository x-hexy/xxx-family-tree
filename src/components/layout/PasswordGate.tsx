import { useState, type KeyboardEvent, type ReactNode } from "react";

const EDITOR_PASSWORD = import.meta.env.VITE_EDITOR_PASSWORD ?? "";
const SESSION_KEY = "xy-family-tree-auth";

function isAuthenticated(): boolean {
  if (!EDITOR_PASSWORD) return true;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

type PasswordGateProps = {
  children: ReactNode;
};

export function PasswordGate({ children }: PasswordGateProps) {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  if (authed) return <>{children}</>;

  const submit = () => {
    if (input === EDITOR_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setError("");
    } else {
      setError("密码错误，请重试");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <main className="flex h-screen items-center justify-center bg-parchment">
      <div className="scroll-frame w-80 rounded-md p-8 text-center">
        <h1 className="mb-1 font-serifCn text-xl tracking-[0.16em] text-ink">
          X氏家谱
        </h1>
        <p className="mb-6 text-xs tracking-[0.22em] text-soot">
          编辑模式需要密码
        </p>
        <input
          type="password"
          placeholder="请输入编辑密码"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          className="mb-3 h-10 w-full rounded border border-bronze/40 bg-[#f8f1e0] px-3 text-sm text-ink outline-none transition focus:border-cinnabar"
        />
        <button
          onClick={submit}
          className="w-full rounded border border-cinnabar px-4 py-2 text-sm text-cinnabar transition hover:bg-cinnabar/10"
        >
          进入编辑
        </button>
        {error && (
          <p className="mt-3 text-xs text-cinnabar">{error}</p>
        )}
      </div>
    </main>
  );
}
