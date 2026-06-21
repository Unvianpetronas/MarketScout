import axios from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from "@/lib/token-storage";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

function performRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        );
        setAccessToken(data.token);
        return data.token as string;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !isAuthEndpoint &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;
      const newToken = await performRefresh();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      clearTokens();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
