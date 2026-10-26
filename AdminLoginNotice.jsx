import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function AdminLoginNotice() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="flex w-full max-w-md items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-lg">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs font-medium">
          Administrator sign-in. Accounts without the administrator role cannot open the console.
        </p>
        <Link to="/admin" className="ml-auto shrink-0 text-xs font-semibold text-primary hover:underline">
          Console
        </Link>
      </div>
    </div>
  );
}