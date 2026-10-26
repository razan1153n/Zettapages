import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { claimFoundingAdmin } from "@/lib/admin-fns";

export function AdminAccessRequired({ adminExists }) {
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    try {
      const result = await claimFoundingAdmin();
      if (!result.granted) {
        toast.error(result.reason || "An administrator already exists.");
      } else {
        await refresh();
        queryClient.invalidateQueries();
        toast.success("You are now the administrator");
      }
    } catch (error) {
      toast.error(error.message || "Could not claim the administrator account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold">Administrator access required</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This console manages storage capacity, accounts and audit records, so it is restricted to administrator accounts.
        Members can keep using their own files as usual.
      </p>

      {adminExists === false ? (
        <div className="mt-6 w-full rounded-3xl border border-border bg-card p-5 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            No administrator exists yet
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            If this workspace belongs to you, claim the administrator account now. Once an administrator exists, this
            shortcut disappears and nobody else can become one.
          </p>
          <Button onClick={claim} disabled={busy} className="mt-4 w-full rounded-xl">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Claim administrator account
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/dashboard">Back to my files</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Already an administrator? Sign in through the admin entry point.
          </p>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link to="/admin/login">Administrator sign-in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}