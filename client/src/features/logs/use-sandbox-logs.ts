import { useCallback, useEffect, useState } from "react";

const MAX_LINES = 500;

export type LogStreamStatus = "connecting" | "open" | "reconnecting" | "closed";

/**
 * Subscribes to a sandbox's SSE log stream. EventSource reconnects on its
 * own; we only surface the status and buffer the latest lines.
 */
export function useSandboxLogs(sandboxName: string) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<LogStreamStatus>("connecting");

  useEffect(() => {
    setLines([]);
    setStatus("connecting");

    const source = new EventSource(`/api/sandboxes/${encodeURIComponent(sandboxName)}/log-stream`);

    source.onopen = () => setStatus("open");

    source.addEventListener("log-stream", (event) => {
      const data = (event as MessageEvent<string>).data;
      if (!data) return;
      const incoming = data.split("\n");
      setLines((current) => {
        const next = [...current, ...incoming];
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    });

    source.onerror = () => {
      setStatus(source.readyState === EventSource.CLOSED ? "closed" : "reconnecting");
    };

    return () => source.close();
  }, [sandboxName]);

  const clear = useCallback(() => setLines([]), []);

  return { lines, status, clear };
}
