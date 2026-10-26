import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminSaveConnection } from "@/lib/admin-fns";

const EMPTY = { label: "", repoId: "", repoType: "dataset", accessToken: "", capacityGb: 100, notes: "", createIfMissing: true };

export function ConnectionDialog({ open, onOpenChange, connection, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ busy: "", error: "", test: null });

  useEffect(() => {
    if (!open) return;
    setState({ busy: "", error: "", test: null });
    setForm(
      connection
        ? {
            label: connection.label || "",
            repoId: connection.repo_id || "",
            repoType: connection.repo_type || "dataset",
            accessToken: "",
            capacityGb: Math.round(((Number(connection.capacity_bytes) || 0) / 1024 ** 3) * 100) / 100,
            notes: connection.notes || "",
            createIfMissing: false,
          }
        : EMPTY,
    );
  }, [open, connection]);

  const call = async (testOnly) => {
    setState({ busy: testOnly ? "test" : "save", error: "", test: null });
    try {
      const result = await adminSaveConnection({
        data: {
          id: connection?.id,
          label: form.label.trim(),
          repoId: form.repoId.trim(),
          repoType: form.repoType,
          accessToken: form.accessToken.trim() || undefined,
          capacityGb: Number(form.capacityGb) || 0,
          notes: form.notes,
          createIfMissing: form.createIfMissing,
          testOnly,
        },
      });
      if (testOnly) {
        setState({ busy: "", error: "", test: result.test });
      } else {
        setState({ busy: "", error: "", test: result.test });
        onSaved?.();
        onOpenChange(false);
      }
    } catch (error) {
      setState({ busy: "", error: error.message || "That did not work.", test: null });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{connection ? "Edit storage repository" : "Connect a storage repository"}</DialogTitle>
          <DialogDescription>
            Files are stored as private dataset repositories on the storage provider. The access token is kept on the
            server and is never sent to a browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conn-label">Display name</Label>
            <Input id="conn-label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="e.g. Primary repository" className="h-11 rounded-xl" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <div className="space-y-2">
              <Label htmlFor="conn-repo">Repository id</Label>
              <Input id="conn-repo" value={form.repoId} onChange={(event) => setForm({ ...form, repoId: event.target.value })} placeholder="workspace/storage-name" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-type">Repository type</Label>
              <Select value={form.repoType} onValueChange={(value) => setForm({ ...form, repoType: value })}>
                <SelectTrigger id="conn-type" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dataset">Dataset</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-token">Access token</Label>
            <Input
              id="conn-token"
              type="password"
              value={form.accessToken}
              onChange={(event) => setForm({ ...form, accessToken: event.target.value })}
              placeholder={connection?.has_token ? `Saved (${connection.token_preview}) — leave blank to keep` : "Write-access token with repository scope"}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Stored server-side only. It is never returned by any API response.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="conn-capacity">Capacity to allocate (GB)</Label>
              <Input
                id="conn-capacity"
                type="number"
                min="0"
                step="1"
                value={form.capacityGb}
                onChange={(event) => setForm({ ...form, capacityGb: event.target.value })}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">How much of this repository ZetaCloud may use for user quotas.</p>
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-3">
                <Switch id="conn-create" checked={form.createIfMissing} onCheckedChange={(value) => setForm({ ...form, createIfMissing: value })} />
                <Label htmlFor="conn-create" className="text-sm">
                  Create it if missing
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-notes">Notes</Label>
            <Textarea id="conn-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} className="rounded-xl" placeholder="Optional internal note" />
          </div>

          {state.test && (
            <p className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${state.test.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {state.test.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>
                {state.test.message}
                {state.test.ok && state.test.reportedBytes
                  ? ` · provider reports ${(state.test.reportedBytes / 1024 ** 3).toFixed(2)} GB stored.`
                  : ""}
              </span>
            </p>
          )}
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => call(true)} disabled={!!state.busy || !form.repoId.trim()}>
            {state.busy === "test" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Test connection
          </Button>
          <Button onClick={() => call(false)} disabled={!!state.busy || !form.label.trim() || !form.repoId.trim()}>
            {state.busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {connection ? "Save repository" : "Connect repository"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}