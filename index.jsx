import { createFileRoute } from "@tanstack/react-router";
import { FaqSection } from "@/components/marketing/FaqSection";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Hero } from "@/components/marketing/Hero";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";
import { StepsSection } from "@/components/marketing/StepsSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZetaCloud — Secure cloud storage for your files" },
      {
        name: "description",
        content:
          "ZetaCloud is private cloud storage with nested folders, search, share links that expire, and a storage quota you can see. Every account gets its own space.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <SiteNav />
      <Hero />
      <FeatureGrid />
      <SecuritySection />
      <StepsSection />
      <FaqSection />
      <SiteFooter />
    </div>
  );
}