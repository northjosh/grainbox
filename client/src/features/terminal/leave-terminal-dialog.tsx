import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";

type LeaveTerminalDialogProps = {
  open: boolean;
  sessionCount: number;
  onLeave: () => void;
  onStay: () => void;
};

/** Confirms leaving (or reloading) the terminal page while shells are live. */
export function LeaveTerminalDialog({
  open,
  sessionCount,
  onLeave,
  onStay,
}: LeaveTerminalDialogProps) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onStay();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg">
          <AlertDialog.Title className="font-mono text-sm font-medium">
            leave the terminal?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 font-mono text-xs text-muted-foreground">
            {sessionCount === 1
              ? "1 shell session is active and will be disconnected."
              : `${sessionCount} shell sessions are active and will be disconnected.`}
          </AlertDialog.Description>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="font-mono" onClick={onStay}>
              stay
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="font-mono"
              onClick={onLeave}
            >
              leave
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
