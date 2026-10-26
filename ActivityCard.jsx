import { Activity } from "lucide-react";
import { formatBytes, formatDateTime } from "@/lib/format";

const LABELS = {
  uploaded: "Uploaded",
  upload_failed: "Upload failed",
  deleted: "Deleted permanently",
  moved_to_trash: "Moved to trash",
  restored: "Restored",
  renamed: "Renamed",
  folder_created: "Created folder",
  trash_emptied: "Emptied trash",
  share_created: "Created a share link",
  share_revoked: "Revoked a share link",
  deletion_requested: "Requested account deletion",
};

export function ActivityCard({ activity = [] }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        Activity history
      </h2>
      {activity.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border text-sm">
          {activity.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                <span className="font-medium">{LABELS[entry.action] || entry.action}</span>
                {entry.item_name && <span className="text-muted-foreground"> · {entry.item_name}</span>}
                {entry.detail && <span className="block text-xs text-muted-foreground">{entry.detail}</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(entry.created_date)}
                {entry.size_bytes > 0 ? ` · ${formatBytes(entry.size_bytes)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}