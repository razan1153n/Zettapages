import { HardDrive } from "lucide-react";
import { StorageBar } from "@/components/layout/StorageMeter";
import { formatBytes, formatDateTime } from "@/lib/format";

export function StorageCard({ storage, quota, profile, fileCount, folderCount, trashCount }) {
  const rows = [
    ["Total allocated", formatBytes(storage?.quota_bytes)],
    ["Used", formatBytes(storage?.used_bytes)],
    ["Available", formatBytes(storage?.remaining_bytes)],
    ["Files", String(fileCount ?? 0)],
    ["Folders", String(folderCount ?? 0)],
    ["In trash", String(trashCount ?? 0)],
    ["Member since", formatDateTime(profile?.created_date)],
  ];

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <HardDrive className="h-4 w-4 text-primary" aria-hidden="true" />
        Storage and quota
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Your quota is the share of the system's connected capacity assigned to your account. It is not a claim of
        unlimited space — uploads stop when you reach it.
      </p>

      <div className="mt-5">
        <StorageBar used={storage?.used_bytes} total={storage?.quota_bytes} />
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted-foreground">Account status</dt>
          <dd className="font-semibold capitalize">{(quota?.status || "active").replace("_", " ")}</dd>
        </div>
      </dl>
    </section>
  );
}