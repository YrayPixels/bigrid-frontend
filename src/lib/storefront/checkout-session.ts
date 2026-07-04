export function getCheckoutSessionToken(storeId: string): string {
  if (typeof window === "undefined") return "";

  const key = `storehaus_checkout_session_${storeId}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, token);
  return token;
}
