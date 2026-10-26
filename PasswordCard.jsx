const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordCard({ email }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState({ busy: false, error: "", done: false });

  const submit = async (event) => {
    event.preventDefault();
    if (next.length < 8) return setState({ busy: false, error: "Use at least 8 characters for the new password.", done: false });
    if (next !== confirm) return setState({ busy: false, error: "The new passwords do not match.", done: false });
    setState({ busy: true, error: "", done: false });
    try {
      // Confirm the current credentials before anything changes.
      await db.auth.loginViaEmailPassword(email, current);
    } catch {
      return setState({ busy: false, error: "Your current password is not correct.", done: false });
    }
    try {
      await db.auth.resetPasswordRequest(email);
      setCurrent("");
      setNext("");
      setConfirm("");
      setState({ busy: false, error: "", done: true });
    } catch (error) {
      setState({ busy: false, error: error.message || "Could not start the password change.", done: false });
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
        Change password
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Confirm your current password, and we will email a secure link to finish the change. Every other session is
        signed out once the new password is set.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} className="h-11 rounded-xl" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} className="h-11 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="h-11 rounded-xl" required />
          </div>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.done && <p className="text-sm text-emerald-600">Check your inbox — the secure link expires shortly, so use it soon.</p>}

        <Button type="submit" variant="outline" disabled={state.busy} className="rounded-xl">
          {state.busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Send secure link
        </Button>
      </form>
    </section>
  );
}