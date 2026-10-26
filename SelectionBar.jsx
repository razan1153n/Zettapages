import { Download, Star, Trash2, Undo2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SelectionBar({ count, scope, onDownload, onFavorite, onTrash, onRestore, onDeleteForever, onClear }) {
  if (count === 0) return null;
  return (
    <div className="sticky top-[4.25rem] z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3.5 py-2.5 backdrop-blur">
      <span className="text-sm font-semibold">
        {count} selected
      </span>
      {scope === "trashed" ? (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRestore}>
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Restore
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDeleteForever}>
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Delete forever
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onFavorite}>
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Star
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={onTrash}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Move to trash
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={onClear}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Clear
      </Button>
    </div>
  );
}