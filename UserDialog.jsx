import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldOff, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminDeleteUser, adminSetUserStatus, adminUpdateUserQuota, adminUserActivity } from "@/lib/admin-fns";
import { formatBytes, formatDateTime, GB } from "@/lib/format";

const LABELS = {
  uploaded: "Uploaded",
  upload_failed: "Upload failed",
  deleted: "Deleted",
  moved_to_trash: "Moved to trash",
  restored: "Restored",
  renamed: "Renamed",
  folder_created: "Created folder",
  trash_emptied: "Emptied trash",
  share_created: "Share link created",
  share_revoked: "Share link revoked",
  deletion_requested: "Requested deletion",
};

export function UserDialog({ user, open, onOpenChange, onChanged }) {
  const [quotaGb, setQuotaGb] = useState(0);
  const [busy, setBusy] = useState("");

  const activity = useQuery({
    queryKey: ["admin-user-activity", user?.user_id],
    queryFn: () => adminUserActivity({ data: { userId: user.user_id } }),
    enabled: !!user && open,
  });

  useEffect(() => {
    if (user) setQuotaGb(Math.round(((Number(user.quota_bytes) || 0) / GB) * 100) / 100);
  }, [user]);

  if (!user) return null;

  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      await fn();
      toast.success(message);
      onChanged?.();
      if (key !== "quota") onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "That action failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user.username || user.email}</DialogTitle>
          <DialogDescription>
            {user.email} · joined {formatDateTime(user.created_date)} · {user.file_count} file(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center">
            {[
              ["Allocated", formatBytes(user.quota_bytes)],
              ["Used", formatBytes(user.used_bytes)],
              ["Remaining", formatBytes(user.remaining_bytes)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 font-heading text-base font-extrabold tabular-nums text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quota-gb">Allocated storage (GB)</Label>
            <div className="flex gap-2">
              <Input id="quota-gb" type="number" min="0" step="0.5" value={quotaGb} onChange={(event) => setQuotaGb(event.target.value)} className="h-11 rounded-xl" />
              <Button
                className="rounded-xl"
                disabled={busy === "quota"}
                onClick={() =>
                  run("quota", () => adminUpdateUserQuota({ data: { quotaId: user.id, quotaBytes: Math.round((Number(quotaGb) || 0) * GB) } }), "Quota updated")
                }
              >
                {busy === "quota" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Update
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Lowering a quota below what the account already stores is prevented by the server, so existing files stay
              reachable.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Account status</p>
            <p className="mt-1 text-xs text-slate-500">
              Status is enforced by the server on every request: a suspended account cannot read, upload or download.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.status === "suspended" ? (
                <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" disabled={busy === "status"} onClick={() => run("status", () => adminSetUserStatus({ data: { quotaId: user.id, status: "active" } }), "Account reactivated")}>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Reactivate
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" disabled={busy === "status" || user.status === "deleted"} onClick={() => run("status", () => adminSetUserStatus({ data: { quotaId: user.id, status: "suspended" } }), "Account suspended")}>
                  <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Suspend
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-rose-600 hover:text-rose-700"
                disabled={busy === "close" || user.status === "deleted"}
                onClick={() => run("close", () => adminDeleteUser({ data: { quotaId: user.id, purgeFiles: false } }), "Account closed, files preserved")}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Close account
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-rose-600 hover:text-rose-700"
                disabled={busy === "purge" || user.status === "deleted"}
                onClick={() => run("purge", () => adminDeleteUser({ data: { quotaId: user.id, purgeFiles: true } }), "Account closed and files purged")}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Close and purge files
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Recent activity</p>
            {activity.isLoading ? (
              <Loader2 className="mt-3 h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
            ) : (activity.data?.activity ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No activity recorded for this account yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {activity.data.activity.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-slate-600">
                    <span className="min-w-0">
                      <span className="font-medium text-slate-900">{LABELS[entry.action] || entry.action}</span>
                      {entry.item_name ? ` · ${entry.item_name}` : ""}
                    </span>
                    <span>{formatDateTime(entry.created_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* end of administrator user dialog */