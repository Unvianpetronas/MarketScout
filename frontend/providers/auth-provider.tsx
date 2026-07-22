"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { User } from "@/types/user";
import { LoginRequest } from "@/types/auth";
import { login as loginApi, loginWithGoogle as loginWithGoogleApi, logout as logoutApi, getMe } from "@/services/auth.service";
import { LoginResponse } from "@/types/auth";
import { setTokens, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from "@/lib/token-storage";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
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
    /* eslint-disable react-hooks/set-state-in-effect -- one-time auth bootstrap on mount */
    const token = getAccessToken();
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshUser]);

  // Proactively refresh the access token before it expires.
  // Checks every 4 minutes and refreshes if the token expires within 2 minutes.
  // This prevents auto-logout caused by short-lived tokens (e.g. 5-minute JWT).
  useEffect(() => {
    const INTERVAL_MS = 4 * 60 * 1000;
    const THRESHOLD_MS = 2 * 60 * 1000;

    const silentRefresh = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64));
        const expiresInMs = payload.exp * 1000 - Date.now();
        if (expiresInMs > THRESHOLD_MS) return;
        const rt = getRefreshToken();
        if (!rt) return;
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken: rt }
        );
        setAccessToken(data.token);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
      } catch {
        // Silent fail — the 401 interceptor handles the next API call
      }
    };

    const id = setInterval(silentRefresh, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const applyLoginResponse = (response: LoginResponse, rememberMe: boolean) => {
    setTokens(response.token, response.refreshToken, rememberMe);
    setUser({
      id: response.id,
      email: response.email,
      fullName: response.fullName,
      role: response.role,
      planName: response.planName,
      quotaRemaining: response.quotaRemaining,
      companyName: response.companyName,
      emailVerified: true,
    });
    router.push("/dashboard");
  };

  const login = async (data: LoginRequest, rememberMe = false) => {
    const response = await loginApi(data);
    applyLoginResponse(response, rememberMe);
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await loginWithGoogleApi({ credential });
    applyLoginResponse(response, true);
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
        loginWithGoogle,
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
