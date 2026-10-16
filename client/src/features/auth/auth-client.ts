const IDENTITY_KEY = "sbx.identity";

export interface Identity {
  name: string;
  email: string;
}

export interface Session {
  identity: Identity | null;
}

/**
 * The session cookie is httpOnly, so the signed-in identity is cached locally
 * after a successful login or signup to render in the nav. Treat this as
 * display-only — never as an authorization check.
 */
function readIdentity(): Identity | null {
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

function writeIdentity(identity: Identity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
}

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
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

export interface AuthClient {
  /** Resolves null when the server does not accept the session cookie. */
  getSession: (signal?: AbortSignal) => Promise<Session | null>;
  login: (email: string, password: string, signal?: AbortSignal) => Promise<Session>;
  signup: (name: string, email: string, password: string, signal?: AbortSignal) => Promise<Session>;
  logout: () => Promise<void>;
}

/**
 * The router context carries this client so route guards (`beforeLoad`) can
 * check the session, and components can sign in/out through the same API.
 */
export const authClient: AuthClient = {
  getSession: async (signal) => {
    try {
      const res = await fetch("/api/session", { signal });
      if (!res.ok) return null;
      return { identity: readIdentity() };
    } catch {
      return null;
    }
  },

  login: async (email, password, signal) => {
    await post("/api/login", { email, password }, signal);
    const identity = { name: email.split("@")[0] ?? email, email };
    writeIdentity(identity);
    return { identity };
  },

  signup: async (name, email, password, signal) => {
    await post("/api/signup", { name, email, password }, signal);
    const identity = { name, email };
    writeIdentity(identity);
    return { identity };
  },

  logout: async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      clearIdentity();
    }
  },
};
