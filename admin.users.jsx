import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@/components/admin/UsersPanel";

export const Route = createFileRoute("/_authed/admin/users")({
  component: () => <UsersPanel />,
});