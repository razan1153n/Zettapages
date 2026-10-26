import { createFileRoute } from "@tanstack/react-router";
import { AuditPanel } from "@/components/admin/AuditPanel";

export const Route = createFileRoute("/_authed/admin/audit")({
  component: () => <AuditPanel />,
});