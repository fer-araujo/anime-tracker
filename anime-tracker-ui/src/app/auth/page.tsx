import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Iniciar sesión — Anime Tracker",
  description: "Inicia sesión o crea una cuenta en Anime Tracker",
};

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
