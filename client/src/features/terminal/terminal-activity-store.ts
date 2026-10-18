import { create } from "zustand";

type TerminalActivityState = {
  connected: Set<string>;
  setConnected: (id: string, connected: boolean) => void;
};

/** Tracks live terminal sockets so the page can guard navigation. */
export const useTerminalActivity = create<TerminalActivityState>((set) => ({
  connected: new Set<string>(),
  setConnected: (id, connected) =>
    set((state) => {
      const next = new Set(state.connected);
      if (connected) next.add(id);
      else next.delete(id);
      return { connected: next };
    }),
}));

export function useActiveTerminalCount(): number {
  return useTerminalActivity((state) => state.connected.size);
}
