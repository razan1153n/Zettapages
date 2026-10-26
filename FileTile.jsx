import { Check, Folder as FolderIcon, Star } from "lucide-react";
import { ItemMenu } from "@/components/files/ItemMenu";
import { Image } from "@/components/ui/image";
import { CATEGORY_TINT, iconForCategory } from "@/lib/fileTypes";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FileTile({ kind, item, selected, thumbnail, scope, onOpen, onToggleSelect, ...actions }) {
  const isFolder = kind === "folder";
  const Icon = isFolder ? FolderIcon : iconForCategory(item.category);
  const canThumb = !isFolder && item.category === "image" && thumbnail;

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
        "group relative flex cursor-pointer flex-col rounded-2xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(kind, item);
          }}
          aria-label={selected ? `Deselect ${item.name}` : `Select ${item.name}`}
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full border transition-all",
            selected
              ? "border-primary bg-primary text-primary-foreground opacity-100"
              : "border-border bg-card/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          {selected && <Check className="h-3 w-3" aria-hidden="true" />}
        </button>
      </div>

      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-0.5">
        {!isFolder && item.is_favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />}
        <ItemMenu kind={kind} item={item} scope={scope} {...actions} />
      </div>

      <div className="mb-3 grid h-28 place-items-center overflow-hidden rounded-xl bg-secondary/60">
        {canThumb ? (
          <Image src={thumbnail} alt={item.name} className="h-28 w-full object-cover" fittingType="fill" />
        ) : (
          <span className={cn("grid h-12 w-12 place-items-center rounded-xl", isFolder ? "bg-primary/10 text-primary" : CATEGORY_TINT[item.category] || CATEGORY_TINT.other)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="truncate text-sm font-semibold" title={item.name}>
        {item.name}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {isFolder ? "Folder" : `${formatBytes(item.size_bytes)} · ${formatDate(item.created_date)}`}
      </p>
    </div>
  );
}