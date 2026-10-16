import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, XCircle } from "lucide-react";

import type { Image, RunOutcome } from "@/lib/api";

export const SNIPPETS: Record<Image, readonly string[]> = {
  python: [
    `python -c "print('hello from a microVM!')"`,
    "python -V && pip list",
    "uname -a && free -m",
  ],
  debian: ["uname -a && cat /etc/os-release", "free -m", "ls -la /"],
  alpine: ["cat /etc/os-release", "apk info | head -20", "uname -a && df -h"],
};

export interface OutcomeMeta {
  label: string;
  icon: LucideIcon;
  /** Text color for the outcome label on plain surfaces. */
  textClass: string;
}

export const OUTCOME_META: Record<RunOutcome, OutcomeMeta> = {
  success: { label: "success", icon: CheckCircle2, textClass: "text-success" },
  "bad-image": { label: "rejected", icon: CircleSlash, textClass: "text-muted-foreground" },
  busy: { label: "at capacity", icon: AlertTriangle, textClass: "text-warning" },
  timeout: { label: "timed out", icon: Clock, textClass: "text-warning" },
  error: { label: "failed", icon: XCircle, textClass: "text-destructive" },
};

export const FAILURE_TITLES: Record<Exclude<RunOutcome, "success">, string> = {
  "bad-image": "Image not allowed",
  busy: "Server at capacity",
  timeout: "Command timed out",
  error: "Server error",
};
