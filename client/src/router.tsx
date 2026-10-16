import { createRouter } from "@tanstack/react-router";

import { authClient, type AuthClient } from "@/features/auth/auth-client";
import { routeTree } from "./routeTree.gen";

/**
 * Everything the router guarantees to descendant routes. Holds the auth
 * client, so guards call `context.auth.getSession()` in `beforeLoad` and
 * routes read the session from their route context.
 */
export interface RouterContext {
  auth: AuthClient;
}

export const router = createRouter({
  routeTree,
  context: { auth: authClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
