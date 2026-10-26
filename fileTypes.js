import { File, FileArchive, FileAudio, FileImage, FileText, FileVideo } from "lucide-react";

const EXTENSIONS = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "heic", "tif", "tiff", "ico"],
  video: ["mp4", "mov", "webm", "avi", "mkv", "m4v", "mpeg", "mpg", "3gp", "wmv"],
  audio: ["mp3", "wav", "ogg", "oga", "m4a", "flac", "aac", "opus", "wma", "amr"],
  document: [
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "rtf",
    "odt", "ods", "odp", "json", "xml", "html", "htm", "js", "jsx", "ts", "tsx",
    "py", "java", "c", "cpp", "cs", "css", "yml", "yaml", "log", "epub",
  ],
  archive: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "iso", "dmg"],
};

/** The browser-storable category a file belongs to. */
export function categoryFor(name, mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/") || mime.includes("pdf") || mime.includes("word") || mime.includes("sheet") || mime.includes("presentation")) return "document";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar")) return "archive";
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  for (const [category, list] of Object.entries(EXTENSIONS)) {
    if (ext && list.includes(ext)) return category;
  }
  return "other";
}

export function extensionOf(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function iconForCategory(category) {
  switch (category) {
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "document":
      return FileText;
    case "archive":
      return FileArchive;
    default:
      return File;
  }
}

export const CATEGORY_TINT = {
  image: "bg-violet-50 text-violet-600",
  video: "bg-rose-50 text-rose-600",
  audio: "bg-amber-50 text-amber-600",
  document: "bg-sky-50 text-sky-600",
  archive: "bg-emerald-50 text-emerald-600",
  other: "bg-slate-100 text-slate-600",
};

export const CATEGORY_LABEL = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  archive: "Archive",
  other: "File",
};

export const FILTERS = [
  { id: "all", label: "All files" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "document", label: "Documents" },
  { id: "audio", label: "Audio" },
  { id: "archive", label: "Archives" },
  { id: "other", label: "Other" },
];

export const SORTS = [
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
  { id: "date", label: "Upload date" },
  { id: "type", label: "File type" },
];

/** The category a preview can render in the browser. */
export function previewKind(file) {
  if (!file) return null;
  const mime = String(file.mime_type || "").toLowerCase();
  if (file.category === "image" && mime !== "image/svg+xml") return "image";
  if (file.category === "video") return "video";
  if (file.category === "audio") return "audio";
  if (mime.includes("pdf")) return "pdf";
  return null;
}