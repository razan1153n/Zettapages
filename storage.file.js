import { createFileRoute } from "@tanstack/react-router";
import { asArray } from "@/lib/account.server";
import { getObject } from "@/lib/storage.server";

/**
 * Serves one stored file against a single-use-scope, time-limited token that a
 * signed-in owner obtained from a server function, or against a share link the
 * owner published. The token IS the credential, so this route is deliberately
 * reachable without a session — but it can only ever resolve to the one file
 * the token was issued for, and only while the token is live.
 */
// Raster images, media and PDFs render without executing anything. Anything
// else (HTML, SVG, XML, scripts) is handed to the browser as a download.
const SAFE_INLINE = /^(image\/(png|jpe?g|gif|webp|avif|bmp|tiff)|video\/|audio\/|application\/pdf)(;|$)/i;

/**
 * A token is either a short-lived grant the owner's session asked for or a share
 * link the owner published. Both are validated here before any record is read.
 */
async function resolveToken(svc, token) {
  const [grant] = asArray(await svc.entities.FileAccessToken.filter({ token }));
  if (grant) {
    if (new Date(grant.expires_at).getTime() < Date.now()) {
      await svc.entities.FileAccessToken.delete(grant.id).catch(() => {});
      return { error: { message: "This link has expired.", status: 410 } };
    }
    return { fileId: grant.file_id, purpose: grant.purpose };
  }

  const [share] = asArray(await svc.entities.ShareLink.filter({ token }));
  if (!share) return { error: { message: "This link is invalid or has expired.", status: 404 } };
  if (share.revoked) return { error: { message: "This link has been revoked.", status: 410 } };
  if (new Date(share.expires_at).getTime() < Date.now()) {
    return { error: { message: "This link has expired.", status: 410 } };
  }
  return { fileId: share.file_id, purpose: "preview", shareId: share.id, downloads: Number(share.download_count) || 0 };
}

async function serveFile(request, context) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length < 20) return new Response("Missing access token", { status: 400 });

  const svc = context.getBase44().asServiceRole;
  const grant = await resolveToken(svc, token);
  if (grant.error) return new Response(grant.error.message, { status: grant.error.status });

  const file = await svc.entities.StoredFile.get(grant.fileId).catch(() => null);
  if (!file) return new Response("File not found.", { status: 404 });

  const connection = await svc.entities.StorageConnection.get(file.connection_id).catch(() => null);
  if (!connection || !connection.access_token) {
    return new Response("Storage is unavailable for this file.", { status: 503 });
  }

  let upstream;
  try {
    upstream = await getObject(connection, file.storage_key);
  } catch {
    return new Response("Storage is unavailable for this file.", { status: 502 });
  }
  if (!upstream.ok) return new Response("Storage is unavailable for this file.", { status: 502 });
  if (grant.shareId) {
    await svc.entities.ShareLink.update(grant.shareId, { download_count: grant.downloads + 1 }).catch(() => {});
  }

  const headers = new Headers();
  const contentType = file.mime_type || upstream.headers.get("content-type") || "application/octet-stream";
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "private, max-age=60");
  // Uploaded bytes are untrusted: never let the browser re-interpret the type,
  // and only render the media types inline — everything else downloads.
  headers.set("X-Content-Type-Options", "nosniff");
  const inline = grant.purpose !== "download" && SAFE_INLINE.test(contentType);
  headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}

export const Route = createFileRoute("/api/storage/file")({
  server: {
    handlers: {
      GET: async ({ request, context }) => serveFile(request, context),
    },
  },
});