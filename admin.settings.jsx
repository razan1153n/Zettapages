import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PoliciesPanel } from "@/components/admin/PoliciesPanel";

export const Route = createFileRoute("/_authed/admin/settings")({
  component: AdminPoliciesPage,
});

function AdminPoliciesPage() {
  const queryClient = useQueryClient();
  return <PoliciesPanel onChanged={() => queryClient.invalidateQueries({ queryKey: ["admin-overview"] })} />;
}