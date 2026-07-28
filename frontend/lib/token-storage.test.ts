/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from "./token-storage";

// Tokens live in web storage (a deliberate, documented trade-off), so the whole
// security boundary of signing out rests on this module: a token left behind in
// either store means the session is still usable after logout.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("setTokens", () => {
  it("keeps a remembered session in localStorage only", () => {
    setTokens("access-1", "refresh-1", true);

    expect(localStorage.getItem("access_token")).toBe("access-1");
    expect(localStorage.getItem("refresh_token")).toBe("refresh-1");
    expect(localStorage.getItem("remember_me")).toBe("true");
    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(sessionStorage.getItem("refresh_token")).toBeNull();
  });

  it("keeps a non-remembered session in sessionStorage only", () => {
    setTokens("access-1", "refresh-1", false);

    expect(sessionStorage.getItem("access_token")).toBe("access-1");
    expect(sessionStorage.getItem("refresh_token")).toBe("refresh-1");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(localStorage.getItem("remember_me")).toBe("false");
  });

  // The dangerous case: logging in without "remember me" on a machine where a
  // previous session was remembered must not leave the old durable token behind.
  it("wipes a previously remembered token when the new login is not remembered", () => {
    setTokens("old-access", "old-refresh", true);
    setTokens("new-access", "new-refresh", false);

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(getAccessToken()).toBe("new-access");
    expect(getRefreshToken()).toBe("new-refresh");
  });

  it("wipes a previous session-only token when the new login is remembered", () => {
    setTokens("old-access", "old-refresh", false);
    setTokens("new-access", "new-refresh", true);

    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(getAccessToken()).toBe("new-access");
  });
});

describe("clearTokens", () => {
  it("removes tokens from both stores", () => {
    setTokens("a", "r", true);
    // Simulate a stray session-store copy as well.
    sessionStorage.setItem("access_token", "stray");
    sessionStorage.setItem("refresh_token", "stray");

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem("remember_me")).toBeNull();
  });
});

describe("token refresh writes to the store the session actually uses", () => {
  it("writes to localStorage while remembered", () => {
    setTokens("a", "r", true);

    setAccessToken("rotated-access");
    setRefreshToken("rotated-refresh");

    expect(localStorage.getItem("access_token")).toBe("rotated-access");
    expect(localStorage.getItem("refresh_token")).toBe("rotated-refresh");
    expect(sessionStorage.getItem("access_token")).toBeNull();
  });

  // If a rotated token landed in localStorage for a non-remembered session it
  // would outlive the tab, quietly turning "don't remember me" into "remember".
  it("writes to sessionStorage when not remembered", () => {
    setTokens("a", "r", false);

    setAccessToken("rotated-access");
    setRefreshToken("rotated-refresh");

    expect(sessionStorage.getItem("access_token")).toBe("rotated-access");
    expect(sessionStorage.getItem("refresh_token")).toBe("rotated-refresh");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });
});

describe("getters", () => {
  it("return null when nothing is stored", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
