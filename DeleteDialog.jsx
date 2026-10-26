import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteDialog({ open, onOpenChange, mode, count, names = [], onConfirm, busy, error }) {
  const permanent = mode === "forever";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {permanent && <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />}
            {permanent ? "Delete permanently?" : "Move to trash?"}
          </DialogTitle>
          <DialogDescription>
            {permanent
              ? `This removes ${count} item${count === 1 ? "" : "s"} from storage for good. This cannot be undone.`
              : `${count} item${count === 1 ? "" : "s"} will move to the trash. You can restore them until you empty it.`}
          </DialogDescription>
        </DialogHeader>
        {names.length > 0 && (
          <ul className="max-h-32 space-y-1 overflow-auto rounded-xl bg-secondary/60 p-3 text-sm">
            {names.slice(0, 6).map((name) => (
              <li key={name} className="truncate">
                {name}
              </li>
            ))}
            {names.length > 6 && <li className="text-muted-foreground">and {names.length - 6} more…</li>}
          </ul>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={permanent ? "destructive" : "default"} disabled={busy} onClick={onConfirm}>
            {permanent ? "Delete forever" : "Move to trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}