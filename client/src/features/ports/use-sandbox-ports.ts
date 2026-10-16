import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { closePort, exposePort, listPorts, pollPorts, type SandboxPort } from "@/lib/api";
import { portHref } from "./port-url";

const POLL_INTERVAL_MS = 30_000;

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Watches one sandbox for new listening ports: refreshes the exposed list,
 * scans every 30s, and toasts with an "expose" action on each new discovery.
 * Discovered ports stay in `detected` even if the toast is ignored.
 */
export function useSandboxPorts(sandboxName: string) {
  const [ports, setPorts] = useState<SandboxPort[]>([]);
  const [detected, setDetected] = useState<number[]>([]);
  const [scanning, setScanning] = useState(false);
  const [working, setWorking] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exposedRef = useRef<Set<number>>(new Set());
  const detectedRef = useRef<Set<number>>(new Set());
  const scanningRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await listPorts(sandboxName);
      exposedRef.current = new Set(next.map((port) => Number(port.number)));
      setPorts(next);
      setError(null);
    } catch (cause) {
      setError(message(cause));
    }
  }, [sandboxName]);

  const expose = useCallback(
    async (port: number) => {
      setWorking(port);
      setError(null);
      try {
        const created = await exposePort(sandboxName, port);
        exposedRef.current.add(port);
        detectedRef.current.delete(port);
        setDetected((current) => current.filter((value) => value !== port));
        setPorts((current) => [...current, created]);

        const href = portHref(created.url);
        toast.success(`port ${port} exposed`, {
          id: `exposed-${sandboxName}-${port}`,
          description: created.url ?? undefined,
          duration: 8_000,
          action: href
            ? { label: "open", onClick: () => window.open(href, "_blank", "noreferrer") }
            : undefined,
        });
      } catch (cause) {
        setError(message(cause));
        toast.error(`could not expose port ${port}`, {
          description: message(cause),
        });
      } finally {
        setWorking(null);
      }
    },
    [sandboxName],
  );

  const scan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    try {
      const found = await pollPorts(sandboxName);
      const fresh = found.filter(
        (port) => !exposedRef.current.has(port) && !detectedRef.current.has(port),
      );
      if (fresh.length > 0) {
        detectedRef.current = new Set([...detectedRef.current, ...fresh]);
        setDetected((current) => [...new Set([...current, ...fresh])].sort((a, b) => a - b));
        for (const port of fresh) {
          toast(`port ${port} detected`, {
            id: `detected-${sandboxName}-${port}`,
            description: `${sandboxName} is listening on it — not exposed yet`,
            duration: 10_000,
            action: { label: "expose", onClick: () => void expose(port) },
          });
        }
      }
    } catch {
      // Best effort: the sandbox may be stopped or unreachable.
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [sandboxName, expose]);

  const close = useCallback(
    async (port: SandboxPort) => {
      setWorking(port.id);
      setError(null);
      try {
        await closePort(sandboxName, port.id);
        exposedRef.current.delete(Number(port.number));
        setPorts((current) => current.filter((entry) => entry.id !== port.id));
      } catch (cause) {
        setError(message(cause));
      } finally {
        setWorking(null);
      }
    },
    [sandboxName],
  );

  useEffect(() => {
    void refresh();
    void scan();
    const id = setInterval(() => void scan(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh, scan]);

  const rescan = useCallback(() => {
    void refresh();
    void scan();
  }, [refresh, scan]);

  return { ports, detected, scanning, working, error, rescan, expose, close };
}
