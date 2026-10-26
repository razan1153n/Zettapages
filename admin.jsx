import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminAccessRequired } from "@/components/admin/AdminAccessRequired";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authed/admin")({
  head: () => ({ meta: [{ title: "Admin console — ZetaCloud" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const { data: account, isLoading } = useAccount();
  const role = account?.user?.role ?? user?.role;

  if (isLoading && !account) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="bg-slate-50 px-4 py-6">
        <AdminAccessRequired adminExists={account?.adminExists} />
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}