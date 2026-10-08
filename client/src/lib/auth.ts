const IDENTITY_KEY = "sbx.identity";

export interface Identity {
  name: string;
  email: string;
}

/**
 * `/api/session` only returns `{ ok: true }`, so the signed-in identity is
 * cached locally after a successful login or signup to render in the header.
 * Treat this as display-only — never as an authorization check.
 */
export function readIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (typeof parsed.email !== "string") return null;
    return { name: parsed.name ?? parsed.email, email: parsed.email };
  } catch {
    return null;
  }
}

export function writeIdentity(identity: Identity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
}

async function post(path: string, body: unknown, signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw aborted
      ? e
      : new Error("Could not reach the server. Is `pnpm dev` running in srv/?", {
          cause: e,
        });
  }
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export function login(email: string, password: string, signal?: AbortSignal): Promise<Response> {
  return post("/api/login", { email, password }, signal);
}

export function signup(
  name: string,
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<Response> {
  return post("/api/signup", { name, email, password }, signal);
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    clearIdentity();
  }
}

/** Resolves true only when the server still accepts the session cookie. */
export async function isAuthenticated(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch("/api/session", { signal });
    return res.ok;
  } catch {
    return false;
  }
}
