import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

const FACTS = [
  "Files and folders are owned by your account; the server checks ownership on every request.",
  "Downloads use short-lived links that expire, so a copied URL stops working.",
  "Storage credentials are held by the server and are never sent to your browser.",
  "Administrators manage capacity and accounts, and cannot browse your file contents.",
];

export function PrivacyCard({ email, role }) {
  const { logout } = useAuth();
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        Privacy and security
      </h2>

      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {FACTS.map((fact) => (
          <li key={fact} className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            {fact}
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
        <p className="text-sm font-semibold">Sessions</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span> ({role === "admin" ? "administrator" : "member"}).
          Ending this session signs you out on this device; changing your password signs out every other session.
        </p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5 rounded-lg" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out of this device
        </Button>
      </div>
    </section>
  );
}