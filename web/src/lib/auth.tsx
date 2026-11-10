"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";

export type Role = "user" | "celebrity" | "venue_owner" | "admin";
export type User = { id: number; email: string; displayName: string; role: Role; isVerified: boolean };

export const ROLE_LABELS: Record<Role, string> = {
  user: "Người dùng",
  celebrity: "Người nổi tiếng",
  venue_owner: "Chủ địa điểm / KOL",
  admin: "Quản trị viên",
};

type AuthState = {
  user: User | null;
  /** true khi đang kiểm tra token đã lưu lúc mở trang */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; displayName: string; role: Role }) => Promise<User>;
  logout: () => void;
};

// Context: cách React chia sẻ 1 giá trị (ở đây là người dùng đang đăng nhập) cho mọi component con
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mở trang: nếu đã có token thì hỏi API xem token còn hợp lệ không
  useEffect(() => {
    const check = tokenStore.get()
      ? api<User>("/api/auth/me")
          .then(setUser)
          .catch(() => tokenStore.clear())
      : Promise.resolve();
    check.finally(() => setLoading(false));
  }, []);

  const handleAuth = useCallback((res: { token: string; user: User }) => {
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value: AuthState = {
    user,
    loading,
    login: (email, password) =>
      api<{ token: string; user: User }>("/api/auth/login", { method: "POST", body: { email, password } }).then(handleAuth),
    register: (data) =>
      api<{ token: string; user: User }>("/api/auth/register", { method: "POST", body: data }).then(handleAuth),
    logout: () => {
      tokenStore.clear();
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong <AuthProvider>");
  return ctx;
}
