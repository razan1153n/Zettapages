const STEPS = [
  { step: "01", title: "Create your account", body: "Pick a username, verify your email address and your private space is ready in seconds." },
  { step: "02", title: "Upload anything", body: "Drag files in, create folders, and watch your storage meter update as you go." },
  { step: "03", title: "Find and share", body: "Search, star, preview, download, or send a link that expires on its own." },
];

export function StepsSection() {
  return (
    <section id="how" className="bg-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Three steps to a tidier cloud</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step} className="relative rounded-3xl border border-border bg-background p-7">
              <span className="font-heading text-4xl font-extrabold text-primary/15">{item.step}</span>
              <h3 className="mt-3 text-base font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}