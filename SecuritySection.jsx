import { Check, Lock, ServerOff, UserCheck } from "lucide-react";

const POINTS = [
  "Your files belong to your account and nobody else's — enforced on the server, not hidden in the browser.",
  "Share links use long random tokens and expire on a schedule you choose.",
  "Storage credentials never reach your browser and are managed only by the administrator.",
  "Administrators manage capacity and accounts; they do not browse your file contents.",
];

export function SecuritySection() {
  return (
    <section id="security" className="bg-slate-950 py-20 text-white sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Privacy</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">A private space, not a shared drive</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Two people on ZetaCloud can never see each other's files. Every request is checked against the signed-in
            account before a single byte is returned.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Lock, title: "Server-side rules", body: "Ownership is verified for every file, folder and download." },
            { icon: UserCheck, title: "Your account only", body: "Signed-in identity decides what your session can reach." },
            { icon: ServerOff, title: "No exposed credentials", body: "Storage tokens stay on the server, always." },
            { icon: Check, title: "Honest limits", body: "Real capacity, real quota — never an invented number." },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-cyan-300">
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold">{card.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}