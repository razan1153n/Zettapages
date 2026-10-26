import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-indigo-50 text-indigo-600",
  cyan: "bg-cyan-50 text-cyan-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", TONES[tone] || TONES.brand)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-4 font-heading text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}