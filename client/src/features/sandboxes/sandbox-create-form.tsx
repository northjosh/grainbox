import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMAGES, createSandbox, type Image } from "@/lib/api";

export function SandboxCreateForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<Image>("alpine");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    try {
      await createSandbox(trimmed, image);
      setName("");
      onCreated(trimmed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-wrap items-end gap-3 border-y py-4">
      <div className="grid gap-1.5">
        <Label
          htmlFor="sandbox-name"
          className="font-mono text-xs font-normal text-muted-foreground"
        >
          name
        </Label>
        <Input
          id="sandbox-name"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          maxLength={31}
          pattern="[a-z0-9][a-z0-9-]{1,30}"
          placeholder="my-sandbox"
          autoComplete="off"
          required
          className="font-mono"
        />
      </div>

      <div className="grid gap-1.5">
        <Label
          htmlFor="sandbox-image"
          className="font-mono text-xs font-normal text-muted-foreground"
        >
          image
        </Label>
        <Select value={image} onValueChange={(value) => setImage(value as Image)}>
          <SelectTrigger id="sandbox-image" className="w-36 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGES.map((option) => (
              <SelectItem key={option} value={option} className="font-mono">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="font-mono" disabled={!name.trim() || pending}>
        {pending ? "creating…" : "create"}
      </Button>

      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
