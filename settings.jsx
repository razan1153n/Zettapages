import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityCard } from "@/components/settings/ActivityCard";
import { DangerZoneCard } from "@/components/settings/DangerZoneCard";
import { NotificationsCard } from "@/components/settings/NotificationsCard";
import { PasswordCard } from "@/components/settings/PasswordCard";
import { PrivacyCard } from "@/components/settings/PrivacyCard";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { StorageCard } from "@/components/settings/StorageCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettingsPage } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/_user/settings")({
  head: () => ({ meta: [{ title: "Settings — ZetaCloud" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => getSettingsPage(), staleTime: 10_000 });

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, security and storage preferences.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ProfileCard profile={data.profile} />
          <PasswordCard email={data.profile.email} />
          <NotificationsCard initial={data.notifications} />
        </div>
        <div className="space-y-5">
          <StorageCard
            storage={data.storage}
            quota={data.quota}
            profile={data.profile}
            fileCount={data.fileCount}
            folderCount={data.folderCount}
            trashCount={data.trashCount}
          />
          <PrivacyCard email={data.profile.email} role={data.profile.role} />
          <ActivityCard activity={data.activity} />
          <DangerZoneCard status={data.quota.status} />
        </div>
      </div>
    </div>
  );
}