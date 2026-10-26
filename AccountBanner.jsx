import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown once, on the dashboard, when no administrator account exists yet. */
export function AccountBanner({ account }) {
  if (!account) return null;
  if (account.maintenanceMode) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ZetaCloud is in maintenance mode. Uploads and changes may be paused by the administrator.
      </div>
    );
  }
  if (!account.storageReady) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Storage is not connected yet. Ask the administrator to connect a repository so uploads can start.</span>
      </div>
    );
  }
  if (!account.adminExists) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <span className="font-medium">No administrator has been set up yet.</span>
        <span className="text-muted-foreground">If this workspace is yours, claim the administrator account to connect storage.</span>
        <Button asChild size="sm" variant="outline" className="ml-auto rounded-lg">
          <Link to="/admin">Open the console</Link>
        </Button>
      </div>
    );
  }
  return null;
}