import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Image, RunResult } from '../api'

export interface RunEntry {
  id: string
  image: Image
  command: string
  result: RunResult
}

const MAX_ENTRIES = 50

interface HistoryState {
  entries: RunEntry[]
  /** Newest first. */
  add: (entry: Omit<RunEntry, 'id'>) => void
  remove: (id: string) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],

      add: (entry) =>
        set((s) => ({
          entries: [
            { ...entry, id: crypto.randomUUID() },
            ...s.entries,
          ].slice(0, MAX_ENTRIES),
        })),

      remove: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      clear: () => set({ entries: [] }),
    }),
    { name: 'sbx.history', version: 1 },
  ),
)