"use client";

import Link from "next/link";
import { ROLE_LABELS, useAuth } from "@/lib/auth";

// Thanh tiêu đề dùng chung cho mọi trang: tên dự án, liên kết, trạng thái đăng nhập
export default function SiteHeader() {
  const { user, loading, logout } = useAuth();
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-200 bg-white px-4 py-2">
      <Link href="/" className="text-lg font-bold">
        Vietnam Event GIS
      </Link>
      <nav className="flex flex-1 flex-wrap items-center gap-x-3 text-sm">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">
          Bản đồ
        </Link>
        {user && (
          <Link href="/dang-su-kien" data-testid="nav-post" className="text-zinc-600 hover:text-zinc-900">
            Đăng sự kiện
          </Link>
        )}
        {user?.role === "admin" && (
          <Link href="/quan-tri" data-testid="nav-admin" className="text-zinc-600 hover:text-zinc-900">
            Quản trị
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2 text-sm">
        {loading ? null : user ? (
          <>
            <span data-testid="current-user" className="text-zinc-700">
              {user.displayName}
              {user.isVerified && <span title="Đã xác thực" className="ml-1 text-sky-600">✔</span>}
              <span className="ml-1 hidden text-xs text-zinc-400 sm:inline">({ROLE_LABELS[user.role]})</span>
            </span>
            <button onClick={logout} className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50">
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link href="/dang-nhap" data-testid="nav-login" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50">
              Đăng nhập
            </Link>
            <Link href="/dang-ky" className="rounded bg-amber-500 px-2 py-1 text-white hover:bg-amber-600">
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
