import { PrivacyContent } from "@/components/legal/PrivacyContent";

export const metadata = {
  title: "Aviso de Privacidad — Anime Tracker",
  description:
    "Aviso de privacidad de Anime Tracker. Conoce cómo recopilamos, usamos y protegemos tus datos personales conforme a la LFPDPPP mexicana.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <PrivacyContent />
    </article>
  );
}
