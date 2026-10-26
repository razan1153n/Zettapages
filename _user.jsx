import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UserShell } from "@/components/layout/UserShell";

export const Route = createFileRoute("/_authed/_user")({
  component: () => (
    <UserShell>
      <Outlet />
    </UserShell>
  ),
});