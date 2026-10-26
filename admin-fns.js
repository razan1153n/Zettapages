import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  asArray,
  adminUserIds,
  assertAdmin,
  audit,
  connectionUsage,
  getSettings,
  membersOnly,
  recomputeAllocations,
  systemCapacity,
  DEFAULT_SETTINGS,
} from "@/lib/account.server";
import { deleteObject, ensureRepository, inspectConnection } from "@/lib/storage.server";
import { GB } from "@/lib/format";

const ROOT = "root";
const PAGE = 20;
const mask = (token) => (token ? `${String(token).slice(0, 3)}••••${String(token).slice(-4)}` : "");

function admin(context) {
  assertAdmin(context);
  return { svc: context.getBase44().asServiceRole, user: context.user };
}

function publicConnection(connection) {
  const { access_token, ...rest } = connection;
  return {
    ...rest,
    capacity_bytes: Number(connection.capacity_bytes) || 0,
    token_preview: mask(access_token),
    has_token: !!access_token,
  };
}

/** Sums bytes and file counts per owner in a single aggregate call. */
async function usageByOwner(svc) {
  const result = await svc.entities.StoredFile.aggregate({ query: {}, groupBy: "owner_id", sum: ["size_bytes"] });
  const map = new Map();
  for (const row of result?.rows ?? []) {
    const key = row.owner_id ?? row.group ?? row._id ?? row.groupKey;
    map.set(key, { bytes: Number(row.sum_size_bytes) || 0, files: Number(row.count) || 0 });
  }
  return map;
}

export const claimFoundingAdmin = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const svc = context.getBase44().asServiceRole;
    const admins = asArray(await svc.entities.User.filter({ role: "admin" }).catch(() => []));
    if (admins.length > 0) {
      return { granted: false, reason: "An administrator already exists for this workspace." };
    }
    await svc.entities.User.update(context.user.id, { role: "admin" });
    await audit(svc, context.user, "founding_admin_claimed", context.user.email, "First administrator account");
    return { granted: true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc } = admin(context);
    const capacity = await systemCapacity(svc);
    const notAdmin = membersOnly(await adminUserIds(svc));
    const [userCount, activeUsers, suspended, folders, trashFiles, uploads, auditRows, activityRows] = await Promise.all([
      svc.entities.UserQuota.count(notAdmin),
      svc.entities.UserQuota.count({ ...notAdmin, status: "active" }),
      svc.entities.UserQuota.count({ ...notAdmin, status: "suspended" }),
      svc.entities.Folder.count({ status: "active" }),
      svc.entities.StoredFile.count({ status: "trashed" }),
      svc.entities.UploadJob.filter({}, { sort: "-created_date", limit: 8 }),
      svc.entities.AuditLog.filter({}, { sort: "-created_date", limit: 8 }),
      svc.entities.FileActivity.filter({}, { sort: "-created_date", limit: 8 }),
    ]);
    const recent = asArray(await svc.entities.UserQuota.filter(notAdmin, { sort: "-last_seen", limit: 50 }));
    const online = recent.filter((row) => row.last_seen && Date.now() - new Date(row.last_seen).getTime() < 15 * 60000).length;
    const fileCount = await svc.entities.StoredFile.count({});
    const failures = asArray(await svc.entities.UploadJob.filter({ status: "failed" }, { sort: "-created_date", limit: 6 }));
    const errors = capacity.connections.filter((c) => c.status === "error" || c.last_error);

    const warnings = [];
    if (capacity.connections.length === 0) warnings.push({ level: "critical", message: "No storage repository is connected yet. Uploads are blocked for every user." });
    if (capacity.total > 0 && capacity.used / capacity.total > 0.85) warnings.push({ level: "high", message: "Storage is more than 85% full. Add a repository or raise its capacity." });
    if (capacity.used > capacity.usable) warnings.push({ level: "high", message: "Stored data exceeds usable capacity after the reserved pool. Add capacity." });
    if (errors.length > 0) warnings.push({ level: "high", message: `${errors.length} storage repository(ies) reported an error.` });
    if (failures.length > 0) warnings.push({ level: "medium", message: `${failures.length} recent upload(s) failed.` });

    return {
      total_capacity: capacity.total,
      usable_capacity: capacity.usable,
      used_bytes: capacity.used,
      remaining_bytes: capacity.remaining,
      reserved_bytes: capacity.reserved,
      allocation_policy: capacity.settings.allocation_policy,
      connections: capacity.connections.map(publicConnection),
      user_count: userCount,
      active_users: activeUsers,
      suspended_users: suspended,
      online_users: online,
      file_count: fileCount,
      folder_count: folders,
      trash_count: trashFiles,
      recent_audit: asArray(auditRows),
      recent_activity: asArray(activityRows),
      recent_uploads: asArray(uploads),
      recent_failures: failures,
      warnings,
      max_file_bytes: Number(capacity.settings.max_file_bytes) || DEFAULT_SETTINGS.max_file_bytes,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(
    z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      cursor: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { svc } = admin(context);
    const query = membersOnly(await adminUserIds(svc));
    if (data.status && data.status !== "all") query.status = data.status;
    if (data.search && data.search.trim()) {
      const needle = data.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { email: { $regex: needle, $options: "i" } },
        { username: { $regex: needle, $options: "i" } },
      ];
    }
    const page = await svc.entities.UserQuota.filter(query, { sort: "-created_date", limit: PAGE, ...(data.cursor ? { cursor: data.cursor } : {}) });
    const isPage = !Array.isArray(page) && page && Array.isArray(page.items);
    const rows = asArray(page);
    const usage = await usageByOwner(svc);
    return {
      users: rows.map((row) => {
        const used = usage.get(row.user_id) || { bytes: 0, files: 0 };
        const quotaBytes = Number(row.quota_bytes) || 0;
        return {
          id: row.id,
          user_id: row.user_id,
          email: row.email,
          username: row.username,
          status: row.status,
          quota_bytes: quotaBytes,
          used_bytes: used.bytes,
          file_count: used.files,
          remaining_bytes: Math.max(0, quotaBytes - used.bytes),
          last_seen: row.last_seen,
          created_date: row.created_date,
        };
      }),
      hasMore: isPage ? !!page.has_more : false,
      nextCursor: isPage ? (page.next_cursor ?? null) : null,
    };
  });

export const adminUserActivity = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data, context }) => {
    const { svc } = admin(context);
    const [quotas, activity, uploads] = await Promise.all([
      svc.entities.UserQuota.filter({ user_id: data.userId }),
      svc.entities.FileActivity.filter({ user_id: data.userId }, { sort: "-created_date", limit: 20 }),
      svc.entities.UploadJob.filter({ user_id: data.userId }, { sort: "-created_date", limit: 10 }),
    ]);
    const quota = asArray(quotas)[0];
    return {
      quota: quota ? publicConnection(quota) : null,
      activity: asArray(activity),
      uploads: asArray(uploads),
    };
  });

export const adminUpdateUserQuota = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ quotaId: z.string(), quotaBytes: z.number().min(0) }))
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const quota = await svc.entities.UserQuota.get(data.quotaId).catch(() => null);
    if (!quota) throw Object.assign(new Error("Account not found."), { status: 404 });
    await svc.entities.UserQuota.update(data.quotaId, { quota_bytes: data.quotaBytes });
    await audit(svc, user, "quota_changed", quota.email, `New quota: ${(data.quotaBytes / GB).toFixed(2)} GB`);
    return { quota_bytes: data.quotaBytes };
  });

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ quotaId: z.string(), status: z.enum(["active", "suspended", "deletion_requested"]) }))
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const quota = await svc.entities.UserQuota.get(data.quotaId).catch(() => null);
    if (!quota) throw Object.assign(new Error("Account not found."), { status: 404 });
    await svc.entities.UserQuota.update(data.quotaId, { status: data.status });
    await audit(svc, user, `account_${data.status}`, quota.email, "Account status changed by administrator");
    return { status: data.status };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ quotaId: z.string(), purgeFiles: z.boolean().optional() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const quota = await svc.entities.UserQuota.get(data.quotaId).catch(() => null);
    if (!quota) throw Object.assign(new Error("Account not found."), { status: 404 });
    if (quota.user_id === user.id) throw Object.assign(new Error("You cannot close your own administrator account."), { status: 400 });

    let purged = 0;
    if (data.purgeFiles) {
      const files = asArray(await svc.entities.StoredFile.filter({ owner_id: quota.user_id }));
      const connections = new Map();
      for (const file of files) {
        try {
          if (!connections.has(file.connection_id)) {
            connections.set(file.connection_id, await svc.entities.StorageConnection.get(file.connection_id).catch(() => null));
          }
          const connection = connections.get(file.connection_id);
          if (connection) await deleteObject(connection, file.storage_key);
          await svc.entities.StoredFile.delete(file.id);
          purged += 1;
        } catch {
          // Leave the record so its storage object is never orphaned silently.
        }
      }
      await svc.entities.Folder.deleteMany({ owner_id: quota.user_id });
    }
    await svc.entities.UserQuota.update(data.quotaId, { status: "deleted" });
    await audit(svc, user, "account_closed", quota.email, data.purgeFiles ? `Closed and purged ${purged} file(s)` : "Closed, files preserved");
    return { closed: true, purged };
  });

/* ---------------------------------------------------------------- storage */

export const adminListConnections = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc } = admin(context);
    const connections = await connectionUsage(svc);
    return connections.map(publicConnection);
  });

export const adminSaveConnection = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().optional(),
      label: z.string().min(1).max(80),
      repoId: z.string().min(3).max(160),
      repoType: z.enum(["dataset", "model"]),
      accessToken: z.string().optional(),
      capacityGb: z.number().min(0).max(100000),
      notes: z.string().max(400).optional(),
      createIfMissing: z.boolean().optional(),
      testOnly: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const repoId = data.repoId.trim();

    if (data.testOnly) {
      if (!data.accessToken && !data.id) throw Object.assign(new Error("Enter an access token to test."), { status: 400 });
      let token = data.accessToken;
      if (!token && data.id) {
        const existing = await svc.entities.StorageConnection.get(data.id).catch(() => null);
        token = existing?.access_token;
      }
      const result = await inspectConnection({ repo_type: data.repoType, repo_id: repoId, access_token: token });
      return { test: result };
    }

    const existing = data.id ? await svc.entities.StorageConnection.get(data.id).catch(() => null) : null;
    const token = data.accessToken?.trim() || existing?.access_token;
    if (!token) throw Object.assign(new Error("An access token is required."), { status: 400 });

    const probe = { repo_type: data.repoType, repo_id: repoId, access_token: token };
    let inspection = await inspectConnection(probe);

    if (!inspection.ok && data.createIfMissing) {
      try {
        await ensureRepository(probe);
        inspection = await inspectConnection(probe);
      } catch (error) {
        inspection = { ok: false, message: error?.message || "Could not create the repository." };
      }
    }

    const payload = {
      label: data.label.trim(),
      provider: "huggingface",
      repo_type: data.repoType,
      repo_id: repoId,
      access_token: token,
      capacity_bytes: Math.round(data.capacityGb * GB),
      notes: data.notes || "",
      is_active: true,
      status: inspection.ok ? "connected" : "error",
      last_error: inspection.ok ? "" : inspection.message,
      last_checked: new Date().toISOString(),
    };

    const saved = existing
      ? await svc.entities.StorageConnection.update(existing.id, payload)
      : await svc.entities.StorageConnection.create(payload);
    await audit(svc, user, existing ? "storage_repository_updated" : "storage_repository_added", data.label, repoId);
    return { connection: publicConnection(saved), test: inspection };
  });

export const adminTestConnection = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { svc } = admin(context);
    const connection = await svc.entities.StorageConnection.get(data.id).catch(() => null);
    if (!connection) throw Object.assign(new Error("Repository not found."), { status: 404 });
    const result = await inspectConnection(connection);
    await svc.entities.StorageConnection.update(connection.id, {
      status: result.ok ? "connected" : "error",
      last_error: result.ok ? "" : result.message,
      last_checked: new Date().toISOString(),
    });
    return { test: result };
  });

export const adminUpdateConnection = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string(), capacityGb: z.number().min(0).max(100000), isActive: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const connection = await svc.entities.StorageConnection.get(data.id).catch(() => null);
    if (!connection) throw Object.assign(new Error("Repository not found."), { status: 404 });
    await svc.entities.StorageConnection.update(data.id, {
      capacity_bytes: Math.round(data.capacityGb * GB),
      is_active: data.isActive,
      status: data.isActive ? "connected" : "disabled",
    });
    await audit(svc, user, "storage_repository_updated", connection.label, data.isActive ? "Enabled" : "Disabled");
    return { ok: true };
  });

export const adminDeleteConnection = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const connection = await svc.entities.StorageConnection.get(data.id).catch(() => null);
    if (!connection) throw Object.assign(new Error("Repository not found."), { status: 404 });
    const stored = await svc.entities.StoredFile.count({ connection_id: data.id });
    if (stored > 0) {
      throw Object.assign(new Error(`This repository still holds ${stored} file(s). Remove them before disconnecting it.`), { status: 409 });
    }
    await svc.entities.StorageConnection.delete(data.id);
    await audit(svc, user, "storage_repository_removed", connection.label, connection.repo_id);
    return { removed: true };
  });

/* --------------------------------------------------------------- settings */

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc } = admin(context);
    const settings = await getSettings(svc);
    const capacity = await systemCapacity(svc);
    const notAdmin = membersOnly(await adminUserIds(svc));
    return {
      settings: {
        allocation_policy: settings.allocation_policy || "equal",
        default_quota_bytes: Number(settings.default_quota_bytes) || 0,
        min_quota_bytes: Number(settings.min_quota_bytes) || 0,
        max_file_bytes: Number(settings.max_file_bytes) || 0,
        reserved_bytes: Number(settings.reserved_bytes) || 0,
        registration_enabled: settings.registration_enabled !== false,
        maintenance_mode: settings.maintenance_mode === true,
        low_storage_threshold: Number(settings.low_storage_threshold) || 15,
      },
      capacity: {
        total: capacity.total,
        reserved: capacity.reserved,
        usable: capacity.usable,
        used: capacity.used,
        remaining: capacity.remaining,
      },
      user_count: await svc.entities.UserQuota.count(notAdmin),
    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      allocation_policy: z.enum(["equal", "fixed", "proportional"]),
      default_quota_gb: z.number().min(0).max(100000),
      min_quota_gb: z.number().min(0).max(100000),
      max_file_mb: z.number().min(1).max(95000),
      reserved_gb: z.number().min(0).max(100000),
      registration_enabled: z.boolean(),
      maintenance_mode: z.boolean(),
      low_storage_threshold: z.number().min(1).max(90),
    }),
  )
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const existing = await getSettings(svc);
    const payload = {
      allocation_policy: data.allocation_policy,
      default_quota_bytes: Math.round(data.default_quota_gb * GB),
      min_quota_bytes: Math.round(data.min_quota_gb * GB),
      max_file_bytes: Math.round(data.max_file_mb * 1024 * 1024),
      reserved_bytes: Math.round(data.reserved_gb * GB),
      registration_enabled: data.registration_enabled,
      maintenance_mode: data.maintenance_mode,
      low_storage_threshold: data.low_storage_threshold,
    };
    await svc.entities.AppSetting.update(existing.id, payload);
    await audit(svc, user, "settings_updated", "Application settings", `Policy: ${data.allocation_policy}`);
    return { settings: payload };
  });

export const adminRecomputeAllocations = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ force: z.boolean().optional() }))
  .handler(async ({ data, context }) => {
    const { svc, user } = admin(context);
    const result = await recomputeAllocations(svc, { force: !!data.force });
    await audit(
      svc,
      user,
      "allocations_recomputed",
      `${result.users} account(s)`,
      `${result.changes} quota(s) updated · policy ${result.policy}${data.force ? " · forced" : ""}`,
    );
    return result;
  });

export const adminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ cursor: z.string().optional(), search: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { svc } = admin(context);
    const query = {};
    if (data.search && data.search.trim()) {
      const needle = data.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { action: { $regex: needle, $options: "i" } },
        { actor_email: { $regex: needle, $options: "i" } },
        { target: { $regex: needle, $options: "i" } },
      ];
    }
    const page = await svc.entities.AuditLog.filter(query, { sort: "-created_date", limit: 30, ...(data.cursor ? { cursor: data.cursor } : {}) });
    const isPage = !Array.isArray(page) && page && Array.isArray(page.items);
    return {
      entries: asArray(page),
      hasMore: isPage ? !!page.has_more : false,
      nextCursor: isPage ? (page.next_cursor ?? null) : null,
    };
  });

export const adminStorageDistribution = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { svc } = admin(context);
    const connections = await connectionUsage(svc);
    const files = asArray(await svc.entities.StoredFile.filter({}, { sort: "-created_date", limit: 200 }));
    const byFolder = new Map();
    for (const file of files) {
      const key = file.folder_id || ROOT;
      byFolder.set(key, (byFolder.get(key) || 0) + 1);
    }
    return { connections: connections.map(publicConnection), folderSpread: Array.from(byFolder.entries()).length };
  });