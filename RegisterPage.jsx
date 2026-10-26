const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Lock, Mail, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";
import { checkUsername, claimUsername } from "@/lib/server-fns";

const USERNAME_HINT = "3-24 characters: letters, numbers, dot, dash or underscore.";

const isAlreadyVerified = (err) => err?.status === 400 && /already verified/i.test(err?.message ?? "");

/**
 * The /register page: register → OTP → verifyOtp → setToken. Registration alone
 * does not sign the user in (the account is unverified), so the code step is never
 * skipped and loginViaEmailPassword is never called right after register.
 */
export function RegisterPage() {
  const returnTo = safeReturnTo();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(e) {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Choose a username for your account.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const availability = await checkUsername({ data: { username: username.trim() } });
      if (!availability.available) {
        setError(availability.reason || "Choose a different username.");
        setBusy(false);
        return;
      }
      await db.auth.register({ email, password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await db.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) db.auth.setToken(result.access_token);
      try {
        await claimUsername({ data: { username: username.trim() } });
      } catch {
        // The account is live either way; a username can still be set later in settings.
      }
      window.location.href = returnTo;
    } catch (err) {
      // Verified server-side but the answer never arrived: the code is spent and
      // there is no token, so the only way forward is a normal sign-in.
      if (isAlreadyVerified(err)) setStep("already_verified");
      else setError(err.message || "Invalid verification code");
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    try {
      await db.auth.resendOtp(email);
      toast("Code sent", { description: "Check your email for the new code." });
    } catch (err) {
      if (isAlreadyVerified(err)) setStep("already_verified");
      else setError(err.message || "Failed to resend code");
    }
  }

  if (step === "already_verified") {
    return (
      <AuthLayout icon={UserPlus} title="Create your account" subtitle="Sign up to get started">
        <p className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email}</span> is already verified. Sign in to continue.
        </p>
        <AuthLink to="/login" returnTo={returnTo} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Sign in
        </AuthLink>
      </AuthLayout>
    );
  }

  if (step === "otp") {
    return (
      <AuthLayout icon={UserPlus} title="Create your account" subtitle="Sign up to get started">
        <form onSubmit={verify}>
          <p className="mb-4 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
          </p>
          <AuthError>{error}</AuthError>
          <div className="mb-6 flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <SubmitButton busy={busy} busyLabel="Verifying..." disabled={busy || otpCode.length < 6}>
            Verify
          </SubmitButton>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button type="button" onClick={resend} className="font-medium text-primary hover:underline">
              Resend
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={UserPlus} title="Create your account" subtitle="Sign up to get started">
      <AuthError>{error}</AuthError>
      <form onSubmit={register} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-username">Username</Label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="register-username"
              autoComplete="username"
              autoFocus
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 pl-10"
              disabled={busy}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">{USERNAME_HINT} You can sign in with it instead of your email.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Creating account...">
          Create account
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <AuthLink to="/login" returnTo={returnTo}>
          Log in
        </AuthLink>
      </p>
    </AuthLayout>
  );
}