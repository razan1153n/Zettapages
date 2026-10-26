import { AlertCircle, Check, Loader2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";

export function UploadQueue({ items, onRetry, onCancel, onDismiss }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold">
        Transfers <span className="font-normal text-muted-foreground">({items.length})</span>
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
              {item.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {item.status === "done" && <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
              {item.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />}
              {item.status === "cancelled" && <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.status === "error"
                  ? item.error
                  : item.status === "done"
                    ? `${formatBytes(item.size)} · stored`
                    : item.status === "cancelled"
                      ? "Cancelled"
                      : `${formatBytes(item.size)} · ${item.progress}%`}
              </p>
              {item.status === "uploading" && (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </div>
            {item.status === "uploading" && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(item.id)}>
                Cancel
              </Button>
            )}
            {item.status === "error" && (
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => onRetry(item.id)}>
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </Button>
            )}
            {item.status !== "uploading" && (
              <Button size="sm" variant="ghost" onClick={() => onDismiss(item.id)} aria-label="Dismiss">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}