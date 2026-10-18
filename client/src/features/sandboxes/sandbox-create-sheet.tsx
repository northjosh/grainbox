import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { SandboxCreateForm } from "./sandbox-create-form";

type SandboxCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (name: string) => void;
};

/** Right-side sheet holding the sandbox creation form. */
export function SandboxCreateSheet({ open, onOpenChange, onCreated }: SandboxCreateSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 w-[min(92vw,24rem)] overflow-y-auto border-l bg-background p-5 shadow-lg outline-none transition-transform duration-200 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-mono text-sm font-medium">new sandbox</Dialog.Title>
            <Dialog.Close
              title="Close"
              aria-label="Close"
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
            >
              <X />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 font-mono text-xs text-muted-foreground">
            persistent VM — keeps its disk between commands
          </Dialog.Description>

          <div className="mt-5">
            <SandboxCreateForm onCreated={onCreated} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
