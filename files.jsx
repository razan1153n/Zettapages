import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "@/components/files/FilesPage";
import { validateBrowserSearch } from "@/lib/browserSearch";

export const Route = createFileRoute("/_authed/_user/files")({
  validateSearch: validateBrowserSearch,
  head: () => ({ meta: [{ title: "My files — ZetaCloud" }] }),
  component: FilesRoute,
});

function FilesRoute() {
  const search = Route.useSearch();
  return <FilesPage scope="active" to="/files" params={search} />;
}