import { ChevronRight, FolderOpen } from "lucide-react";

export function Breadcrumbs({ trail = [], onNavigate }) {
  return (
    <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onNavigate(undefined)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <FolderOpen className="h-4 w-4" aria-hidden="true" />
        My files
      </button>
      {trail.map((crumb, index) => {
        const last = index === trail.length - 1;
        return (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
            {last ? (
              <span className="rounded-lg px-2 py-1 font-semibold text-foreground">{crumb.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(crumb.id)}
                className="rounded-lg px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {crumb.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}