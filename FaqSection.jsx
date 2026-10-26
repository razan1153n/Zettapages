import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = [
  {
    q: "How much space do I get?",
    a: "Your account is given a quota when it is created, based on the capacity your administrator has connected. The dashboard shows exactly how much you have allocated, used and left.",
  },
  {
    q: "Can anyone else see my files?",
    a: "No. Files and folders are owned by your account and every request is checked on the server before any data is returned. Another member's session cannot reach your items.",
  },
  {
    q: "What happens when I delete something?",
    a: "Items move to the trash first, so you can restore them. They only leave storage permanently when you delete them from the trash or empty it.",
  },
  {
    q: "What if I run out of space?",
    a: "Uploads that would exceed your remaining quota are refused with a clear message. You can free space by emptying the trash, or ask your administrator for a larger quota.",
  },
  {
    q: "How do share links work?",
    a: "You create a link for a single file with an expiry you choose. Anyone holding the link can download that file until it expires or you revoke it.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-background py-20 sm:py-28">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Questions</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Good to know</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 rounded-3xl border border-border bg-card px-6">
          {FAQ.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`} className="last:border-b-0">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}