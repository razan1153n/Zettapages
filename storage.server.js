/**
 * Storage provider adapters (server only).
 *
 * Hugging Face Hub repositories are the storage backend: a dataset repository is
 * the physical bucket, `storage_key` is the path inside it. Credentials never
 * leave this module — every call happens server-side.
 */

const HF_BASE = "https://huggingface.co";
const INLINE_LIMIT = 10 * 1024 * 1024;

function authHeaders(connection) {
  return { Authorization: `Bearer ${connection.access_token}` };
}

function repoApiRoot(connection) {
  return `${HF_BASE}/api/${connection.repo_type}s/${connection.repo_id}`;
}

function repoGitRoot(connection) {
  return `${HF_BASE}/${connection.repo_type}s/${connection.repo_id}.git`;
}

function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hfJson(connection, path, init = {}) {
  const response = await fetch(`${repoApiRoot(connection)}${path}`, {
    ...init,
    headers: { ...authHeaders(connection), ...(init.headers || {}) },
  });
  const raw = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error(`Storage provider returned ${response.status}`), {
      storageStatus: response.status,
      storageDetail: raw.slice(0, 400),
    });
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** The path a file occupies inside its repository. */
export function buildStorageKey(ownerId, name) {
  const safe = String(name || "file").replace(/[^\w.-]+/g, "_").replace(/_{2,}/g, "_").slice(-64) || "file";
  return `zeta/${ownerId}/${crypto.randomUUID()}-${safe}`;
}

async function hfUpload(connection, key, bytes) {
  const preupload = await hfJson(connection, "/preupload/main", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: [{ path: key, size: bytes.length, sample: toBase64(bytes.subarray(0, 512)) }],
    }),
  });

  const info = (preupload.files || []).find((entry) => entry.path === key) || {};
  if (info.shouldIgnore) {
    throw Object.assign(new Error("The storage repository refused this file"), { storageStatus: 400 });
  }
  const revision = preupload.commitOid || preupload.oid || "main";
  const mode = info.uploadMode || "regular";

  let operation;
  if (mode === "regular" && bytes.length <= INLINE_LIMIT) {
    operation = { operation: "add", path: key, content: toBase64(bytes) };
  } else {
    const oid = await sha256Hex(bytes);
    const batch = await fetch(`${repoGitRoot(connection)}/info/lfs/objects/batch`, {
      method: "POST",
      headers: {
        ...authHeaders(connection),
        Accept: "application/vnd.git-lfs+json",
        "Content-Type": "application/vnd.git-lfs+json",
      },
      body: JSON.stringify({
        operation: "upload",
        transfers: ["basic"],
        objects: [{ oid, size: bytes.length }],
      }),
    });
    const batchData = await batch.json().catch(() => ({}));
    if (!batch.ok) {
      throw Object.assign(new Error(`Storage provider rejected the transfer (${batch.status})`), {
        storageStatus: batch.status,
        storageDetail: JSON.stringify(batchData).slice(0, 400),
      });
    }
    const object = (batchData.objects || [])[0] || {};
    if (object.error) {
      throw Object.assign(new Error(object.error.message || "Storage provider rejected the file"), {
        storageStatus: 400,
      });
    }
    const action = object.actions && object.actions.upload;
    if (!action) {
      throw Object.assign(new Error("Storage provider did not return an upload target"), { storageStatus: 502 });
    }
    const put = await fetch(action.href, {
      method: action.method || "PUT",
      headers: { ...(action.header || {}), "Content-Type": "application/octet-stream" },
      body: bytes,
    });
    if (!put.ok) {
      throw Object.assign(new Error(`Storage provider refused the upload (${put.status})`), { storageStatus: put.status });
    }
    operation = { operation: "add", path: key, oid, size: bytes.length };
  }

  await hfJson(connection, `/commit/${revision}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "ZetaCloud upload", operations: [operation] }),
  });
}

/** Writes bytes to the connection. Throws with `storageStatus` on provider failure. */
export async function putObject(connection, key, bytes) {
  return hfUpload(connection, key, bytes);
}

/** Returns the provider's Response for streaming back to the browser. */
export async function getObject(connection, key) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return fetch(`${HF_BASE}/${connection.repo_type}s/${connection.repo_id}/resolve/main/${path}`, {
    headers: authHeaders(connection),
  });
}

export async function deleteObject(connection, key) {
  await hfJson(connection, "/commit/main", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "ZetaCloud delete", operations: [{ operation: "delete", path: key }] }),
  });
}

/** Live connection check used by the admin storage screen. */
export async function inspectConnection(connection) {
  const response = await fetch(repoApiRoot(connection), { headers: authHeaders(connection) });
  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: "The access token was rejected by the provider." };
  }
  if (response.status === 404) {
    return { ok: false, message: "Repository not found, or this token cannot see it." };
  }
  if (!response.ok) {
    return { ok: false, message: `Provider responded with ${response.status}.` };
  }
  const data = await response.json().catch(() => ({}));
  return {
    ok: true,
    message: data.private ? "Connected (private repository)" : "Connected (public repository)",
    isPrivate: !!data.private,
    reportedBytes: Number(data.usedStorage) || 0,
  };
}

/** Creates a private repository when the admin asked for that. */
export async function ensureRepository(connection) {
  const response = await fetch(`${HF_BASE}/api/repos/create`, {
    method: "POST",
    headers: { ...authHeaders(connection), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: connection.repo_type === "model" ? "model" : "dataset",
      name: connection.repo_id,
      private: true,
    }),
  });
  if (response.ok) return { created: true };
  const raw = await response.text();
  // Already exists is a success for our purposes.
  if (response.status === 409 || raw.includes("already")) return { created: false };
  throw Object.assign(new Error(`Could not create the repository (${response.status})`), {
    storageDetail: raw.slice(0, 300),
  });
}