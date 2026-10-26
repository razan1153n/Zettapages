import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/files/Breadcrumbs";
import { DeleteDialog } from "@/components/files/DeleteDialog";
import { EmptyState } from "@/components/files/EmptyState";
import { FileDetailSheet } from "@/components/files/FileDetailSheet";
import { FileRow } from "@/components/files/FileRow";
import { FileTile } from "@/components/files/FileTile";
import { FileToolbar } from "@/components/files/FileToolbar";
import { NewFolderDialog } from "@/components/files/NewFolderDialog";
import { RenameDialog } from "@/components/files/RenameDialog";
import { SelectionBar } from "@/components/files/SelectionBar";
import { UploadQueue } from "@/components/files/UploadQueue";
import { uploadFile } from "@/components/files/uploadClient";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";
import { useThumbnails } from "@/hooks/useThumbnails";
import { formatBytes } from "@/lib/format";
import {
  createAccessUrl,
  createFolder,
  createShareLink,
  deleteForever,
  emptyTrash,
  listFiles,
  renameItem,
  restoreItems,
  toggleFavorite,
  trashItems,
} from "@/lib/server-fns";

const HEADINGS = {
  active: { title: "My files", subtitle: "Everything you have stored in your private space." },
  recent: { title: "Recent", subtitle: "Your latest uploads, newest first." },
  starred: { title: "Starred", subtitle: "Files you marked as important." },
  trashed: { title: "Trash", subtitle: "Restore items, or remove them from storage for good." },
};

export function FileBrowser({ scope = "active", params = {}, onParamsChange, onFolderChange }) {
  const queryClient = useQueryClient();
  const { data: account } = useAccount();

  const folderId = params.folder;
  const urlSearch = params.q ?? "";
  const category = params.category ?? "all";
  const sort = params.sort ?? "date";
  const view = params.view ?? "grid";

  const [term, setTerm] = useState(urlSearch);
  const searchRef = useRef(urlSearch);
  searchRef.current = urlSearch;
  const [selected, setSelected] = useState(() => new Set());
  const [uploads, setUploads] = useState([]);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);
  const aborters = useRef(new Map());
  const inputRef = useRef(null);

  useEffect(() => setTerm(urlSearch), [urlSearch]);

  useEffect(() => {
    if (term === searchRef.current) return undefined;
    const timer = setTimeout(() => onParamsChange({ q: term.trim() || undefined }, { replace: true }), 350);
    return () => clearTimeout(timer);
  }, [term, onParamsChange]);

  useEffect(() => {
    setSelected(new Set());
  }, [scope, folderId, urlSearch, category, sort]);

  const query = useInfiniteQuery({
    queryKey: ["files", scope, folderId, urlSearch, category, sort],
    queryFn: ({ pageParam }) =>
      listFiles({ data: { scope, folderId, search: urlSearch || undefined, category, sort, cursor: pageParam } }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 10_000,
  });

  const files = useMemo(() => (query.data?.pages ?? []).flatMap((page) => page.files ?? []), [query.data]);
  const folders = query.data?.pages?.[0]?.folders ?? [];
  const breadcrumbs = query.data?.pages?.[0]?.breadcrumbs ?? [];
  const thumbnails = useThumbnails(files);
  const heading = HEADINGS[scope] || HEADINGS.active;
  const storageReady = account ? account.storageReady !== false : true;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["files"] });
    queryClient.invalidateQueries({ queryKey: ["account"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
  }, [queryClient]);

  const runUpload = useCallback(
    (id, file) => {
      uploadFile({
        file,
        folderId: folderId || "root",
        onProgress: (progress) => setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, progress } : item))),
        registerAbort: (abort) => aborters.current.set(id, abort),
      })
        .then(() => {
          setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, status: "done", progress: 100 } : item)));
          refresh();
        })
        .catch((error) => {
          setUploads((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: error.aborted ? "cancelled" : "error", error: error.message } : item)),
          );
          if (!error.aborted) toast.error(error.message || "The upload failed.");
        });
    },
    [folderId, refresh],
  );

  const startUpload = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;
      const created = incoming.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
        file,
      }));
      setUploads((prev) => [...created, ...prev]);
      created.forEach((item) => runUpload(item.id, item.file));
    },
    [runUpload],
  );

  const selectedFiles = files.filter((file) => selected.has(`file:${file.id}`));
  const selectedFolders = folders.filter((folder) => selected.has(`folder:${folder.id}`));
  const selectionCount = selectedFiles.length + selectedFolders.length;

  const toggleSelect = (kind, item) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = `${kind}:${item.id}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const download = async (file) => {
    try {
      const { url } = await createAccessUrl({ data: { fileId: file.id, purpose: "download", ttlMinutes: 30 } });
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      toast.error(error.message || "Could not prepare the download.");
    }
  };

  const downloadMany = async (list) => {
    for (const file of list) {
      await download(file);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  };

  const openItem = (kind, item) => {
    if (kind === "folder") {
      onFolderChange?.(item.id);
      return;
    }
    setDetailId(item.id);
  };

  const share = async (file) => {
    try {
      const link = await createShareLink({ data: { fileId: file.id, expiresInHours: 24 } });
      const url = `${window.location.origin}${link.url}`;
      navigator.clipboard?.writeText(url);
      toast.success("Share link copied", { description: "Anyone with the link can download it for 24 hours." });
    } catch (error) {
      toast.error(error.message || "Could not create a link.");
    }
  };

  const favorite = async (file) => {
    await toggleFavorite({ data: { id: file.id, value: !file.is_favorite } });
    refresh();
  };

  const submitRename = async (name) => {
    setBusy(true);
    setDialogError("");
    try {
      await renameItem({ data: { id: renameTarget.item.id, kind: renameTarget.kind, name } });
      setRenameTarget(null);
      refresh();
    } catch (error) {
      setDialogError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitFolder = async (name) => {
    setBusy(true);
    setDialogError("");
    try {
      await createFolder({ data: { name, parentId: folderId || "root" } });
      setNewFolderOpen(false);
      refresh();
    } catch (error) {
      setDialogError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setDialogError("");
    const fileIds = deleteTarget.files.map((file) => file.id);
    const folderIds = deleteTarget.folders.map((folder) => folder.id);
    try {
      if (deleteTarget.mode === "forever") {
        const result = await deleteForever({ data: { fileIds, folderIds } });
        if (result.failed > 0) toast.warning(result.message);
        else toast.success("Deleted permanently");
      } else {
        await trashItems({ data: { fileIds, folderIds } });
        toast.success("Moved to trash");
      }
      setDeleteTarget(null);
      setSelected(new Set());
      refresh();
    } catch (error) {
      setDialogError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (fileIds, folderIds) => {
    await restoreItems({ data: { fileIds, folderIds } });
    setSelected(new Set());
    refresh();
  };

  const purgeTrash = async () => {
    setBusy(true);
    try {
      const result = await emptyTrash();
      toast.success(`${result.deleted} item(s) removed from storage`);
      refresh();
    } catch (error) {
      toast.error(error.message || "Could not empty the trash.");
    } finally {
      setBusy(false);
    }
  };

  const itemActions = {
    onDetails: (item) => setDetailId(item.id),
    onRename: (kind, item) => {
      setDialogError("");
      setRenameTarget({ kind, item });
    },
    onDownload: download,
    onShare: share,
    onFavorite: favorite,
    onTrash: (kind, item) =>
      setDeleteTarget({ mode: "trash", files: kind === "file" ? [item] : [], folders: kind === "folder" ? [item] : [] }),
    onRestore: async (kind, item) => restore(kind === "file" ? [item.id] : [], kind === "folder" ? [item.id] : []),
    onDeleteForever: (kind, item) =>
      setDeleteTarget({ mode: "forever", files: kind === "file" ? [item] : [], folders: kind === "folder" ? [item] : [] }),
  };

  const searching = urlSearch.length > 0 || category !== "all";
  const isEmpty = !query.isLoading && files.length === 0 && folders.length === 0;
  const maxFileLabel = account?.maxFileBytes ? formatBytes(account.maxFileBytes) : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{heading.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{heading.subtitle}</p>
        </div>
        {scope === "trashed" && files.length + folders.length > 0 && (
          <Button variant="outline" className="gap-2 rounded-xl text-destructive hover:text-destructive" onClick={purgeTrash} disabled={busy}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Empty trash
          </Button>
        )}
      </div>

      <FileToolbar
        search={term}
        onSearch={setTerm}
        category={category}
        onCategory={(value) => onParamsChange({ category: value === "all" ? undefined : value }, { replace: true })}
        sort={sort}
        onSort={(value) => onParamsChange({ sort: value }, { replace: true })}
        view={view}
        onView={(value) => onParamsChange({ view: value }, { replace: true })}
        onUpload={() => inputRef.current?.click()}
        uploadDisabled={!storageReady}
        hint={
          maxFileLabel
            ? `Up to ${maxFileLabel} per file · storage usage updates as you upload${storageReady ? "" : " · no storage repository connected yet"}`
            : undefined
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          startUpload(event.target.files);
          event.target.value = "";
        }}
      />

      {scope === "active" && <Breadcrumbs trail={breadcrumbs} onNavigate={onFolderChange} />}

      <SelectionBar
        count={selectionCount}
        scope={scope}
        onClear={() => setSelected(new Set())}
        onDownload={() => downloadMany(selectedFiles)}
        onFavorite={() => selectedFiles.forEach(favorite)}
        onTrash={() => setDeleteTarget({ mode: "trash", files: selectedFiles, folders: selectedFolders })}
        onRestore={() => restore(selectedFiles.map((file) => file.id), selectedFolders.map((folder) => folder.id))}
        onDeleteForever={() => setDeleteTarget({ mode: "forever", files: selectedFiles, folders: selectedFolders })}
      />

      <UploadQueue
        items={uploads}
        onCancel={(id) => aborters.current.get(id)?.()}
        onRetry={(id) => {
          const item = uploads.find((entry) => entry.id === id);
          if (!item) return;
          setUploads((prev) => prev.map((entry) => (entry.id === id ? { ...entry, status: "uploading", progress: 0, error: "" } : entry)));
          runUpload(id, item.file);
        }}
        onDismiss={(id) => setUploads((prev) => prev.filter((entry) => entry.id !== id))}
      />

      <div
        onDragOver={(event) => {
          if (scope !== "trashed") event.preventDefault();
        }}
        onDrop={(event) => {
          if (scope === "trashed") return;
          event.preventDefault();
          startUpload(event.dataTransfer?.files);
        }}
      >
        {query.isLoading ? (
          <div className="grid place-items-center rounded-3xl border border-border bg-card/60 py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : isEmpty ? (
          <EmptyState
            scope={scope}
            searching={searching}
            onUpload={() => inputRef.current?.click()}
            onNewFolder={() => {
              setDialogError("");
              setNewFolderOpen(true);
            }}
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {folders.map((folder) => (
              <FileTile
                key={folder.id}
                kind="folder"
                item={folder}
                scope={scope}
                selected={selected.has(`folder:${folder.id}`)}
                onOpen={openItem}
                onToggleSelect={toggleSelect}
                {...itemActions}
              />
            ))}
            {files.map((file) => (
              <FileTile
                key={file.id}
                kind="file"
                item={file}
                scope={scope}
                thumbnail={thumbnails[file.id]}
                selected={selected.has(`file:${file.id}`)}
                onOpen={openItem}
                onToggleSelect={toggleSelect}
                {...itemActions}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((folder) => (
              <FileRow
                key={folder.id}
                kind="folder"
                item={folder}
                scope={scope}
                selected={selected.has(`folder:${folder.id}`)}
                onOpen={openItem}
                onToggleSelect={toggleSelect}
                {...itemActions}
              />
            ))}
            {files.map((file) => (
              <FileRow
                key={file.id}
                kind="file"
                item={file}
                scope={scope}
                selected={selected.has(`file:${file.id}`)}
                onOpen={openItem}
                onToggleSelect={toggleSelect}
                {...itemActions}
              />
            ))}
          </div>
        )}
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}

      {scope === "active" && !isEmpty && (
        <p className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
          <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
          Drag files anywhere on this page to upload them{storageReady ? "" : " (storage not connected yet)"}
        </p>
      )}

      <RenameDialog
        target={renameTarget}
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSubmit={submitRename}
        busy={busy}
        error={dialogError}
      />
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        onSubmit={submitFolder}
        busy={busy}
        error={dialogError}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        mode={deleteTarget?.mode}
        count={(deleteTarget?.files?.length ?? 0) + (deleteTarget?.folders?.length ?? 0)}
        names={[...(deleteTarget?.folders ?? []), ...(deleteTarget?.files ?? [])].map((item) => item.name)}
        onConfirm={confirmDelete}
        busy={busy}
        error={dialogError}
      />
      <FileDetailSheet
        fileId={detailId}
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onTrash={(file) => {
          setDetailId(null);
          setDeleteTarget({ mode: "trash", files: [file], folders: [] });
        }}
      />
    </div>
  );
}