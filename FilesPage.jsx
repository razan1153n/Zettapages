import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileBrowser } from "@/components/files/FileBrowser";

/** Binds a file-listing route's URL state to the shared browser component. */
export function FilesPage({ scope, to, params }) {
  const navigate = useNavigate();

  const setParams = useCallback(
    (patch, options) =>
      navigate({
        to,
        search: (prev) => ({ ...prev, ...patch }),
        replace: options?.replace !== false,
      }),
    [navigate, to],
  );

  const setFolder = useCallback(
    (id) =>
      navigate({
        to,
        search: (prev) => ({ ...prev, folder: id || undefined }),
        replace: false,
      }),
    [navigate, to],
  );

  return <FileBrowser scope={scope} params={params} onParamsChange={setParams} onFolderChange={setFolder} />;
}