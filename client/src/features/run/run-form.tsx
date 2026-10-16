import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IMAGES, MAX_CONCURRENT, SERVER_TIMEOUT_MS, type Image } from "@/lib/api";
import { SNIPPETS } from "./snippets";
import { useRunnerStore } from "./runner-store";

export function RunForm() {
  const image = useRunnerStore((s) => s.image);
  const command = useRunnerStore((s) => s.command);
  const status = useRunnerStore((s) => s.status);
  const inflight = useRunnerStore((s) => s.inflight);
  const setImage = useRunnerStore((s) => s.setImage);
  const setCommand = useRunnerStore((s) => s.setCommand);
  const run = useRunnerStore((s) => s.run);
  const cancel = useRunnerStore((s) => s.cancel);

  const busy = status === "running";
  const atCapacity = inflight >= MAX_CONCURRENT;

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="image" className="font-mono text-xs font-normal text-muted-foreground">
          image
        </Label>
        <Select value={image} onValueChange={(value) => setImage(value as Image)}>
          <SelectTrigger id="image" className="w-full font-mono sm:w-44">
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

      <div className="grid gap-1.5">
        <Label htmlFor="command" className="font-mono text-xs font-normal text-muted-foreground">
          command
        </Label>
        <Textarea
          id="command"
          value={command}
          spellCheck={false}
          onChange={(e) => setCommand(e.target.value)}
          className="min-h-20 resize-y font-mono text-sm"
          placeholder="uname -a"
          autoFocus
        />
      </div>

      <div className="grid gap-0.5">
        {SNIPPETS[image].map((snippet) => (
          <button
            key={snippet}
            type="button"
            onClick={() => setCommand(snippet)}
            className="flex items-baseline gap-2 rounded-sm px-1.5 py-1 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="text-success">$</span>
            <span className="min-w-0 truncate">{snippet}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button
          type="submit"
          className="font-mono"
          disabled={busy || !command.trim() || atCapacity}
        >
          {busy ? "running…" : "run"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="font-mono"
          disabled={!busy}
          onClick={cancel}
        >
          cancel
        </Button>
        <p className="ml-auto hidden font-mono text-xs text-muted-foreground sm:block">
          max {MAX_CONCURRENT} concurrent · {SERVER_TIMEOUT_MS / 1000}s timeout · ⌘/ctrl+↵ run ·
          esc cancel
        </p>
      </div>
    </form>
  );
}
