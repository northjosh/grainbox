import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { login, logout, signup } from "../lib/auth.js";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "../constants.js";
import { validateSession } from "../middleware.js";
import type { Env } from "../env.js";
import type { Session } from "../../db/schema.js";

export const authRoutes = new Hono<Env>();

authRoutes.post("/signup", async (c) => {
  const { name, email, password } = await c.req.json();
  const session = await signup({ name, email, password });
  setSessionCookie(c, session);

  return c.json({ success: "true" });
});

authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const session = await login({ email, password });

  setSessionCookie(c, session);
  return c.json({ success: "true" });
});

// mounted before the global validateSession, so both of these carry it explicitly
authRoutes.get("/session", validateSession, (c) => {
  const user = c.get("user");
  return c.json({ user: user });
});

authRoutes.post("/logout", validateSession, async (c) => {
  const session = getCookie(c, SESSION_COOKIE);
  if (session) {
    await logout(session);
  }
  deleteCookie(c, SESSION_COOKIE);
  return c.json({ success: "true" });
});

function setSessionCookie(c: Context<Env>, sessions: Session[]) {
  const session = sessions[0];
  if (!session) throw new Error("Session insert returned no row");

  setCookie(c, SESSION_COOKIE, session.sessionToken, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    expires: new Date(session.expiresAt),
    sameSite: "Strict",
    // secure: true  // not yet
  });
}
