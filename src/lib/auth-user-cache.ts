import type { User } from "@/lib/api/types";

const USER_CACHE_KEY = "storehaus_auth_user_v1";

export function cacheAuthUser(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      window.localStorage.removeItem(USER_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore quota / private mode
  }
}

export function readCachedAuthUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}
