import { useEffect, useState } from "react";

import { getSandbox, type PersistentSandbox } from "@/lib/api";

export function useSandbox(name: string) {
  const [sandbox, setSandbox] = useState<PersistentSandbox | null>(null);

  useEffect(() => {
    let live = true;
    setSandbox(null);

    getSandbox(name)
      .then((next) => {
        if (live) setSandbox(next);
      })
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [name]);

  return sandbox;
}
