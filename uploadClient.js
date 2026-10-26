
/**
 * Uploads one file through the server-side pipeline with real progress and
 * cancellation. Resolves with `{ file, storage }` once the backend has
 * confirmed the object is stored and the record exists.
 */
export function uploadFile({ file, folderId, onProgress, registerAbort }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);
    body.append("name", file.name);
    body.append("folderId", folderId || "root");

    xhr.open("POST", "/api/storage/upload");
    const token = typeof window === "undefined" ? null : getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      let payload = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload);
      } else {
        reject(Object.assign(new Error(payload.error || "The upload failed."), { status: xhr.status }));
      }
    };
    xhr.onerror = () => reject(new Error("The connection dropped during upload."));
    xhr.onabort = () => reject(Object.assign(new Error("Upload cancelled."), { aborted: true }));
    xhr.ontimeout = () => reject(new Error("The upload timed out."));

    registerAbort?.(() => xhr.abort());
    xhr.send(body);
  });
}