import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const TONE = {
  critical: { wrap: "border-rose-200 bg-rose-50 text-rose-900", icon: AlertTriangle },
  high: { wrap: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle },
  medium: { wrap: "border-sky-200 bg-sky-50 text-sky-900", icon: Info },
  ok: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: CheckCircle2 },
};

export function WarningsPanel({ warnings = [] }) {
  const list = warnings.length > 0 ? warnings : [{ level: "ok", message: "Everything looks healthy. Storage capacity, repositories and recent transfers are all normal." }];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">System health</h2>
      <ul className="mt-4 space-y-2">
        {list.map((warning) => {
          const tone = TONE[warning.level] || TONE.medium;
          return (
            <li key={warning.message} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${tone.wrap}`}>
              <tone.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{warning.message}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}