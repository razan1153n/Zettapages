import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ConnectionsPanel } from "@/components/admin/ConnectionsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { adminListConnections } from "@/lib/admin-fns";

export const Route = createFileRoute("/_authed/admin/storage")({
  component: AdminStoragePage,
});

function AdminStoragePage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-connections"],
    queryFn: () => adminListConnections(),
    staleTime: 10_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Storage</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect the repositories ZetaCloud stores user files in, and control how much of each one may be used.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : (
        <ConnectionsPanel connections={data ?? []} onChanged={refetch} />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">How this works</h2>
        <ul className="mt-3 space-y-2">
          <li>Each repository is a private dataset on the storage provider. Files are written there directly from the server.</li>
          <li>Access tokens are stored server-side and never appear in a browser request or API response.</li>
          <li>Uploads are distributed across enabled repositories that still have room; a full repository is skipped automatically.</li>
          <li>Capacity you set here is the pool divided into member quotas. Change the policy under Policies, then recalculate.</li>
          <li>Members never see repository names, tokens or provider branding — only their ZetaCloud quota.</li>
        </ul>
      </section>
    </div>
  );
}