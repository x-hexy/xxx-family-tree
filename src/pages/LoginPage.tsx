import { type KeyboardEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../lib/auth";
import { getOrCreateTree } from "../lib/treePersistence";

type FormMode = "login" | "register";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("请填写邮箱和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        const { user, error: authError } = await signUp(trimmedEmail, password);
        if (authError) {
          setError(authError.message);
          return;
        }
        if (user) {
          // 注册成功：自动建树，跳转编辑页
          await getOrCreateTree(user.id);
          void navigate("/", { replace: true });
        } else {
          // Supabase 可能要求邮件确认
          setError("注册成功，请检查邮箱完成验证后再登录。");
        }
      } else {
        const { user, error: authError } = await signIn(trimmedEmail, password);
        if (authError) {
          setError("邮箱或密码错误，请重试");
          return;
        }
        if (user) {
          // 登录成功：确保树存在，跳转编辑页
          await getOrCreateTree(user.id);
          void navigate("/", { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void submit();
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError("");
  };

  return (
    <main className="flex h-screen items-center justify-center bg-parchment">
      {/* 背景纹理装饰 */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(180,140,80,0.06)_0%,_transparent_70%)]" />

      <div className="scroll-frame relative w-full max-w-sm rounded-md px-8 py-10 text-center shadow-panel-soft">
        {/* 顶部印章标题 */}
        <div className="mb-6">
          <h1 className="font-serifCn text-2xl tracking-[0.18em] text-ink">
            X氏家谱
          </h1>
          <p className="mt-1 text-xs tracking-[0.24em] text-soot">
            传承家族 · 记录故事
          </p>
          <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-r from-transparent via-bronze/60 to-transparent" />
        </div>

        {/* 表单 */}
        <div className="space-y-3">
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            disabled={loading}
            className="h-10 w-full rounded border border-bronze/40 bg-[#f8f1e0] px-3 text-sm text-ink outline-none transition focus:border-cinnabar disabled:opacity-60"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            className="h-10 w-full rounded border border-bronze/40 bg-[#f8f1e0] px-3 text-sm text-ink outline-none transition focus:border-cinnabar disabled:opacity-60"
          />

          <button
            onClick={() => void submit()}
            disabled={loading}
            className="w-full rounded border border-cinnabar px-4 py-2 text-sm text-cinnabar transition hover:bg-cinnabar/10 disabled:opacity-50"
          >
            {loading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="mt-3 text-xs text-cinnabar">{error}</p>
        )}

        {/* 切换登录/注册 */}
        <div className="mt-5 border-t border-bronze/25 pt-4">
          <button
            onClick={switchMode}
            disabled={loading}
            className="text-xs text-soot transition hover:text-ink"
          >
            {mode === "login"
              ? "没有账号？立即注册"
              : "已有账号？直接登录"}
          </button>
        </div>
      </div>
    </main>
  );
}
