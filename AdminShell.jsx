import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderOpen, HardDrive, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogoMark } from "@/components/brand/Logo";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: ShieldCheck },
  { to: "/admin/storage", label: "Storage", icon: HardDrive },
  { to: "/admin/settings", label: "Policies", icon: Sliders },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function AdminNav({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={item.exact ? { exact: true } : undefined}
          activeProps={{ className: "bg-white/10 text-white" }}
          inactiveProps={{ className: "text-slate-400 hover:bg-white/5 hover:text-white" }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <item.icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ children }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const panel = (
    <div className="flex h-full flex-col gap-6 bg-slate-950 p-5">
      <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
        <LogoMark className="h-9 w-9" />
        <span className="font-heading text-base font-extrabold tracking-tight text-white">
          ZetaCloud <span className="font-semibold text-slate-400">Admin</span>
        </span>
      </Link>
      <AdminNav onNavigate={() => setOpen(false)} />
      <div className="mt-auto space-y-2">
        <Button asChild variant="ghost" className="w-full justify-start gap-2 text-slate-300 hover:bg-white/5 hover:text-white">
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Back to my files
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-2 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("min-h-screen bg-slate-50")}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">{panel}</aside>
      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open admin navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-0 p-0">
              <SheetTitle className="sr-only">Administration</SheetTitle>
              {panel}
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <LogoMark className="h-8 w-8" />
          </div>
          <p className="ml-auto text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Administration</p>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}