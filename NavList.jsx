import { Link } from "@tanstack/react-router";
import { Clock, FolderOpen, LayoutDashboard, Settings, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const USER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/files", label: "My files", icon: FolderOpen },
  { to: "/recent", label: "Recent", icon: Clock },
  { to: "/starred", label: "Starred", icon: Star },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function NavList({ items = USER_NAV, onNavigate, className }) {
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeProps={{ className: "bg-primary/10 text-primary" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-secondary hover:text-foreground" }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <item.icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}