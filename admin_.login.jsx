import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginNotice } from "@/components/admin/AdminLoginNotice";
import { LoginPage } from "@/components/auth/LoginPage";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administrator sign-in — ZetaCloud" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  return (
    <>
      <AdminLoginNotice />
      <LoginPage />
    </>
  );
}