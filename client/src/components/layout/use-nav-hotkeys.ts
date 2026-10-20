import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { isTypingTarget } from "@/lib/hotkeys";

const CHORDS = {
  r: "/",
  h: "/runs",
  b: "/sandboxes",
  s: "/snapshots",
} as const;

const CHORD_TIMEOUT_MS = 1_200;

/**
 * GitHub-style `g` chords: press g, then r/h/b/s to jump to a page.
 * Ignored while typing or when a modifier is held.
 */
export function useNavHotkeys() {
  const navigate = useNavigate();

  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function reset() {
      armed = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();

      if (armed) {
        reset();
        const to = CHORDS[key as keyof typeof CHORDS];
        if (to) {
          e.preventDefault();
          void navigate({ to });
        }
        return;
      }

      if (key === "g") {
        armed = true;
        timer = setTimeout(reset, CHORD_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      reset();
    };
  }, [navigate]);
}
