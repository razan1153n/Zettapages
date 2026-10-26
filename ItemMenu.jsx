import { Download, Info, MoreVertical, Pencil, Share2, Star, StarOff, Trash2, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ItemMenu({ kind, item, scope, onDetails, onRename, onDownload, onShare, onFavorite, onTrash, onRestore, onDeleteForever }) {
  const isFile = kind === "file";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label={`Actions for ${item.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(event) => event.stopPropagation()}>
        {isFile && (
          <DropdownMenuItem onSelect={() => onDetails(item)}>
            <Info className="mr-2 h-4 w-4" aria-hidden="true" />
            Details &amp; preview
          </DropdownMenuItem>
        )}
        {isFile && scope !== "trashed" && (
          <DropdownMenuItem onSelect={() => onFavorite(item)}>
            {item.is_favorite ? (
              <>
                <StarOff className="mr-2 h-4 w-4" aria-hidden="true" />
                Remove star
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" aria-hidden="true" />
                Add star
              </>
            )}
          </DropdownMenuItem>
        )}
        {isFile && (
          <DropdownMenuItem onSelect={() => onDownload(item)}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download
          </DropdownMenuItem>
        )}
        {isFile && scope !== "trashed" && (
          <DropdownMenuItem onSelect={() => onShare(item)}>
            <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Create share link
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onRename(kind, item)}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {scope === "trashed" ? (
          <>
            <DropdownMenuItem onSelect={() => onRestore(kind, item)}>
              <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDeleteForever(kind, item)}>
              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete forever
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onTrash(kind, item)}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Move to trash
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}