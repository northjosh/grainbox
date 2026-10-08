import { create } from "zustand";

import { MAX_CONCURRENT, runCommand, type Image, type RunResult } from "../api";
import { SNIPPETS } from "../snippets";
import { useHistoryStore } from "./history-store";
import { useServerStore } from "./server-store";
import { useSessionStore } from "./session-store";

export type RunStatus = "idle" | "running";

interface RunnerState {
  image: Image;
  command: string;
  status: RunStatus;
  result: RunResult | null;
  /** Set when the request never reached the server. */
  error: string | null;
  inflight: number;
  setImage: (image: Image) => void;
  setCommand: (command: string) => void;
  run: () => Promise<void>;
  cancel: () => void;
  clear: () => void;
  /** Replays a history entry back into the form. */
  load: (image: Image, command: string, result: RunResult | null) => void;
}

/**
 * The abort handle is deliberately module-level: swapping a controller must
 * not re-render anything, and React state cannot hold it across renders.
 */
let controller: AbortController | null = null;

export const useRunnerStore = create<RunnerState>()((set, get) => ({
  image: "alpine",
  command: SNIPPETS.alpine[0],
  status: "idle",
  result: null,
  error: null,
  inflight: 0,

  setImage: (image) => set({ image, command: SNIPPETS[image][0] }),

  setCommand: (command) => set({ command }),

  load: (image, command, result) => set({ image, command, result, error: null }),

  clear: () => set({ result: null, error: null }),

  cancel: () => controller?.abort(),

  run: async () => {
    const { command, image, inflight } = get();
    const trimmed = command.trim();
    if (!trimmed || inflight >= MAX_CONCURRENT) return;

    const ctrl = new AbortController();
    controller = ctrl;

    set({ error: null, result: null, status: "running", inflight: inflight + 1 });

    try {
      const result = await runCommand(image, trimmed, ctrl.signal);

      if (result.httpStatus === 401) {
        useSessionStore.getState().expire();
        return;
      }

      useHistoryStore.getState().add({ image, command: trimmed, result });
      set({ result });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      useServerStore.getState().markOffline();
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      controller = null;
      set((s) => ({ status: "idle", inflight: Math.max(0, s.inflight - 1) }));
    }
  },
}));
