import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Loader2, RotateCcw, Terminal, Timer, XCircle } from "lucide-react";

import { HistoryList } from "@/components/history-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FAILURE_TITLES, OUTCOME_META } from "@/lib/snippets";
import { useHistoryStore, useRunnerStore } from "@/lib/store";

export function OutputPanel() {
  const status = useRunnerStore((s) => s.status);
  const result = useRunnerStore((s) => s.result);
  const error = useRunnerStore((s) => s.error);
  const image = useRunnerStore((s) => s.image);
  const clear = useRunnerStore((s) => s.clear);
  const historyCount = useHistoryStore((s) => s.entries.length);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyOutput() {
    if (!result?.stdout) return;
    try {
      await navigator.clipboard.writeText(result.stdout);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const busy = status === "running";
  const meta = result ? OUTCOME_META[result.outcome] : null;
  const StatusIcon = meta?.icon;
  const FailureIcon = result && result.outcome !== "success" ? meta?.icon : null;

  return (
    <Card className="min-h-0 gap-0 py-0">
      <Tabs defaultValue="output" className="min-h-0 gap-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <TabsList>
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="history">
              History
              {historyCount > 0 ? ` (${historyCount})` : ""}
            </TabsTrigger>
          </TabsList>

          <div className="ml-auto flex items-center gap-2">
            {busy ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="animate-spin" />
                running
              </Badge>
            ) : null}

            {result ? (
              <>
                <Badge variant={meta?.badge} className="gap-1">
                  {StatusIcon ? <StatusIcon /> : null}
                  {meta?.label}
                </Badge>
                <Badge variant="outline" className="gap-1 font-mono">
                  <Timer />
                  {(result.durationMs / 1000).toFixed(2)}s
                </Badge>
              </>
            ) : null}

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!result?.stdout}
                    onClick={() => void copyOutput()}
                    aria-label="Copy output"
                  />
                }
              >
                {copied ? <CheckCircle2 /> : <Copy />}
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy || (!result && !error)}
                    onClick={clear}
                    aria-label="Clear output"
                  />
                }
              >
                <RotateCcw />
              </TooltipTrigger>
              <TooltipContent>Clear</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <TabsContent value="output" className="min-h-0">
          <div className="px-4 py-3">
            {error ? (
              <Alert variant="destructive">
                <XCircle />
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : busy ? (
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Booting microVM
                  <span className="font-mono text-muted-foreground">{image}</span>
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : result ? (
              <div className="grid gap-3">
                {result.outcome !== "success" ? (
                  <Alert variant={result.outcome === "error" ? "destructive" : "warning"}>
                    {FailureIcon ? <FailureIcon /> : null}
                    <AlertTitle>{FAILURE_TITLES[result.outcome]}</AlertTitle>
                    <AlertDescription>
                      HTTP {result.httpStatus} · {result.stdout}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {result.stdout ? (
                  <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-sm whitespace-pre-wrap break-words">
                    {result.stdout}
                  </pre>
                ) : result.outcome === "success" ? (
                  <p className="text-sm text-muted-foreground">Command produced no output.</p>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No output yet" body="Pick an image and hit Run." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="min-h-0">
          <HistoryList />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center gap-1 py-10 text-center">
      <Terminal className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
