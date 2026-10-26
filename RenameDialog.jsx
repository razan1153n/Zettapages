import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RenameDialog({ target, open, onOpenChange, onSubmit, busy, error }) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (target) setName(target.item?.name ?? "");
  }, [target]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {target?.kind === "folder" ? "folder" : "file"}</DialogTitle>
          <DialogDescription>Choose a new name. The stored file itself stays untouched.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-input">Name</Label>
          <Input
            id="rename-input"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) onSubmit(name.trim());
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || busy} onClick={() => onSubmit(name.trim())}>
            Save name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}