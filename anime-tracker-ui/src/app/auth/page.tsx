import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign In — Anime Tracker",
  description:
    "Track your favorites. Build your watchlist. Discover your next obsession.",
  openGraph: {
    title: "Sign In — Anime Tracker",
    description:
      "Track your favorites. Build your watchlist. Discover your next obsession.",
  },
};

function AuthSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 py-20">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute -top-[40%] -left-[30%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(142_72%_45%/0.08)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(260_60%_50%/0.06)_0%,transparent_60%)] blur-[120px]" />

      {/* Skeleton content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Headline skeleton */}
        <div className="mb-16 text-center">
          <div className="h-14 w-64 mx-auto rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="h-14 w-64 mx-auto mt-2 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="h-5 w-48 mx-auto mt-6 rounded bg-white/[0.03] animate-pulse" />
        </div>

        {/* Form skeleton */}
        <div className="w-full space-y-6">
          <div className="h-3 w-24 mx-auto rounded bg-white/[0.04] animate-pulse" />
          <div className="h-14 w-full rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="h-14 w-full rounded-xl bg-white/[0.06] animate-pulse" />
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <div className="h-3 w-4 rounded bg-white/[0.04] animate-pulse" />
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="h-14 w-full rounded-xl bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthForm />
    </Suspense>
  );
}
