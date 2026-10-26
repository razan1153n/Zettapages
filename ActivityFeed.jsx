import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatBytes, timeAgo } from "@/lib/format";

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

export function ActivityFeed({ activity = [] }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-bold">Recent activity</h2>
      <p className="mt-1 text-xs text-muted-foreground">Everything that happened in your space.</p>

      {activity.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {activity.map((entry) => (
            <li key={entry.id} className="relative flex gap-3 pl-1">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="font-medium">{LABELS[entry.action] || entry.action}</span>
                  {entry.item_name ? <span className="text-muted-foreground"> · {entry.item_name}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(entry.created_date)}
                  {entry.detail ? ` · ${entry.detail}` : ""}
                  {entry.size_bytes > 0 ? ` · ${formatBytes(entry.size_bytes)}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Button asChild variant="ghost" size="sm" className="mt-4 w-full justify-center text-primary">
        <Link to="/settings">Full history in settings</Link>
      </Button>
    </section>
  );
}