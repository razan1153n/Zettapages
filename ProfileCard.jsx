import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/server-fns";

export function ProfileCard({ profile }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [state, setState] = useState({ busy: false, error: "", done: false });

  const save = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "", done: false });
    try {
      await updateProfile({ data: { full_name: fullName, username } });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
      setState({ busy: false, error: "", done: true });
    } catch (error) {
      setState({ busy: false, error: error.message || "Could not save your details.", done: false });
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-bold">Account information</h2>
      <p className="mt-1 text-xs text-muted-foreground">Your username can be used to sign in instead of your email address.</p>

      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-username">Username</Label>
          <Input id="settings-username" value={username} onChange={(event) => setUsername(event.target.value)} className="h-11 rounded-xl" />
          <p className="text-xs text-muted-foreground">3-24 characters: letters, numbers, dot, dash or underscore.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-fullname">Full name</Label>
          <Input id="settings-fullname" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 rounded-xl" placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-email">Email address</Label>
          <Input id="settings-email" value={profile?.email ?? ""} readOnly disabled className="h-11 rounded-xl" />
          <p className="text-xs text-muted-foreground">
            Changing your email requires verifying the new address. Contact the administrator and we will re-send a
            verification code before switching it.
          </p>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.done && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" />
            Details saved.
          </p>
        )}

        <Button type="submit" disabled={state.busy} className="rounded-xl">
          {state.busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Save changes
        </Button>
      </form>
    </section>
  );
}