import { Check, Folder as FolderIcon, Star } from "lucide-react";
import { ItemMenu } from "@/components/files/ItemMenu";
import { CATEGORY_TINT, CATEGORY_LABEL, iconForCategory } from "@/lib/fileTypes";
import { formatBytes, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FileRow({ kind, item, selected, scope, onOpen, onToggleSelect, ...actions }) {
  const isFolder = kind === "folder";
  const Icon = isFolder ? FolderIcon : iconForCategory(item.category);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(kind, item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(kind, item);
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelect(kind, item);
        }}
        aria-label={selected ? `Deselect ${item.name}` : `Select ${item.name}`}
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        {selected && <Check className="h-3 w-3" aria-hidden="true" />}
      </button>

      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", isFolder ? "bg-primary/10 text-primary" : CATEGORY_TINT[item.category] || CATEGORY_TINT.other)}>
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate" title={item.name}>
            {item.name}
          </span>
          {!isFolder && item.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {isFolder ? "Folder" : `${CATEGORY_LABEL[item.category] || "File"} · ${formatDateTime(item.created_date)}`}
        </p>
      </div>

      <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
        {isFolder ? "—" : formatBytes(item.size_bytes)}
      </span>

      <ItemMenu kind={kind} item={item} scope={scope} {...actions} />
    </div>
  );
}