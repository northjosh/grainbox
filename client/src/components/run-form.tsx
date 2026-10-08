import { Loader2, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IMAGES, MAX_CONCURRENT, SERVER_TIMEOUT_MS, type Image } from "@/lib/api";
import { SNIPPETS } from "@/lib/snippets";
import { useRunnerStore } from "@/lib/store";
import { useRunHotkeys } from "@/lib/use-run-hotkeys";

export function RunForm() {
  const image = useRunnerStore((s) => s.image);
  const command = useRunnerStore((s) => s.command);
  const status = useRunnerStore((s) => s.status);
  const inflight = useRunnerStore((s) => s.inflight);
  const setImage = useRunnerStore((s) => s.setImage);
  const setCommand = useRunnerStore((s) => s.setCommand);
  const run = useRunnerStore((s) => s.run);
  const cancel = useRunnerStore((s) => s.cancel);

  useRunHotkeys();

  const busy = status === "running";
  const atCapacity = inflight >= MAX_CONCURRENT;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="size-4" />
          New run
        </CardTitle>
        <CardDescription>
          Each run boots a fresh microVM. Max {MAX_CONCURRENT} concurrent,{" "}
          {SERVER_TIMEOUT_MS / 1000}s timeout.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="image">Image</Label>
          <Select value={image} onValueChange={(value) => setImage(value as Image)}>
            <SelectTrigger id="image" className="w-full font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGES.map((name) => (
                <SelectItem key={name} value={name} className="font-mono">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="command">Command</Label>
          <Textarea
            id="command"
            value={command}
            spellCheck={false}
            onChange={(e) => setCommand(e.target.value)}
            className="min-h-24 resize-y font-mono text-sm"
            placeholder="uname -a"
          />
          <p className="text-xs text-muted-foreground">
            <kbd className="font-mono">⌘</kbd> + <kbd className="font-mono">↵</kbd> to run,{" "}
            <kbd className="font-mono">esc</kbd> to cancel
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SNIPPETS[image].map((snippet) => (
            <Button
              key={snippet}
              variant="outline"
              size="sm"
              onClick={() => setCommand(snippet)}
              className="h-auto max-w-full justify-start py-1 font-mono text-xs whitespace-normal"
            >
              {snippet}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={busy || !command.trim() || atCapacity}
            onClick={() => void run()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Play />}
            {busy ? "Running" : "Run"}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!busy}
                  onClick={cancel}
                  aria-label="Cancel run"
                />
              }
            >
              <Square />
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
