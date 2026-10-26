import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/Logo";
import { NavList } from "@/components/layout/NavList";
import { StorageMeter } from "@/components/layout/StorageMeter";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/lib/AuthContext";

export function UserShell({ children }) {
  const { logout } = useAuth();
  const { data } = useAccount();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState("");

  const account = data;
  const username = account?.user?.username || "member";
  const initials = username.slice(0, 2).toUpperCase();

  const submitSearch = (event) => {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;
    navigate({ to: "/files", search: { q: value } });
    setMenuOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
        <Logo />
      </Link>
      <NavList onNavigate={() => setMenuOpen(false)} />
      <div className="mt-auto space-y-3">
        <StorageMeter storage={account?.storage} ready={account?.storageReady !== false} />
        {account?.user?.role === "admin" && (
          <Button asChild variant="outline" className="w-full justify-start gap-2 border-dashed">
            <Link to="/admin" onClick={() => setMenuOpen(false)}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin console
            </Link>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] border-r border-border bg-card lg:block">{sidebar}</aside>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="lg:hidden">
              <Logo markClassName="h-8 w-8" textClassName="text-base" />
            </Link>

            <form onSubmit={submitSearch} className="relative ml-auto hidden max-w-sm flex-1 sm:block lg:ml-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search your files"
                aria-label="Search your files"
                className="h-10 rounded-xl pl-9"
              />
            </form>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-auto gap-2 rounded-full px-1.5 sm:ml-0" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="zeta-gradient text-xs font-semibold text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">{username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{account?.user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}