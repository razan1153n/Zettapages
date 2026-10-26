import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Cloud, FileText, HardDrive, Server, Users } from "lucide-react";
import { StatGrid } from "@/components/admin/StatGrid";
import { WarningsPanel } from "@/components/admin/WarningsPanel";
import { StorageBar } from "@/components/layout/StorageMeter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminOverview } from "@/lib/admin-fns";
import { formatBytes, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminOverview(), staleTime: 10_000 });

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">System overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Capacity, members and storage across every connected repository. All figures come from stored records.
        </p>
      </div>

      <StatGrid
        items={[
          { icon: HardDrive, label: "Total capacity", value: formatBytes(data.total_capacity), hint: `${formatBytes(data.reserved_bytes)} reserved`, tone: "indigo" },
          { icon: Cloud, label: "Stored", value: formatBytes(data.used_bytes), hint: `${data.file_count} file(s)`, tone: "cyan" },
          { icon: Server, label: "Remaining", value: formatBytes(data.remaining_bytes), hint: `${data.connections.length} repository(ies)`, tone: "emerald" },
          { icon: Users, label: "Members", value: data.user_count, hint: `${data.online_users} active in the last 15 min`, tone: "violet" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Distribution across repositories</h2>
            <Button asChild size="sm" variant="ghost" className="text-indigo-600">
              <Link to="/admin/storage">Manage storage</Link>
            </Button>
          </div>

          {data.connections.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No repository is connected. Members cannot upload until you connect one.
            </p>
          ) : (
            <ul className="mt-5 space-y-5">
              {data.connections.map((connection) => (
                <li key={connection.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-900">{connection.label}</span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {formatBytes(connection.used_bytes)} / {formatBytes(connection.capacity_bytes)} · {connection.file_count} file(s)
                    </span>
                  </div>
                  <div className="mt-2">
                    <StorageBar used={connection.used_bytes} total={connection.capacity_bytes} tone="admin" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
            {[
              [FileText, "Files", data.file_count],
              [Users, "Active", data.active_users],
              [Server, "Suspended", data.suspended_users],
            ].map(([Icon, label, value]) => (
              <div key={label}>
                <Icon className="mx-auto h-4 w-4 text-slate-400" aria-hidden="true" />
                <p className="mt-1.5 font-heading text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <WarningsPanel warnings={data.warnings} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Activity className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            Recent administrative activity
          </h2>
          {data.recent_audit.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nothing recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {data.recent_audit.map((entry) => (
                <li key={entry.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2.5 last:border-0">
                  <span className="min-w-0 text-slate-700">
                    <span className="font-medium text-slate-900">{(entry.action || "").replace(/_/g, " ")}</span>
                    {entry.target ? ` · ${entry.target}` : ""}
                  </span>
                  <span className="text-xs text-slate-500">{timeAgo(entry.created_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            Latest transfers
          </h2>
          {data.recent_uploads.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No transfers recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {data.recent_uploads.map((job) => (
                <li key={job.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2.5 last:border-0">
                  <span className="min-w-0 truncate text-slate-700">
                    {job.file_name} <span className="text-xs text-slate-500">({formatBytes(job.size_bytes)})</span>
                  </span>
                  <span className={`text-xs font-semibold ${job.status === "failed" ? "text-rose-600" : "text-emerald-600"}`}>
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}