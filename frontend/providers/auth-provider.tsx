"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types/user";
import { LoginRequest } from "@/types/auth";
import { login as loginApi, logout as logoutApi, getMe } from "@/services/auth.service";
import { setTokens, getAccessToken, clearTokens } from "@/lib/token-storage";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (data: LoginRequest, rememberMe = false) => {
    const response = await loginApi(data);
    setTokens(response.token, response.refreshToken, rememberMe);
    setUser({
      id: response.id,
      email: response.email,
      fullName: response.fullName,
      role: response.role,
      quotaRemaining: response.quotaRemaining,
      companyName: response.companyName,
      emailVerified: true,
    });
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore errors
    } finally {
      clearTokens();
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
