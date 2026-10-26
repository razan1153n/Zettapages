import { AlertTriangle } from "lucide-react";
import { formatBytes, percentOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StorageBar({ used, total, className, tone = "brand" }) {
  const percent = percentOf(used, total);
  const barTone =
    tone === "admin"
      ? "bg-gradient-to-r from-indigo-500 to-cyan-500"
      : percent >= 90
        ? "bg-destructive"
        : percent >= 75
          ? "bg-amber-500"
          : "bg-gradient-to-r from-indigo-500 to-cyan-500";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", barTone)} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function StorageMeter({ storage, ready = true, className }) {
  const total = Number(storage?.quota_bytes) || 0;
  const used = Number(storage?.used_bytes) || 0;
  const percent = percentOf(used, total);
  return (
    <div className={cn("rounded-2xl border border-border bg-secondary/50 p-3.5", className)}>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Storage</span>
        <span>{percent}%</span>
      </div>
      <StorageBar used={used} total={total} />
      <p className="mt-2.5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{formatBytes(used)}</span> of {formatBytes(total)} used
      </p>
      <p className="text-xs text-muted-foreground">{formatBytes(Math.max(0, total - used))} available</p>
      {!ready && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-700">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          No storage repository connected yet.
        </p>
      )}
    </div>
  );
}