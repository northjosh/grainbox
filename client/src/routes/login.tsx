import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/login-page";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" && search.redirect.length > 0
      ? { redirect: search.redirect }
      : {},
  beforeLoad: async ({ context, search }) => {
    const session = await context.auth.getSession();
    if (session) {
      throw search.redirect ? redirect({ href: search.redirect }) : redirect({ to: "/" });
    }
  },
  component: LoginPage,
});
