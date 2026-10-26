import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderTree, Files, HardDrive } from "lucide-react";
import { AccountBanner } from "@/components/dashboard/AccountBanner";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentFilesCard } from "@/components/dashboard/RecentFilesCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { StorageOverview } from "@/components/dashboard/StorageOverview";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/useAccount";
import { formatBytes } from "@/lib/format";
import { getDashboard } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/_user/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ZetaCloud" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: account } = useAccount();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard(), staleTime: 10_000 });

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Welcome back, {data.username}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.storage.used_bytes > 0
            ? `You are using ${formatBytes(data.storage.used_bytes)} of ${formatBytes(data.storage.quota_bytes)}.`
            : "Your space is ready — upload your first file to get started."}
        </p>
      </div>

      <AccountBanner account={account} />

      <StorageOverview
        storage={data.storage}
        ready={data.storageReady}
        fileCount={data.fileCount}
        folderCount={data.folderCount}
        trashCount={data.trashCount}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={HardDrive} label="Available" value={formatBytes(data.storage.remaining_bytes)} hint="Left in your quota" tone="cyan" />
        <StatCard icon={Files} label="Files" value={data.fileCount} hint={`${data.trashCount} in trash`} tone="violet" />
        <StatCard icon={FolderTree} label="Folders" value={data.folderCount} hint="Keep things tidy" tone="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <QuickActions disabled={!data.storageReady} />
          <RecentFilesCard files={data.recentFiles} />
        </div>
        <ActivityFeed activity={data.activity} />
      </div>
    </div>
  );
}