import { useState } from "react";
import { AlertTriangle, HardDrive, Loader2, Pencil, Plug, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConnectionDialog } from "@/components/admin/ConnectionDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { StorageBar } from "@/components/layout/StorageMeter";
import { adminDeleteConnection, adminTestConnection, adminUpdateConnection } from "@/lib/admin-fns";
import { formatBytes, formatDateTime } from "@/lib/format";

const STATUS = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  disabled: "border-slate-200 bg-slate-100 text-slate-600",
};

export function ConnectionsPanel({ connections = [], onChanged }) {
  const [dialog, setDialog] = useState({ open: false, connection: null });
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState("");

  const test = async (connection) => {
    setBusy(connection.id);
    try {
      const { test: result } = await adminTestConnection({ data: { id: connection.id } });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Could not reach the provider.");
    } finally {
      setBusy("");
    }
  };

  const toggle = async (connection, isActive) => {
    setBusy(connection.id);
    try {
      await adminUpdateConnection({
        data: { id: connection.id, capacityGb: (Number(connection.capacity_bytes) || 0) / 1024 ** 3, isActive },
      });
      toast.success(isActive ? "Repository enabled" : "Repository disabled");
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Could not update the repository.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    setBusy(removing.id);
    try {
      await adminDeleteConnection({ data: { id: removing.id } });
      toast.success("Repository disconnected");
      setRemoving(null);
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Could not disconnect the repository.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Storage repositories</h2>
          <p className="text-xs text-slate-500">Connect accounts the system may distribute user files across.</p>
        </div>
        <Button className="ml-auto gap-2 rounded-xl" onClick={() => setDialog({ open: true, connection: null })}>
          <Plug className="h-4 w-4" aria-hidden="true" />
          Connect repository
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <HardDrive className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold text-slate-900">No storage connected</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Until a repository is connected, the system has no physical capacity and every upload is refused. Add one to
            give your members usable space.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {connections.map((connection) => {
            const capacity = Number(connection.capacity_bytes) || 0;
            return (
              <div key={connection.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
                    <HardDrive className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{connection.label}</p>
                    <p className="truncate font-mono text-xs text-slate-500">
                      {connection.repo_type}/{connection.repo_id}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS[connection.status] || STATUS.disabled}`}>
                    {connection.is_active === false ? "disabled" : connection.status}
                  </span>
                </div>

                <div className="mt-4">
                  <StorageBar used={connection.used_bytes} total={capacity} tone="admin" />
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>
                      <span className="font-semibold text-slate-900">{formatBytes(connection.used_bytes)}</span> of {formatBytes(capacity)} used
                    </span>
                    <span>{connection.file_count} file(s)</span>
                  </div>
                </div>

                <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <dt>Access token</dt>
                    <dd className="font-mono">{connection.token_preview || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Last checked</dt>
                    <dd>{connection.last_checked ? formatDateTime(connection.last_checked) : "never"}</dd>
                  </div>
                </dl>

                {connection.last_error && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {connection.last_error}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => test(connection)} disabled={busy === connection.id}>
                    {busy === connection.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                    Test
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setDialog({ open: true, connection })}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Switch
                      checked={connection.is_active !== false}
                      onCheckedChange={(value) => toggle(connection, value)}
                      aria-label={`Enable ${connection.label}`}
                    />
                    Enabled
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto gap-1.5 text-rose-600 hover:text-rose-700"
                    onClick={() => setRemoving(connection)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Disconnect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConnectionDialog open={dialog.open} onOpenChange={(open) => setDialog({ open, connection: open ? dialog.connection : null })} connection={dialog.connection} onSaved={onChanged} />

      <Dialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect this repository?</DialogTitle>
            <DialogDescription>
              {removing?.file_count > 0
                ? `This repository still holds ${removing.file_count} file(s). Remove or move them first so no stored file is orphaned.`
                : "No files are stored here, so it can be disconnected safely. The repository itself is left untouched on the provider."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={busy === removing?.id || removing?.file_count > 0}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}