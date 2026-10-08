import { create } from "zustand";

import { checkHealth } from "../api";

interface ServerState {
  /** null while the first check is still in flight. */
  healthy: boolean | null;
  check: (signal?: AbortSignal) => Promise<void>;
  markOffline: () => void;
}

export const useServerStore = create<ServerState>()((set) => ({
  healthy: null,

  check: async (signal) => {
    set({ healthy: await checkHealth(signal) });
  },

  markOffline: () => set({ healthy: false }),
}));
