/**
 * Server-only account, quota and allocation logic. Every helper takes the
 * service-role client so callers must scope reads explicitly by owner.
 */
import { GB, MB } from "@/lib/format";

export const DEFAULT_SETTINGS = {
  singleton: "app",
  allocation_policy: "equal",
  default_quota_bytes: 10 * GB,
  min_quota_bytes: 1 * GB,
  max_file_bytes: 100 * MB,
  reserved_bytes: 2 * GB,
  registration_enabled: true,
  maintenance_mode: false,
  low_storage_threshold: 15,
};

/** Some SDK list calls return an array, others a page — normalise both. */
export const asArray = (value) => (Array.isArray(value) ? value : (value?.items ?? []));

export function assertAdmin(context) {
  if (context.user?.role !== "admin") {
    throw Object.assign(new Error("Administrator access required"), { status: 403, code: "FORBIDDEN" });
  }
}

/** Administrator accounts run the service — they are never counted as members. */
export async function adminUserIds(svc) {
  const admins = asArray(await svc.entities.User.filter({ role: "admin" }).catch(() => []));
  return admins.map((row) => row.id).filter(Boolean);
}

/** Query fragment that leaves administrator accounts out of a member view. */
export function membersOnly(adminIds) {
  return adminIds?.length > 0 ? { user_id: { $nin: adminIds } } : {};
}

export function assertAccountActive(quota) {
  if (!quota) return;
  if (quota.status === "suspended") {
    throw Object.assign(new Error("This account is suspended. Contact the administrator."), { status: 403 });
  }
  if (quota.status === "deleted" || quota.status === "deletion_requested") {
    throw Object.assign(new Error("This account is closed."), { status: 403 });
  }
}

export function usernameFor(user) {
  return user?.username || (user?.email ? String(user.email).split("@")[0] : "member");
}

export async function getSettings(svc) {
  let rows = asArray(await svc.entities.AppSetting.filter({ singleton: "app" }));
  if (rows.length === 0) {
    await svc.entities.AppSetting.create(DEFAULT_SETTINGS);
    rows = asArray(await svc.entities.AppSetting.filter({ singleton: "app" }));
  }
  if (rows.length > 1) {
    const ordered = [...rows].sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
    await Promise.all(ordered.slice(1).map((extra) => svc.entities.AppSetting.delete(extra.id).catch(() => {})));
    return ordered[0];
  }
  return rows[0] ?? DEFAULT_SETTINGS;
}

/** Keeps the oldest of a set of duplicate rows and removes the rest. */
async function keepOldest(entity, rows) {
  const ordered = [...rows].sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
  await Promise.all(ordered.slice(1).map((extra) => entity.delete(extra.id).catch(() => {})));
  return ordered[0];
}

/**
 * The caller's quota row. Idempotent: two parallel first calls (the shell and a
 * page both resolving the account) must never leave a member with two quotas.
 */
export async function ensureQuota(svc, user) {
  const now = new Date().toISOString();
  let rows = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }));

  if (rows.length === 0) {
    const settings = await getSettings(svc);
    await svc.entities.UserQuota.create({
      user_id: user.id,
      email: user.email,
      username: usernameFor(user),
      quota_bytes: Number(settings.default_quota_bytes) || DEFAULT_SETTINGS.default_quota_bytes,
      status: "active",
      last_seen: now,
    });
    rows = asArray(await svc.entities.UserQuota.filter({ user_id: user.id }));
  }

  const row = rows.length > 1 ? await keepOldest(svc.entities.UserQuota, rows) : rows[0];
  if (!row) {
    return {
      user_id: user.id,
      email: user.email,
      username: usernameFor(user),
      quota_bytes: Number(DEFAULT_SETTINGS.default_quota_bytes),
      status: "active",
      last_seen: now,
    };
  }

  const patch = { last_seen: now };
  if (row.email !== user.email) patch.email = user.email;
  const username = user.username || row.username;
  if (username && row.username !== username) patch.username = username;
  await svc.entities.UserQuota.update(row.id, patch);
  return { ...row, ...patch };
}

async function sumBytes(svc, query) {
  const result = await svc.entities.StoredFile.aggregate({ query, sum: ["size_bytes"] });
  const row = result?.rows?.[0];
  return Number(row?.sum_size_bytes ?? 0);
}

/** Active + trashed bytes — trashed files still occupy the repository. */
export async function storageBreakdown(svc, userId) {
  const [active, trashed] = await Promise.all([
    sumBytes(svc, { owner_id: userId, status: "active" }),
    sumBytes(svc, { owner_id: userId, status: "trashed" }),
  ]);
  return { active, trashed, total: active + trashed };
}

export async function connectionUsage(svc) {
  const connections = asArray(await svc.entities.StorageConnection.list("-created_date"));
  const rows = await Promise.all(
    connections.map(async (connection) => {
      const used = await sumBytes(svc, { connection_id: connection.id });
      const files = await svc.entities.StoredFile.count({ connection_id: connection.id, status: "active" });
      return { ...connection, used_bytes: used, file_count: files };
    }),
  );
  return rows;
}

export async function systemCapacity(svc) {
  const settings = await getSettings(svc);
  const connections = await connectionUsage(svc);
  const active = connections.filter((c) => c.is_active && c.status !== "disabled");
  const total = active.reduce((sum, c) => sum + (Number(c.capacity_bytes) || 0), 0);
  const used = connections.reduce((sum, c) => sum + c.used_bytes, 0);
  const reserved = Number(settings.reserved_bytes) || 0;
  const usable = Math.max(0, total - reserved);
  return {
    settings,
    connections,
    total,
    used,
    reserved,
    usable,
    remaining: Math.max(0, usable - used),
  };
}

/**
 * Recomputes every user's quota from the connected capacity.
 * By default quotas may only grow, and never below what a user already stores,
 * so existing files never become inaccessible.
 */
export async function recomputeAllocations(svc, { force = false } = {}) {
  const { settings, usable, used } = await systemCapacity(svc);
  const accounts = asArray(await svc.entities.UserQuota.filter({}));
  const adminIds = new Set(await adminUserIds(svc));
  const eligible = accounts.filter(
    (account) =>
      (account.status === "active" || account.status === "deletion_requested") && !adminIds.has(account.user_id),
  );
  const policy = settings.allocation_policy || "equal";
  const minQuota = Number(settings.min_quota_bytes) || 0;

  let targets = new Map();
  if (policy === "fixed") {
    const fixed = Number(settings.default_quota_bytes) || 0;
    eligible.forEach((account) => targets.set(account.id, fixed));
  } else if (policy === "proportional") {
    const sum = eligible.reduce((acc, account) => acc + (Number(account.quota_bytes) || 0), 0);
    eligible.forEach((account) => {
      const share = sum > 0 ? (Number(account.quota_bytes) || 0) / sum : 1 / (eligible.length || 1);
      targets.set(account.id, Math.floor(usable * share));
    });
  } else {
    const each = Math.floor(usable / (eligible.length || 1));
    eligible.forEach((account) => targets.set(account.id, each));
  }

  const changes = [];
  const shortfalls = [];
  for (const account of eligible) {
    const target = Math.max(minQuota, targets.get(account.id) ?? 0);
    const current = Number(account.quota_bytes) || 0;
    const usedByUser = await sumBytes(svc, { owner_id: account.user_id });
    let next = force ? Math.max(target, usedByUser) : Math.max(current, target, usedByUser);
    if (next !== current) {
      changes.push({ id: account.id, quota_bytes: next });
      await svc.entities.UserQuota.update(account.id, { quota_bytes: next });
    }
    if (usedByUser > target) {
      shortfalls.push({ email: account.email, used: usedByUser, target });
    }
  }

  const overCapacity = used > usable;
  return {
    policy,
    users: eligible.length,
    total_capacity: usable,
    used,
    changes: changes.length,
    shortfalls,
    over_capacity: overCapacity,
  };
}

export async function logActivity(svc, user, action, itemName, sizeBytes, detail) {
  await svc.entities.FileActivity.create({
    user_id: user.id,
    user_email: user.email,
    action,
    item_name: itemName || "",
    size_bytes: Number(sizeBytes) || 0,
    detail: detail || "",
  });
}

export async function audit(svc, user, action, target, detail) {
  await svc.entities.AuditLog.create({
    actor_email: user?.email || "system",
    action,
    target: target || "",
    detail: detail || "",
  });
}

export function quotaSummary(quota, breakdown) {
  const total = Number(quota?.quota_bytes) || 0;
  const used = breakdown?.total || 0;
  return {
    quota_bytes: total,
    used_bytes: used,
    active_bytes: breakdown?.active || 0,
    trashed_bytes: breakdown?.trashed || 0,
    remaining_bytes: Math.max(0, total - used),
    percent: total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0,
  };
}