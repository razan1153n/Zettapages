import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "@/components/files/FilesPage";
import { validateBrowserSearch } from "@/lib/browserSearch";

export const Route = createFileRoute("/_authed/_user/starred")({
  validateSearch: validateBrowserSearch,
  head: () => ({ meta: [{ title: "Starred — ZetaCloud" }] }),
  component: StarredRoute,
});

function StarredRoute() {
  const search = Route.useSearch();
  return <FilesPage scope="starred" to="/starred" params={search} />;
}