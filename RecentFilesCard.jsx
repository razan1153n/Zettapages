import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_TINT, iconForCategory } from "@/lib/fileTypes";
import { formatBytes, timeAgo } from "@/lib/format";

export function RecentFilesCard({ files = [] }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Recently uploaded</h2>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-primary">
          <Link to="/recent">
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {files.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing uploaded yet. Your newest files will appear here.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {files.map((file) => {
            const Icon = iconForCategory(file.category);
            return (
              <li key={file.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${CATEGORY_TINT[file.category] || CATEGORY_TINT.other}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size_bytes)} · {timeAgo(file.created_date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}