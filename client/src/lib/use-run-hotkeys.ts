import { useEffect } from 'react'

import { useRunnerStore } from './store'

/**
 * ⌘/Ctrl + Enter runs, Escape cancels. Bound at the window so it works from
 * anywhere on the page, including while focus is inside the textarea.
 */
export function useRunHotkeys() {
  const run = useRunnerStore((s) => s.run)
  const cancel = useRunnerStore((s) => s.cancel)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void run()
        return
      }
      if (e.key === 'Escape') {
        cancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [run, cancel])
}