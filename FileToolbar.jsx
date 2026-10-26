import { Filter, LayoutGrid, List, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTERS, SORTS } from "@/lib/fileTypes";

export function FileToolbar({
  search,
  onSearch,
  category,
  onCategory,
  sort,
  onSort,
  view,
  onView,
  onUpload,
  uploadDisabled,
  hint,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search by name"
            aria-label="Search by name"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Button onClick={onUpload} disabled={uploadDisabled} className="h-11 rounded-xl gap-2 px-5">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filter
        </div>
        <Select value={category} onValueChange={onCategory}>
          <SelectTrigger className="h-9 w-[150px] rounded-lg" aria-label="Filter by file type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={onSort}>
          <SelectTrigger className="h-9 w-[170px] rounded-lg" aria-label="Sort files">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                Sort by {item.label.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => onView("grid")}
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Grid
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => onView("list")}
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            List
          </Button>
        </div>
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}