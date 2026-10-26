import { CloudUpload, FolderPlus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const COPY = {
  active: {
    icon: CloudUpload,
    title: "This space is empty",
    body: "Upload your first file or create a folder to start organising your cloud.",
  },
  recent: { icon: CloudUpload, title: "Nothing uploaded yet", body: "Your most recent uploads will appear here." },
  starred: { icon: CloudUpload, title: "No starred files", body: "Star the files you use most so they are always one click away." },
  trashed: { icon: Trash2, title: "Trash is empty", body: "Files you move to the trash stay here until you remove them for good." },
  search: { icon: Search, title: "No matches", body: "Try a different name or clear the filters to see everything again." },
};

export function EmptyState({ scope = "active", searching, onUpload, onNewFolder, onCreateFolder }) {
  const copy = searching ? COPY.search : COPY[scope] || COPY.active;
  const Icon = copy.icon;
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-base font-semibold">{copy.title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy.body}</p>
      {!searching && scope === "active" && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={onUpload} className="gap-2 rounded-xl">
            <CloudUpload className="h-4 w-4" aria-hidden="true" />
            Upload a file
          </Button>
          <Button variant="outline" onClick={onNewFolder || onCreateFolder} className="gap-2 rounded-xl">
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            New folder
          </Button>
        </div>
      )}
    </div>
  );
}