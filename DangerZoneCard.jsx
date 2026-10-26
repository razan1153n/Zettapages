import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestAccountDeletion } from "@/lib/server-fns";

export function DangerZoneCard({ status }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const requested = status === "deletion_requested";

  const confirm = async () => {
    setBusy(true);
    try {
      await requestAccountDeletion({ data: { confirm: true } });
      toast.success("Deletion requested", { description: "The administrator will contact you before anything is removed." });
      setOpen(false);
    } catch (error) {
      toast.error(error.message || "Could not submit the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Close my account
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        This raises a request for the administrator. Nothing is deleted automatically — your files stay available until
        the request is reviewed and confirmed.
      </p>
      {requested && <p className="mt-3 text-sm font-medium text-destructive">A deletion request is already open on this account.</p>}
      <Button variant="destructive" className="mt-4 rounded-xl" disabled={requested} onClick={() => setOpen(true)}>
        Request account deletion
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request account deletion?</DialogTitle>
            <DialogDescription>
              The administrator will see your request in the audit log and can keep or remove your files. You can keep
              signing in until the request is processed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}