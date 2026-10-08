import { createMiddleware } from "hono/factory";
import { NAME_RE, ALLOWED_IMAGES, SESSION_COOKIE } from "./constants.js";
import { deleteCookie, getCookie } from "hono/cookie";
import { db } from "../db/db.js";

export const validateSession = createMiddleware(async (c, next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE);

  if (!sessionToken) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.sessionToken, sessionToken),
    with: {
      user: {
        columns: { id: true, name: true, email: true, role: true },
      },
    },
  });

  const expiresAt = session ? Date.parse(session.expiresAt) : NaN;

  if (!session || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    deleteCookie(c, SESSION_COOKIE);
    return c.json({ error: "unauthorized" }, 401);
  }

  c.set("session", session);
  c.set("user", session.user);
  await next();
});

export const validateName = createMiddleware(async (c, next) => {
  const { name } = await c.req.json();
  if (!NAME_RE.test(name)) return c.json({ error: "invalid name" }, 400);
  await next();
});

export const validateImage = createMiddleware(async (c, next) => {
  const { image } = await c.req.json();
  if (!image) {
    return;
  }
  if (!ALLOWED_IMAGES.has(image)) return c.json({ error: "invalid image" }, 400);
  await next();
});

export const validateCommand = createMiddleware(async (c, next) => {
  const { command } = await c.req.json();
  if (typeof command !== "string" || command.length > 2000)
    return c.json({ error: "invalid command" }, 400);
  await next();
});
