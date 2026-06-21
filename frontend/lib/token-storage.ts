const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const REMEMBER_KEY = "remember_me";

function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

function activeStore(): Storage {
  return isRemembered() ? localStorage : sessionStorage;
}

export function setTokens(token: string, refreshToken: string, remember: boolean) {
  clearTokens();
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  const store = remember ? localStorage : sessionStorage;
  store.setItem(ACCESS_KEY, token);
  store.setItem(REFRESH_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

export function setAccessToken(token: string) {
  activeStore().setItem(ACCESS_KEY, token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}
