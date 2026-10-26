import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateNotifications } from "@/lib/server-fns";

const OPTIONS = [
  { key: "notify_uploads", title: "Upload and deletion notices", body: "Confirm when files finish uploading or are removed." },
  { key: "notify_storage", title: "Low storage warnings", body: "Tell me when my remaining space gets low." },
  { key: "notify_security", title: "Security notices", body: "Password changes, verification and account status updates." },
];

export function NotificationsCard({ initial }) {
  const [values, setValues] = useState({
    notify_uploads: initial?.notify_uploads !== false,
    notify_security: initial?.notify_security !== false,
    notify_storage: initial?.notify_storage !== false,
  });

  const toggle = async (key, value) => {
    const previous = values;
    const next = { ...values, [key]: value };
    setValues(next);
    try {
      await updateNotifications({ data: next });
      toast.success("Notification preference saved");
    } catch (error) {
      setValues(previous);
      toast.error(error.message || "Could not save that preference.");
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
        Notifications
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Choose what ZetaCloud tells you about your account.</p>

      <div className="mt-5 space-y-4">
        {OPTIONS.map((option) => (
          <div key={option.key} className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor={option.key} className="text-sm font-semibold">
                {option.title}
              </Label>
              <p className="text-xs text-muted-foreground">{option.body}</p>
            </div>
            <Switch id={option.key} checked={values[option.key]} onCheckedChange={(value) => toggle(option.key, value)} />
          </div>
        ))}
      </div>
    </section>
  );
}