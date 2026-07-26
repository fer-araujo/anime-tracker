import { TermsContent } from "@/components/legal/TermsContent";

export const metadata = {
  title: "Términos y Condiciones — Anime Tracker",
  description:
    "Términos y condiciones de uso de Anime Tracker, plataforma para descubrir y gestionar tu lista de animes.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <TermsContent />
    </article>
  );
}
