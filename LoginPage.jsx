const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Lock, LogIn, Mail } from "lucide-react";
import { useState } from "react";

import { resolveLoginIdentifier } from "@/lib/server-fns";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

// The /login page. ?returnTo= (or the platform's ?from_url=) is where the visitor
// goes after signing in — the login gate and the MCP consent page send people here with it.
export function LoginPage() {
  const returnTo = safeReturnTo();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const value = identifier.trim();
      let email = value;
      // A username is resolved to its account's email server-side, then the
      // platform verifies the password against that account.
      if (!value.includes("@")) {
        const resolved = await resolveLoginIdentifier({ data: { identifier: value } });
        if (!resolved.email) {
          setError("No account matches that username or email address.");
          setBusy(false);
          return;
        }
        email = resolved.email;
      }
      await db.auth.loginViaEmailPassword(email, password);
      // A hard redirect: the app re-initializes with the new session.
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid username or password");
      setBusy(false);
    }
  }

  return (
    <AuthLayout icon={LogIn} title="Welcome back" subtitle="Log in to your account">
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-identifier">Username or email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-identifier" type="text" autoComplete="username" autoFocus placeholder="you@example.com or yourname" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <AuthLink to="/forgot-password" returnTo={returnTo} className="text-xs text-primary hover:underline">
              Forgot password?
            </AuthLink>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Logging in...">
          Log in
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <AuthLink to="/register" returnTo={returnTo}>
          Create one
        </AuthLink>
      </p>
    </AuthLayout>
  );
}