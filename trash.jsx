import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "@/components/files/FilesPage";
import { validateBrowserSearch } from "@/lib/browserSearch";

export const Route = createFileRoute("/_authed/_user/trash")({
  validateSearch: validateBrowserSearch,
  head: () => ({ meta: [{ title: "Trash — ZetaCloud" }] }),
  component: TrashRoute,
});

function TrashRoute() {
  const search = Route.useSearch();
  return <FilesPage scope="trashed" to="/trash" params={search} />;
}