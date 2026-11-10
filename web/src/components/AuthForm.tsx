"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS, type Role, useAuth } from "@/lib/auth";

const inputClass = "w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-amber-500";

// Form dùng chung cho Đăng nhập và Đăng ký
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "user" as Role });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = mode === "login" ? await login(form.email, form.password) : await register(form);
      router.push(user.role === "admin" ? "/quan-tri" : "/dang-su-kien");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-10 w-full max-w-sm space-y-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold">{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h1>
      {mode === "register" && (
        <label className="block text-sm">
          Tên hiển thị
          <input data-testid="input-name" required value={form.displayName} onChange={set("displayName")} className={inputClass} />
        </label>
      )}
      <label className="block text-sm">
        Email
        <input data-testid="input-email" type="email" required value={form.email} onChange={set("email")} className={inputClass} />
      </label>
      <label className="block text-sm">
        Mật khẩu {mode === "register" && <span className="text-zinc-400">(tối thiểu 8 ký tự)</span>}
        <input data-testid="input-password" type="password" required minLength={mode === "register" ? 8 : 1} value={form.password} onChange={set("password")} className={inputClass} />
      </label>
      {mode === "register" && (
        <label className="block text-sm">
          Bạn là
          <select data-testid="input-role" value={form.role} onChange={set("role")} className={inputClass}>
            {(["user", "celebrity", "venue_owner"] as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            Người nổi tiếng và chủ địa điểm cần quản trị viên xác thực; sau khi xác thực, sự kiện được duyệt ngay.
          </span>
        </label>
      )}
      {error && <p data-testid="form-error" className="text-sm text-red-600">{error}</p>}
      <button data-testid="submit" disabled={busy} className="w-full rounded-lg bg-amber-500 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-60">
        {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Đăng ký"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        {mode === "login" ? (
          <>Chưa có tài khoản? <Link href="/dang-ky" className="text-amber-700 underline">Đăng ký</Link></>
        ) : (
          <>Đã có tài khoản? <Link href="/dang-nhap" className="text-amber-700 underline">Đăng nhập</Link></>
        )}
      </p>
    </form>
  );
}
