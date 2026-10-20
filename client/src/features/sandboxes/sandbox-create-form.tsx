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
import { formatMemory } from "@/lib/resources";

const CPU_OPTIONS = [1, 2];
const MEMORY_OPTIONS = [256, 512];
const DISK_OPTIONS = [2048, 4096, 8192];

export function SandboxCreateForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<Image>("alpine");
  const [cpu, setCpu] = useState(1);
  const [memory, setMemory] = useState(512);
  const [disk, setDisk] = useState(8192);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    try {
      await createSandbox(trimmed, image, { cpu, memory, disk });
      setName("");
      onCreated(trimmed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
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
          autoFocus
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
          <SelectTrigger id="sandbox-image" className="w-full font-mono">
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

      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label
            htmlFor="sandbox-cpu"
            className="font-mono text-xs font-normal text-muted-foreground"
          >
            cpu
          </Label>
          <Select value={String(cpu)} onValueChange={(value) => setCpu(Number(value))}>
            <SelectTrigger id="sandbox-cpu" className="w-full font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CPU_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)} className="font-mono">
                  {option} vcpu
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="sandbox-memory"
            className="font-mono text-xs font-normal text-muted-foreground"
          >
            memory
          </Label>
          <Select value={String(memory)} onValueChange={(value) => setMemory(Number(value))}>
            <SelectTrigger id="sandbox-memory" className="w-full font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)} className="font-mono">
                  {option} MB
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="sandbox-disk"
            className="font-mono text-xs font-normal text-muted-foreground"
          >
            disk
          </Label>
          <Select value={String(disk)} onValueChange={(value) => setDisk(Number(value))}>
            <SelectTrigger id="sandbox-disk" className="w-full font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISK_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)} className="font-mono">
                  {formatMemory(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full font-mono" disabled={!name.trim() || pending}>
        {pending ? "creating…" : "create"}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
