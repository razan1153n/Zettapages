const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Link } from "@tanstack/react-router";
import { ArrowRight, CloudUpload, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

const PROOF = [
  { icon: ShieldCheck, label: "Private by default" },
  { icon: CloudUpload, label: "Drag, drop, done" },
  { icon: Sparkles, label: "Quota you can see" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 pb-20 pt-16 sm:pb-28 sm:pt-24">
      <div className="absolute inset-0 zeta-grid opacity-40" aria-hidden="true" />
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="zeta-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            A private cloud for your files
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Your files, safely
            <span className="block zeta-text-gradient">within reach.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            ZetaCloud gives you a private, organised space for documents, photos, video and everything else — with a
            storage quota you can actually see, and a file manager that feels effortless.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="zeta-gradient rounded-xl border-0 px-6 text-white hover:opacity-90">
              <Link to="/register">
                Create your free space
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-white/20 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {PROOF.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <item.icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative zeta-rise">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-indigo-500/20 via-violet-500/10 to-cyan-400/20 blur-2xl" aria-hidden="true" />
          <Image
            src="https://media.db.com/images/public/6adf7b0dfdef81d92e53e992/74c0b76c2_generated_image.png"
            alt="Abstract illustration of a glass cloud connected to floating data blocks"
            className="relative aspect-square w-full rounded-[1.75rem] border border-white/10 shadow-2xl"
            fittingType="fill"
          />
        </div>
      </div>
    </section>
  );
}