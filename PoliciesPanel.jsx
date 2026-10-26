import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminGetSettings, adminRecomputeAllocations, adminSaveSettings } from "@/lib/admin-fns";
import { formatBytes, GB } from "@/lib/format";

export function PoliciesPanel({ onChanged }) {
  const query = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminGetSettings(), staleTime: 5_000 });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState("");
  const [force, setForce] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const settings = query.data?.settings;
    if (!settings) return;
    setForm({
      allocation_policy: settings.allocation_policy,
      default_quota_gb: Math.round((settings.default_quota_bytes / GB) * 100) / 100,
      min_quota_gb: Math.round((settings.min_quota_bytes / GB) * 100) / 100,
      max_file_mb: Math.round(settings.max_file_bytes / (1024 * 1024)),
      reserved_gb: Math.round((settings.reserved_bytes / GB) * 100) / 100,
      registration_enabled: settings.registration_enabled,
      maintenance_mode: settings.maintenance_mode,
      low_storage_threshold: settings.low_storage_threshold,
    });
  }, [query.data]);

  if (query.isLoading || !form) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  const capacity = query.data.capacity;

  const save = async () => {
    setBusy("save");
    try {
      await adminSaveSettings({
        data: {
          allocation_policy: form.allocation_policy,
          default_quota_gb: Number(form.default_quota_gb) || 0,
          min_quota_gb: Number(form.min_quota_gb) || 0,
          max_file_mb: Number(form.max_file_mb) || 1,
          reserved_gb: Number(form.reserved_gb) || 0,
          registration_enabled: form.registration_enabled,
          maintenance_mode: form.maintenance_mode,
          low_storage_threshold: Number(form.low_storage_threshold) || 15,
        },
      });
      toast.success("Policies saved");
      query.refetch();
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Could not save the policies.");
    } finally {
      setBusy("");
    }
  };

  const recompute = async () => {
    setBusy("recompute");
    try {
      const outcome = await adminRecomputeAllocations({ data: { force } });
      setResult(outcome);
      toast.success(`${outcome.changes} quota(s) updated`);
      query.refetch();
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "Could not recalculate allocations.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Allocation and policy</h2>
        <p className="text-xs text-slate-500">
          These rules decide how connected capacity is turned into per-user quotas, and what members are allowed to do.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Total connected", formatBytes(capacity.total)],
            ["Reserved pool", formatBytes(capacity.reserved)],
            ["Usable for quotas", formatBytes(capacity.usable)],
            ["Stored so far", formatBytes(capacity.used)],
            ["Remaining", formatBytes(capacity.remaining)],
            ["Accounts", String(query.data.user_count)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 font-heading text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="policy">Allocation policy</Label>
            <Select value={form.allocation_policy} onValueChange={(value) => setForm({ ...form, allocation_policy: value })}>
              <SelectTrigger id="policy" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal share of usable capacity</SelectItem>
                <SelectItem value="fixed">Fixed quota for every account</SelectItem>
                <SelectItem value="proportional">Proportional to existing quotas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-quota">New account quota (GB)</Label>
            <Input id="default-quota" type="number" min="0" step="0.5" value={form.default_quota_gb} onChange={(event) => setForm({ ...form, default_quota_gb: event.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-quota">Minimum quota (GB)</Label>
            <Input id="min-quota" type="number" min="0" step="0.5" value={form.min_quota_gb} onChange={(event) => setForm({ ...form, min_quota_gb: event.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reserved">Reserved capacity (GB)</Label>
            <Input id="reserved" type="number" min="0" step="0.5" value={form.reserved_gb} onChange={(event) => setForm({ ...form, reserved_gb: event.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-file">Maximum file size (MB)</Label>
            <Input id="max-file" type="number" min="1" step="1" value={form.max_file_mb} onChange={(event) => setForm({ ...form, max_file_mb: event.target.value })} className="h-11 rounded-xl" />
            <p className="text-xs text-slate-500">The platform accepts up to 95 MB per request; larger values are capped by the server.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="low-threshold">Low storage warning (%)</Label>
            <Input id="low-threshold" type="number" min="1" max="90" value={form.low_storage_threshold} onChange={(event) => setForm({ ...form, low_storage_threshold: event.target.value })} className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Registration open</p>
              <p className="text-xs text-slate-500">New members can create their own accounts.</p>
            </div>
            <Switch checked={form.registration_enabled} onCheckedChange={(value) => setForm({ ...form, registration_enabled: value })} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Maintenance mode</p>
              <p className="text-xs text-slate-500">Show members a maintenance notice.</p>
            </div>
            <Switch checked={form.maintenance_mode} onCheckedChange={(value) => setForm({ ...form, maintenance_mode: value })} />
          </div>
        </div>

        <Button onClick={save} disabled={busy === "save"} className="rounded-xl">
          {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
          Save policies
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Recalculate user allocations</h3>
          <p className="mt-1 text-xs text-slate-500">
            Runs the selected policy across every account. By default quotas may only grow — and never below what an
            account already stores — so nobody's files become unreachable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Switch id="force" checked={force} onCheckedChange={setForce} />
            <Label htmlFor="force" className="text-sm">
              Force exact policy values
            </Label>
          </div>
          <Button variant="outline" onClick={recompute} disabled={busy === "recompute"} className="ml-auto rounded-xl">
            {busy === "recompute" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
            Recalculate allocations
          </Button>
        </div>
        {result && (
          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            <p>
              Policy <span className="font-semibold text-slate-900">{result.policy}</span> · {result.users} account(s) · {result.changes} quot
              {result.changes === 1 ? "a" : "as"} updated · usable capacity {formatBytes(result.total_capacity)}.
            </p>
            {result.over_capacity && (
              <p className="mt-2 font-semibold text-rose-700">
                Stored data exceeds usable capacity. Add a repository or raise a repository's capacity.
              </p>
            )}
            {result.shortfalls.length > 0 && (
              <p className="mt-2 font-semibold text-amber-700">
                {result.shortfalls.length} account(s) store more than their policy target; their quotas were left high
                enough to keep those files accessible.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}