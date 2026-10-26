import { BarChart3, FolderTree, Gauge, History, Link2, Search, ShieldCheck, Star, Trash2 } from "lucide-react";

const FEATURES = [
  { icon: FolderTree, title: "Nested folders", body: "Organise with folders inside folders, breadcrumb navigation and a familiar grid or list view." },
  { icon: Search, title: "Find anything fast", body: "Search by name and filter by images, video, documents, audio or archives in a click." },
  { icon: Gauge, title: "Storage you can see", body: "Allocated, used and available space, recalculated after every upload and deletion." },
  { icon: Link2, title: "Time-limited share links", body: "Hand out a download link that expires automatically. Revoke it whenever you like." },
  { icon: Star, title: "Star what matters", body: "Keep your most-used files one click away, with a full recent-uploads view." },
  { icon: Trash2, title: "Trash with restore", body: "Deleted by mistake? Restore it. Nothing is removed from storage until you say so." },
  { icon: History, title: "Activity timeline", body: "Every upload, rename, deletion and share is recorded in your own activity history." },
  { icon: BarChart3, title: "Quota that is enforced", body: "The backend refuses uploads that would exceed your space — no silent overruns." },
  { icon: ShieldCheck, title: "Isolated per account", body: "Access rules are enforced on the server for every file, folder and download." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The file manager</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Everything a real cloud drive needs</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Not a mock-up. Every control writes to your account, and the numbers on screen come from your stored files.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:zeta-gradient group-hover:text-white">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-base font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}