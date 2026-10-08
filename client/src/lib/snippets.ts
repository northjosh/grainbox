import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, XCircle } from "lucide-react";

import type { Image, RunOutcome } from "./api";

export const SNIPPETS: Record<Image, readonly string[]> = {
  python: [
    `python -c "print('hello from a microVM!')"`,
    "python -V && pip list",
    "uname -a && free -m",
  ],
  debian: ["uname -a && cat /etc/os-release", "free -m", "ls -la /"],
  alpine: ["cat /etc/os-release", "apk info | head -20", "uname -a && df -h"],
};

export type OutcomeBadgeVariant = "secondary" | "destructive" | "success" | "warning";

export interface OutcomeMeta {
  label: string;
  icon: LucideIcon;
  badge: OutcomeBadgeVariant;
}

export const OUTCOME_META: Record<RunOutcome, OutcomeMeta> = {
  success: { label: "success", icon: CheckCircle2, badge: "success" },
  "bad-image": { label: "rejected", icon: CircleSlash, badge: "secondary" },
  busy: { label: "at capacity", icon: AlertTriangle, badge: "warning" },
  timeout: { label: "timed out", icon: Clock, badge: "warning" },
  error: { label: "failed", icon: XCircle, badge: "destructive" },
};

export const FAILURE_TITLES: Record<Exclude<RunOutcome, "success">, string> = {
  "bad-image": "Image not allowed",
  busy: "Server at capacity",
  timeout: "Command timed out",
  error: "Server error",
};
