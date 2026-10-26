/**
 * Server-side upload pipeline. Bytes never touch the browser's storage
 * credentials: quota, ownership and provider selection are all decided here.
 */
import { asArray, assertAccountActive, connectionUsage, ensureQuota, getSettings, logActivity, quotaSummary, storageBreakdown } from "@/lib/account.server";
import { buildStorageKey, putObject } from "@/lib/storage.server";
import { categoryFor } from "@/lib/fileTypes";

const ROOT = "root";
// The platform rejects request bodies beyond ~100 MB at the edge; staying just
// under it keeps the failure a clear message instead of a dropped connection.
export const PLATFORM_UPLOAD_CEILING = 95 * 1024 * 1024;

const json = (body, status = 200) => Response.json(body, { status });

function userFacingError(error) {
  if (error?.status === 400 || error?.status === 409) return error.message;
  return "The upload could not be completed. Please try again.";
}

export async function handleUpload(request, context) {
  const user = context.user;
  const svc = context.getBase44().asServiceRole;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "The upload could not be read. Try a smaller file." }, 413);
  }

  const upload = form.get("file");
  if (!upload || typeof upload === "string") {
    return json({ error: "No file was received." }, 400);
  }
  const name = String(form.get("name") || upload.name || "file").trim() || "file";
  const folderId = String(form.get("folderId") || ROOT) || ROOT;

  const quota = await ensureQuota(svc, user);
  try {
    assertAccountActive(quota);
  } catch (error) {
    return json({ error: error.message }, error.status || 403);
  }

  const settings = await getSettings(svc);
  const maxFileBytes = Number(settings.max_file_bytes) || PLATFORM_UPLOAD_CEILING;
  const size = Number(upload.size) || 0;

  if (size <= 0) return json({ error: "The file is empty." }, 400);
  if (size > PLATFORM_UPLOAD_CEILING || size > maxFileBytes) {
    return json(
      { error: `This file is larger than the ${(Math.min(maxFileBytes, PLATFORM_UPLOAD_CEILING) / (1024 * 1024)).toFixed(0)} MB single-upload limit.` },
      413,
    );
  }

  if (folderId !== ROOT) {
    const folder = await svc.entities.Folder.get(folderId).catch(() => null);
    if (!folder || folder.owner_id !== user.id || folder.status !== "active") {
      return json({ error: "That folder no longer exists." }, 404);
    }
  }

  const connections = (await connectionUsage(svc)).filter((c) => c.is_active && c.status !== "disabled");
  if (connections.length === 0) {
    return json({ error: "ZetaCloud storage is not set up yet. Ask the administrator to connect a storage repository." }, 503);
  }

  const breakdown = await storageBreakdown(svc, user.id);
  const quotaBytes = Number(quota.quota_bytes) || 0;
  if (breakdown.total + size > quotaBytes) {
    return json({ error: "You do not have enough storage left for this file. Free up space or ask for a larger quota." }, 507);
  }

  const target = connections.find((c) => {
    const capacity = Number(c.capacity_bytes) || 0;
    if (capacity <= 0) return true;
    return capacity - c.used_bytes >= size;
  });
  if (!target) {
    return json({ error: "All storage repositories are full. Ask the administrator to add capacity." }, 507);
  }

  const key = buildStorageKey(user.id, name);
  let record = null;
  try {
    const bytes = new Uint8Array(await upload.arrayBuffer());
    await putObject(target, key, bytes);
    record = await svc.entities.StoredFile.create({
      owner_id: user.id,
      owner_email: user.email,
      name,
      folder_id: folderId,
      size_bytes: size,
      mime_type: upload.type || "application/octet-stream",
      category: categoryFor(name, upload.type),
      connection_id: target.id,
      storage_key: key,
      status: "active",
      is_favorite: false,
    });
  } catch (error) {
    await svc.entities.UploadJob.create({
      user_id: user.id,
      user_email: user.email,
      file_name: name,
      size_bytes: size,
      status: "failed",
      error: String(error?.message || "Upload failed").slice(0, 400),
      connection_id: target.id,
    }).catch(() => {});
    await logActivity(svc, user, "upload_failed", name, size, String(error?.message || "").slice(0, 200)).catch(() => {});
    return json({ error: userFacingError(error) }, error?.storageStatus && error.storageStatus >= 500 ? 502 : 400);
  }

  await svc.entities.UploadJob.create({
    user_id: user.id,
    user_email: user.email,
    file_name: name,
    size_bytes: size,
    status: "completed",
    connection_id: target.id,
  }).catch(() => {});
  await logActivity(svc, user, "uploaded", name, size, "").catch(() => {});

  if (size >= 0 && quota.notify_uploads) {
    const rows = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }));
    if (rows[0]) await svc.entities.UserQuota.update(rows[0].id, { last_seen: new Date().toISOString() });
  }

  const after = await storageBreakdown(svc, user.id);
  return json({ file: record, storage: quotaSummary(quota, after) });
}