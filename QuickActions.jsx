import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload, FolderPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { NewFolderDialog } from "@/components/files/NewFolderDialog";
import { uploadFile } from "@/components/files/uploadClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFolder } from "@/lib/server-fns";

export function QuickActions({ disabled }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [term, setTerm] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["account"] });
    queryClient.invalidateQueries({ queryKey: ["files"] });
  };

  const upload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setBusy(true);
    toast.info(`Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`);
    for (const file of files) {
      try {
        await uploadFile({ file, folderId: "root" });
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        toast.error(err.message || `${file.name} failed`);
      }
    }
    setBusy(false);
    refresh();
  };

  const submitFolder = async (name) => {
    setBusy(true);
    setError("");
    try {
      await createFolder({ data: { name, parentId: "root" } });
      setFolderOpen(false);
      toast.success("Folder created");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-bold">Quick actions</h2>
      <p className="mt-1 text-xs text-muted-foreground">Start the things you do most, straight from here.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={() => inputRef.current?.click()} disabled={busy || disabled} className="h-11 justify-start gap-2 rounded-xl">
          <CloudUpload className="h-4 w-4" aria-hidden="true" />
          Upload files
        </Button>
        <Button variant="outline" onClick={() => setFolderOpen(true)} disabled={busy} className="h-11 justify-start gap-2 rounded-xl">
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          New folder
        </Button>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ to: "/files", search: { q: term.trim() || undefined } });
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search your files" className="h-11 rounded-xl pl-9" />
        </div>
        <Button type="submit" variant="outline" className="h-11 rounded-xl">
          Search
        </Button>
      </form>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          upload(event.target.files);
          event.target.value = "";
        }}
      />

      <NewFolderDialog open={folderOpen} onOpenChange={setFolderOpen} onSubmit={submitFolder} busy={busy} error={error} />
    </section>
  );
}