import type { ReactNode } from "react";

export const metadata = {
  title: "Términos legales — Anime Tracker",
  description: "Términos y condiciones, aviso de privacidad y política de protección de datos de Anime Tracker.",
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}
