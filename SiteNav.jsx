import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#security", label: "Privacy" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="text-white">
          <Logo textClassName="text-base sm:text-lg" markClassName="h-8 w-8 sm:h-9 sm:w-9" />
        </Link>
        <nav className="ml-2 hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="zeta-gradient rounded-xl border-0 text-white hover:opacity-90">
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}