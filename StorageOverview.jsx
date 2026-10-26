import { AlertTriangle, HardDrive } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StorageBar } from "@/components/layout/StorageMeter";
import { Button } from "@/components/ui/button";
import { formatBytes, percentOf } from "@/lib/format";

export function StorageOverview({ storage, ready, fileCount, folderCount, trashCount }) {
  const total = Number(storage?.quota_bytes) || 0;
  const used = Number(storage?.used_bytes) || 0;
  const available = Math.max(0, total - used);
  const percent = percentOf(used, total);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary/40 px-6 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary shadow-sm">
          <HardDrive className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold">Your storage</h2>
          <p className="text-xs text-muted-foreground">Assigned to your account, updated after every change</p>
        </div>
        <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-bold tabular-nums text-primary shadow-sm">{percent}% used</span>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-3">
        {[
          { label: "Total allocated", value: formatBytes(total) },
          { label: "Used", value: formatBytes(used) },
          { label: "Available", value: formatBytes(available) },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-1.5 font-heading text-2xl font-extrabold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <StorageBar used={used} total={total} />
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>{fileCount} file{fileCount === 1 ? "" : "s"}</span>
          <span>{folderCount} folder{folderCount === 1 ? "" : "s"}</span>
          <span>{trashCount} in trash</span>
          {storage?.trashed_bytes > 0 && <span>{formatBytes(storage.trashed_bytes)} held by trash</span>}
        </div>

        {!ready && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No storage repository is connected yet, so uploads are paused until the administrator connects one.</span>
          </div>
        )}
        {storage?.trashed_bytes > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-secondary/60 p-3.5 text-sm">
            <span className="text-muted-foreground">Trashed files still use your quota. Empty the trash to free space.</span>
            <Button asChild size="sm" variant="outline" className="ml-auto rounded-lg">
              <Link to="/trash">Open trash</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}