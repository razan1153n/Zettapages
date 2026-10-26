import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "@/components/files/FilesPage";
import { validateBrowserSearch } from "@/lib/browserSearch";

export const Route = createFileRoute("/_authed/_user/recent")({
  validateSearch: validateBrowserSearch,
  head: () => ({ meta: [{ title: "Recent — ZetaCloud" }] }),
  component: RecentRoute,
});

function RecentRoute() {
  const search = Route.useSearch();
  return <FilesPage scope="recent" to="/recent" params={search} />;
}