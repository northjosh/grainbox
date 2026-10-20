import { useEffect, useState } from "react";

export type MetricsStatus = "connecting" | "open" | "closed";

export interface LiveMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  memoryFree?: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
}

/** Subscribes to the sandbox metrics SSE stream while mounted. */
export function useLiveMetrics(sandboxName: string) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [status, setStatus] = useState<MetricsStatus>("connecting");

  useEffect(() => {
    setMetrics(null);
    setStatus("connecting");

    const source = new EventSource(
      `/api/sandboxes/${encodeURIComponent(sandboxName)}/live-metrics`,
    );

    source.onopen = () => setStatus("open");

    source.addEventListener("metrics-stream", (event) => {
      const data = (event as MessageEvent<string>).data;
      if (!data) return;
      try {
        setMetrics(JSON.parse(data) as LiveMetrics);
      } catch {
        // Ignore malformed frames; the next sample arrives in a second.
      }
    });

    source.onerror = () => {
      setStatus(source.readyState === EventSource.CLOSED ? "closed" : "connecting");
    };

    return () => source.close();
  }, [sandboxName]);

  return { metrics, status };
}
