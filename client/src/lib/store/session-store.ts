import { create } from "zustand";

import { clearIdentity, isAuthenticated, logout, readIdentity, type Identity } from "../auth";

export type SessionStatus = "checking" | "authenticated" | "anonymous";

interface SessionState {
  identity: Identity | null;
  status: SessionStatus;
  /** Asks the server whether the session cookie is still valid. */
  check: () => Promise<void>;
  /** Called when any request comes back 401, so the guard can bounce to /login. */
  expire: () => void;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()((set) => ({
  identity: null,
  status: "checking",

  /**
   * Asks the server whether the session cookie is still valid.
   *
   * Deliberately does not flip back to 'checking': the authenticated layout
   * renders nothing in that state, so re-checking mid-session would unmount
   * and remount every child route.
   */
  check: async () => {
    const authed = await isAuthenticated();
    if (!authed) {
      clearIdentity();
      set({ identity: null, status: "anonymous" });
      return;
    }
    set({ identity: readIdentity(), status: "authenticated" });
  },

  expire: () => {
    clearIdentity();
    set({ identity: null, status: "anonymous" });
  },

  signOut: async () => {
    await logout();
    set({ identity: null, status: "anonymous" });
  },
}));
