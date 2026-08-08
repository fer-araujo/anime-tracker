"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Icon from "@/components/custom/Icon";
import { FavoritesBanner } from "./FavoritesBanner";
import { CollectionsTab } from "./CollectionsTab";
import { ListsBackdrop } from "./ListsBackdrop";

export default function MyAnimePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/lists");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
      {/* Background */}
      <ListsBackdrop />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
          Mis listas
        </h1>

        {/* Favorites hero banner */}
        <div className="mb-10">
          <FavoritesBanner />
        </div>

        {/* Collections grid */}
        <CollectionsTab />
      </div>
    </div>
  );
}
