import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  asArray,
  assertAccountActive,
  connectionUsage,
  ensureQuota,
  getSettings,
  logActivity,
  quotaSummary,
  storageBreakdown,
  usernameFor,
} from "@/lib/account.server";
import { deleteObject } from "@/lib/storage.server";

const ROOT = "root";
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const SORT_MAP = { name: "name", size: "-size_bytes", date: "-created_date", type: "category" };
const PAGE_SIZE = 60;

async function prepare(context) {
  const svc = context.getBase44().asServiceRole;
  const user = context.user;
  const quota = await ensureQuota(svc, user);
  assertAccountActive(quota);
  return { svc, user, quota };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function descendantFolders(svc, userId, rootIds) {
  const collected = new Set(rootIds);
  let frontier = rootIds;
  for (let depth = 0; depth < 20 && frontier.length > 0; depth += 1) {
    const rows = asArray(await svc.entities.Folder.filter({ owner_id: userId, parent_id: { $in: frontier } }));
    frontier = rows.map((row) => row.id).filter((id) => !collected.has(id));
    frontier.forEach((id) => collected.add(id));
  }
  return Array.from(collected);
}

async function breadcrumbsFor(svc, userId, folderId) {
  const trail = [];
  let current = folderId;
  for (let depth = 0; depth < 30 && current && current !== ROOT; depth += 1) {
    const folder = await svc.entities.Folder.get(current).catch(() => null);
    if (!folder || folder.owner_id !== userId) break;
    trail.unshift({ id: folder.id, name: folder.name });
    current = folder.parent_id || ROOT;
  }
  return trail;
}

/* ------------------------------------------------------------------ account */

/** Public: lets the registration form tell whether a username is free. */
export const checkUsername = createServerFn({ method: "GET" })
  .validator(z.object({ username: z.string().min(1).max(40) }))
  .handler(async ({ data, context }) => {
    const username = data.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return { available: false, reason: "3-24 characters: letters, numbers, dot, dash or underscore." };
    }
    const svc = context.getBase44().asServiceRole;
    const rows = asArray(await svc.entities.User.filter({ username }));
    return { available: rows.length === 0, reason: rows.length ? "That username is already taken." : "" };
  });

export const claimUsername = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ username: z.string().min(1).max(40) }))
  .handler(async ({ data, context }) => {
    const svc = context.getBase44().asServiceRole;
    const user = context.user;
    const username = data.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      throw Object.assign(new Error("Choose 3-24 characters using letters, numbers, dot, dash or underscore."), { status: 400 });
    }
    const taken = asArray(await svc.entities.User.filter({ username }));
    if (taken.some((row) => row.id !== user.id)) {
      throw Object.assign(new Error("That username is already taken."), { status: 409 });
    }
    await svc.entities.User.update(user.id, { username });
    const quota = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }))[0];
    if (quota) await svc.entities.UserQuota.update(quota.id, { username });
    return { username };
  });

/** Username sign-in: resolves the account's email so the platform can verify the password. */
export const resolveLoginIdentifier = createServerFn({ method: "POST" })
  .validator(z.object({ identifier: z.string().min(1).max(120) }))
  .handler(async ({ data, context }) => {
    const value = data.identifier.trim();
    if (value.includes("@")) return { email: value.toLowerCase() };
    const svc = context.getBase44().asServiceRole;
    const rows = asArray(await svc.entities.User.filter({ username: value.toLowerCase() }));
    return { email: rows[0]?.email ?? null };
  });

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const svc = context.getBase44().asServiceRole;
    const user = context.user;
    const quota = await ensureQuota(svc, user);
    const settings = await getSettings(svc);
    const breakdown = await storageBreakdown(svc, user.id);
    const connections = await connectionUsage(svc);
    const adminRows = asArray(await svc.entities.User.filter({ role: "admin" }).catch(() => []));
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name ?? "",
        role: user.role ?? "user",
        username: user.username ?? usernameFor(user),
        created_date: user.created_date ?? null,
      },
      quota: { ...quota, ...quotaSummary(quota, breakdown) },
      storage: quotaSummary(quota, breakdown),
      storageReady: connections.some((c) => c.is_active && c.status !== "disabled"),
      connectionCount: connections.filter((c) => c.is_active).length,
      adminExists: adminRows.length > 0,
      registrationEnabled: settings.registration_enabled !== false,
      maintenanceMode: settings.maintenance_mode === true,
      maxFileBytes: Number(settings.max_file_bytes) || 0,
      lowStorageThreshold: Number(settings.low_storage_threshold) || 15,
    };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc, user, quota } = await prepare(context);
    const [breakdown, fileCount, folderCount, trashCount, recentFiles, activity] = await Promise.all([
      storageBreakdown(svc, user.id),
      svc.entities.StoredFile.count({ owner_id: user.id, status: "active" }),
      svc.entities.Folder.count({ owner_id: user.id, status: "active" }),
      svc.entities.StoredFile.count({ owner_id: user.id, status: "trashed" }),
      svc.entities.StoredFile.filter({ owner_id: user.id, status: "active" }, { sort: "-created_date", limit: 6 }),
      svc.entities.FileActivity.filter({ user_id: user.id }, { sort: "-created_date", limit: 8 }),
    ]);
    const connections = await connectionUsage(svc);
    return {
      username: user.username || usernameFor(user),
      storage: quotaSummary(quota, breakdown),
      fileCount,
      folderCount,
      trashCount,
      recentFiles: asArray(recentFiles),
      activity: asArray(activity),
      storageReady: connections.some((c) => c.is_active && c.status !== "disabled"),
    };
  });

/* -------------------------------------------------------------------- files */

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(
    z.object({
      scope: z.enum(["active", "trashed", "starred", "recent"]).optional(),
      folderId: z.string().optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      sort: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.number().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const scope = data.scope || "active";
    const search = (data.search || "").trim();
    const category = data.category && data.category !== "all" ? data.category : null;
    const limit = Math.min(Math.max(Number(data.limit) || PAGE_SIZE, 1), 200);

    const query = { owner_id: user.id };
    if (scope === "trashed") {
      query.status = "trashed";
    } else {
      query.status = "active";
      if (scope === "starred") query.is_favorite = true;
      if (scope === "active") query.folder_id = data.folderId || ROOT;
    }
    if (category) query.category = category;
    if (search) query.name = { $regex: escapeRegex(search), $options: "i" };

    const page = await svc.entities.StoredFile.filter(query, {
      sort: SORT_MAP[data.sort] || "-created_date",
      limit,
      ...(data.cursor ? { cursor: data.cursor } : {}),
    });
    const isPage = !Array.isArray(page) && page && Array.isArray(page.items);

    let folders = [];
    if (scope === "active" && !search && !category) {
      folders = asArray(
        await svc.entities.Folder.filter({ owner_id: user.id, status: "active", parent_id: data.folderId || ROOT }, { sort: "name", limit: 200 }),
      );
    }
    if (scope === "trashed" && !search) {
      folders = asArray(
        await svc.entities.Folder.filter({ owner_id: user.id, status: "trashed" }, { sort: "-trashed_at", limit: 200 }),
      );
    }

    return {
      files: asArray(page),
      folders,
      hasMore: isPage ? !!page.has_more : false,
      nextCursor: isPage ? (page.next_cursor ?? null) : null,
      breadcrumbs: scope === "active" ? await breadcrumbsFor(svc, user.id, data.folderId || ROOT) : [],
      currentFolder: data.folderId || ROOT,
    };
  });

export const folderTree = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc, user } = await prepare(context);
    const folders = asArray(await svc.entities.Folder.filter({ owner_id: user.id, status: "active" }, { sort: "name", limit: 500 }));
    return folders.map((f) => ({ id: f.id, name: f.name, parent_id: f.parent_id || ROOT }));
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ name: z.string().min(1).max(120), parentId: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const parentId = data.parentId || ROOT;
    if (parentId !== ROOT) {
      const parent = await svc.entities.Folder.get(parentId).catch(() => null);
      if (!parent || parent.owner_id !== user.id) {
        throw Object.assign(new Error("Folder not found."), { status: 404 });
      }
    }
    const existing = asArray(await svc.entities.Folder.filter({ owner_id: user.id, parent_id: parentId, name: data.name.trim() }));
    if (existing.length > 0) {
      throw Object.assign(new Error("A folder with that name already exists here."), { status: 409 });
    }
    const folder = await svc.entities.Folder.create({
      owner_id: user.id,
      name: data.name.trim(),
      parent_id: parentId,
      status: "active",
    });
    await logActivity(svc, user, "folder_created", folder.name, 0, "");
    return folder;
  });

export const renameItem = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string(), kind: z.enum(["file", "folder"]), name: z.string().min(1).max(180) }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const entity = data.kind === "file" ? svc.entities.StoredFile : svc.entities.Folder;
    const record = await entity.get(data.id).catch(() => null);
    if (!record || record.owner_id !== user.id) {
      throw Object.assign(new Error("Item not found."), { status: 404 });
    }
    const name = data.name.trim();
    if (!name) throw Object.assign(new Error("A name is required."), { status: 400 });
    await entity.update(data.id, { name });
    await logActivity(svc, user, "renamed", name, 0, `Previously "${record.name}"`);
    return { id: data.id, name };
  });

async function setTrashState(svc, user, fileIds, folderIds, trashed) {
  const folderIdsAll = folderIds.length > 0 ? await descendantFolders(svc, user.id, folderIds) : [];
  const ownedFolders = folderIdsAll.length
    ? asArray(await svc.entities.Folder.filter({ owner_id: user.id, id: { $in: folderIdsAll } }))
    : [];
  const now = new Date().toISOString();

  if (ownedFolders.length > 0) {
    await svc.entities.Folder.updateMany(
      { owner_id: user.id, id: { $in: ownedFolders.map((f) => f.id) } },
      { $set: { status: trashed ? "trashed" : "active", ...(trashed ? { trashed_at: now } : {}) } },
    );
  }

  const folderSet = ownedFolders.map((f) => f.id);
  const affected = folderSet.length
    ? asArray(await svc.entities.StoredFile.filter({ owner_id: user.id, folder_id: { $in: folderSet } }))
    : [];
  const ids = new Set([...fileIds, ...affected.map((f) => f.id)].filter(Boolean));
  if (ids.size === 0) return { count: 0, bytes: 0 };

  const owned = asArray(await svc.entities.StoredFile.filter({ owner_id: user.id, id: { $in: Array.from(ids) } }));
  if (owned.length === 0) return { count: 0, bytes: 0 };
  await svc.entities.StoredFile.updateMany(
    { owner_id: user.id, id: { $in: owned.map((f) => f.id) } },
    { $set: { status: trashed ? "trashed" : "active", ...(trashed ? { trashed_at: now } : {}) } },
  );
  return { count: owned.length, bytes: owned.reduce((sum, f) => sum + (Number(f.size_bytes) || 0), 0) };
}

export const trashItems = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ fileIds: z.array(z.string()).max(500), folderIds: z.array(z.string()).max(200) }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    if (data.fileIds.length === 0 && data.folderIds.length === 0) return { count: 0 };
    const result = await setTrashState(svc, user, data.fileIds, data.folderIds, true);
    await logActivity(svc, user, "moved_to_trash", "", result.bytes, `${result.count} item(s)`);
    return { count: result.count, bytes: result.bytes };
  });

export const restoreItems = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ fileIds: z.array(z.string()).max(500), folderIds: z.array(z.string()).max(200) }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const result = await setTrashState(svc, user, data.fileIds, data.folderIds, false);
    await logActivity(svc, user, "restored", "", result.bytes, `${result.count} item(s)`);
    return { count: result.count };
  });

/** Permanently removes records and the stored objects behind them. */
export const deleteForever = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ fileIds: z.array(z.string()).max(500), folderIds: z.array(z.string()).max(200) }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const folderIds = data.folderIds.length > 0 ? await descendantFolders(svc, user.id, data.folderIds) : [];
    const ownedFolders = folderIds.length
      ? asArray(await svc.entities.Folder.filter({ owner_id: user.id, id: { $in: folderIds } }))
      : [];
    const inFolders = ownedFolders.length
      ? asArray(await svc.entities.StoredFile.filter({ owner_id: user.id, folder_id: { $in: ownedFolders.map((f) => f.id) } }))
      : [];
    const ids = new Set([...data.fileIds, ...inFolders.map((f) => f.id)].filter(Boolean));
    const owned = ids.size
      ? asArray(await svc.entities.StoredFile.filter({ owner_id: user.id, id: { $in: Array.from(ids) } }))
      : [];

    const connections = new Map();
    let deleted = 0;
    let bytes = 0;
    const failures = [];
    for (const file of owned) {
      try {
        if (!connections.has(file.connection_id)) {
          const connection = await svc.entities.StorageConnection.get(file.connection_id).catch(() => null);
          connections.set(file.connection_id, connection);
        }
        const connection = connections.get(file.connection_id);
        if (connection) await deleteObject(connection, file.storage_key);
        await svc.entities.StoredFile.delete(file.id);
        deleted += 1;
        bytes += Number(file.size_bytes) || 0;
      } catch (error) {
        failures.push({ name: file.name, message: error?.message || "Storage error" });
      }
    }
    if (ownedFolders.length > 0) {
      await svc.entities.Folder.deleteMany({ owner_id: user.id, id: { $in: ownedFolders.map((f) => f.id) } });
    }
    await logActivity(svc, user, "deleted", "", bytes, `${deleted} item(s) permanently removed`);
    return {
      deleted,
      bytes,
      failed: failures.length,
      message: failures.length ? `${failures.length} item(s) could not be removed from storage and were kept.` : "",
    };
  });

export const emptyTrash = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc, user } = await prepare(context);
    const trashedFiles = asArray(await svc.entities.StoredFile.filter({ owner_id: user.id, status: "trashed" }));
    const trashedFolders = asArray(await svc.entities.Folder.filter({ owner_id: user.id, status: "trashed" }));
    if (trashedFiles.length === 0 && trashedFolders.length === 0) return { deleted: 0 };

    const connections = new Map();
    let deleted = 0;
    let bytes = 0;
    let failed = 0;
    for (const file of trashedFiles) {
      try {
        if (!connections.has(file.connection_id)) {
          const connection = await svc.entities.StorageConnection.get(file.connection_id).catch(() => null);
          connections.set(file.connection_id, connection);
        }
        const connection = connections.get(file.connection_id);
        if (connection) await deleteObject(connection, file.storage_key);
        await svc.entities.StoredFile.delete(file.id);
        deleted += 1;
        bytes += Number(file.size_bytes) || 0;
      } catch {
        failed += 1;
      }
    }
    if (trashedFolders.length > 0) {
      await svc.entities.Folder.deleteMany({ owner_id: user.id, id: { $in: trashedFolders.map((f) => f.id) } });
    }
    await logActivity(svc, user, "trash_emptied", "", bytes, `${deleted} item(s) permanently removed`);
    return { deleted, bytes, failed };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string(), value: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const file = await svc.entities.StoredFile.get(data.id).catch(() => null);
    if (!file || file.owner_id !== user.id) {
      throw Object.assign(new Error("File not found."), { status: 404 });
    }
    await svc.entities.StoredFile.update(data.id, { is_favorite: data.value });
    return { id: data.id, is_favorite: data.value };
  });

/** A short-lived access URL for previewing or downloading one owned file. */
export const createAccessUrl = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ fileId: z.string(), purpose: z.enum(["preview", "download"]).optional(), ttlMinutes: z.number().optional() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const file = await svc.entities.StoredFile.get(data.fileId).catch(() => null);
    if (!file || file.owner_id !== user.id) {
      throw Object.assign(new Error("File not found."), { status: 404 });
    }
    const ttl = Math.min(Math.max(Number(data.ttlMinutes) || 15, 1), 720);
    const grant = await svc.entities.FileAccessToken.create({
      file_id: file.id,
      owner_id: user.id,
      token: `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""),
      purpose: data.purpose || "preview",
      expires_at: new Date(Date.now() + ttl * 60000).toISOString(),
    });
    return { url: `/api/storage/file?token=${grant.token}`, expires_at: grant.expires_at, name: file.name };
  });

/** Batched preview URLs for a page of files (grid thumbnails). */
export const createAccessUrls = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ fileIds: z.array(z.string()).max(40), ttlMinutes: z.number().optional() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    if (data.fileIds.length === 0) return { urls: {} };
    const owned = asArray(await svc.entities.StoredFile.filter({ owner_id: user.id, id: { $in: data.fileIds } }));
    const ttl = Math.min(Math.max(Number(data.ttlMinutes) || 60, 1), 720);
    const urls = {};
    for (const file of owned) {
      const grant = await svc.entities.FileAccessToken.create({
        file_id: file.id,
        owner_id: user.id,
        token: `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""),
        purpose: "preview",
        expires_at: new Date(Date.now() + ttl * 60000).toISOString(),
      });
      urls[file.id] = `/api/storage/file?token=${grant.token}`;
    }
    return { urls };
  });

export const getFileDetail = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const file = await svc.entities.StoredFile.get(data.id).catch(() => null);
    if (!file || file.owner_id !== user.id) {
      throw Object.assign(new Error("File not found."), { status: 404 });
    }
    const connection = await svc.entities.StorageConnection.get(file.connection_id).catch(() => null);
    return {
      file,
      folder: file.folder_id && file.folder_id !== ROOT
        ? await svc.entities.Folder.get(file.folder_id).catch(() => null)
        : null,
      storageLabel: connection?.label ?? "ZetaCloud storage",
    };
  });

/* ------------------------------------------------------------------ sharing */

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ fileId: z.string(), expiresInHours: z.number().min(1).max(720).optional() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const file = await svc.entities.StoredFile.get(data.fileId).catch(() => null);
    if (!file || file.owner_id !== user.id) {
      throw Object.assign(new Error("File not found."), { status: 404 });
    }
    const hours = Number(data.expiresInHours) || 24;
    const link = await svc.entities.ShareLink.create({
      file_id: file.id,
      file_name: file.name,
      owner_id: user.id,
      token: `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""),
      expires_at: new Date(Date.now() + hours * 3600000).toISOString(),
      revoked: false,
      download_count: 0,
    });
    await logActivity(svc, user, "share_created", file.name, 0, `Expires in ${hours}h`);
    return { ...link, url: `/api/storage/file?token=${link.token}` };
  });

export const listShareLinks = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc, user } = await prepare(context);
    const rows = asArray(await svc.entities.ShareLink.filter({ owner_id: user.id }, { sort: "-created_date", limit: 100 }));
    return rows.map((row) => ({ ...row, url: `/api/storage/file?token=${row.token}` }));
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const link = await svc.entities.ShareLink.get(data.id).catch(() => null);
    if (!link || link.owner_id !== user.id) throw Object.assign(new Error("Link not found."), { status: 404 });
    await svc.entities.ShareLink.update(data.id, { revoked: true });
    await logActivity(svc, user, "share_revoked", link.file_name, 0, "");
    return { id: data.id };
  });

/* ----------------------------------------------------------------- settings */

export const getSettingsPage = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc, user, quota } = await prepare(context);
    const breakdown = await storageBreakdown(svc, user.id);
    const [fileCount, folderCount, trashCount, activity] = await Promise.all([
      svc.entities.StoredFile.count({ owner_id: user.id, status: "active" }),
      svc.entities.Folder.count({ owner_id: user.id, status: "active" }),
      svc.entities.StoredFile.count({ owner_id: user.id, status: "trashed" }),
      svc.entities.FileActivity.filter({ user_id: user.id }, { sort: "-created_date", limit: 12 }),
    ]);
    return {
      profile: {
        email: user.email,
        full_name: user.full_name ?? "",
        username: user.username ?? "",
        role: user.role ?? "user",
        created_date: user.created_date ?? null,
      },
      quota: { status: quota.status, quota_bytes: Number(quota.quota_bytes) || 0 },
      storage: quotaSummary(quota, breakdown),
      fileCount,
      folderCount,
      trashCount,
      activity: asArray(activity),
      notifications: {
        notify_uploads: quota.notify_uploads !== false,
        notify_security: quota.notify_security !== false,
        notify_storage: quota.notify_storage !== false,
      },
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ full_name: z.string().max(120), username: z.string().min(1).max(40) }))
  .handler(async ({ data, context }) => {
    const svc = context.getBase44().asServiceRole;
    const user = context.user;
    const username = data.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      throw Object.assign(new Error("Choose 3-24 characters using letters, numbers, dot, dash or underscore."), { status: 400 });
    }
    const taken = asArray(await svc.entities.User.filter({ username }));
    if (taken.some((row) => row.id !== user.id)) {
      throw Object.assign(new Error("That username is already taken."), { status: 409 });
    }
    await svc.entities.User.update(user.id, { username, full_name: data.full_name });
    const quotaRows = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }));
    if (quotaRows[0]) await svc.entities.UserQuota.update(quotaRows[0].id, { username });

    // Email changes go through verification: we only record that one was asked for.
    const settingsChanged = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }))[0];
    return { username, full_name: data.full_name, email: settingsChanged?.email ?? user.email };
  });

export const updateNotifications = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ notify_uploads: z.boolean(), notify_security: z.boolean(), notify_storage: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = await prepare(context);
    const rows = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }));
    if (rows[0]) await svc.entities.UserQuota.update(rows[0].id, data);
    await svc.entities.User.update(user.id, data);
    return { ...data };
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ confirm: z.literal(true) }))
  .handler(async ({ context }) => {
    const { svc, user } = await prepare(context);
    const rows = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }));
    if (rows[0]) await svc.entities.UserQuota.update(rows[0].id, { status: "deletion_requested" });
    await logActivity(svc, user, "deletion_requested", "", 0, "Account deletion requested");
    await svc.entities.AuditLog.create({
      actor_email: user.email,
      action: "account_deletion_requested",
      target: user.email,
      detail: "Requested from the settings page",
    });
    return { requested: true };
  });