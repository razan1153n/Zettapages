import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Link2, Loader2, Share2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Image } from "@/components/ui/image";
import { createAccessUrl, createShareLink, getFileDetail, toggleFavorite } from "@/lib/server-fns";
import { CATEGORY_LABEL, previewKind } from "@/lib/fileTypes";
import { formatBytes, formatDateTime } from "@/lib/format";

function Preview({ kind, url, name }) {
  if (!url) return null;
  if (kind === "image") return <Image src={url} alt={name} className="max-h-72 w-full rounded-xl object-contain" fittingType="fit" />;
  if (kind === "video") return <video src={url} controls className="max-h-72 w-full rounded-xl bg-black" />;
  if (kind === "audio") return <audio src={url} controls className="w-full" />;
  if (kind === "pdf") return <iframe src={url} title={name} className="h-72 w-full rounded-xl border border-border" />;
  return null;
}

export function FileDetailSheet({ fileId, open, onOpenChange, onTrash }) {
  const queryClient = useQueryClient();
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState("");

  const detail = useQuery({
    queryKey: ["file-detail", fileId],
    queryFn: () => getFileDetail({ data: { id: fileId } }),
    enabled: !!fileId && open,
  });
  const file = detail.data?.file;
  const kind = previewKind(file);

  const preview = useQuery({
    queryKey: ["file-preview", fileId],
    queryFn: () => createAccessUrl({ data: { fileId, purpose: "preview", ttlMinutes: 60 } }),
    enabled: !!fileId && open && !!kind,
    staleTime: 45 * 60 * 1000,
  });

  const download = async () => {
    setBusy("download");
    try {
      const { url } = await createAccessUrl({ data: { fileId, purpose: "download", ttlMinutes: 30 } });
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file?.name || "download";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      toast.error(error.message || "Could not prepare the download.");
    } finally {
      setBusy("");
    }
  };

  const star = async () => {
    setBusy("star");
    try {
      await toggleFavorite({ data: { id: fileId, value: !file?.is_favorite } });
      queryClient.invalidateQueries({ queryKey: ["file-detail", fileId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
    } finally {
      setBusy("");
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const link = await createShareLink({ data: { fileId, expiresInHours: 24 } });
      setShareUrl(`${window.location.origin}${link.url}`);
      toast.success("Share link created", { description: "It expires in 24 hours." });
    } catch (error) {
      toast.error(error.message || "Could not create a link.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-8 break-words">{file?.name || "File details"}</SheetTitle>
          <SheetDescription>
            {file ? `${CATEGORY_LABEL[file.category] || "File"} · ${formatBytes(file.size_bytes)}` : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-5">
          {preview.isLoading && kind && (
            <div className="grid h-40 place-items-center rounded-xl bg-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {kind && preview.data?.url && <Preview kind={kind} url={preview.data.url} name={file?.name} />}

          <div className="flex flex-wrap gap-2">
            <Button onClick={download} disabled={!file || busy === "download"} className="gap-2 rounded-xl">
              {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              Download
            </Button>
            <Button variant="outline" onClick={star} disabled={!file || busy === "star"} className="gap-2 rounded-xl">
              <Star className={file?.is_favorite ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} aria-hidden="true" />
              {file?.is_favorite ? "Starred" : "Star"}
            </Button>
            <Button variant="outline" onClick={share} disabled={!file || busy === "share"} className="gap-2 rounded-xl">
              {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
              Share link
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl text-destructive hover:text-destructive"
              disabled={!file}
              onClick={() => onTrash?.(file)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Trash
            </Button>
          </div>

          {shareUrl && (
            <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Anyone with this link can download the file until it expires
              </p>
              <p className="break-all text-xs">{shareUrl}</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy link
              </Button>
            </div>
          )}

          <Separator />
          <dl className="space-y-3 text-sm">
            {[
              ["Name", file?.name],
              ["Type", file ? `${CATEGORY_LABEL[file.category] || "File"}${file.mime_type ? ` (${file.mime_type})` : ""}` : null],
              ["Size", file ? formatBytes(file.size_bytes) : null],
              ["Uploaded", file ? formatDateTime(file.created_date) : null],
              ["Folder", detail.data?.folder?.name || "My files"],
              ["Status", file?.status === "trashed" ? "In trash" : "Available"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium break-words">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </SheetContent>
    </Sheet>
  );
}