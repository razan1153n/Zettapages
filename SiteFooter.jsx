import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Private cloud storage with real quotas, an honest file manager and a separate administrator console.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#security" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacy
          </a>
          <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </a>
          <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link to="/register" className="text-muted-foreground transition-colors hover:text-foreground">
            Get started
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ZetaCloud. Your files stay yours.</p>
      </div>
    </footer>
  );
}