import { cn } from "@/lib/utils";

const TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatGrid({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl", TONES[item.tone] || TONES.indigo)}>
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
          </div>
          <p className="mt-3.5 font-heading text-2xl font-extrabold tabular-nums text-slate-900">{item.value}</p>
          {item.hint && <p className="mt-1 text-xs text-slate-500">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}