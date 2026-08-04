"use client";

import { Component, type ReactNode } from "react";
import Icon from "@/components/custom/Icon";

/**
 * Per-section error boundary for the homepage shelves.
 *
 * `error.tsx` only isolates at the *route* level, so a single failing shelf
 * would take the whole page down with it. Wrapping each `<Suspense>` in one of
 * these keeps a dead upstream contained: the other shelves still stream in.
 *
 * Must be a class component — `componentDidCatch` has no hooks equivalent, and
 * React deliberately has no built-in boundary primitive.
 */
export class SectionBoundary extends Component<
  { title?: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    // Titleless sections (the hero) collapse silently rather than reserve
    // 70vh for an error notice — letting the shelves below take the space
    // reads as a lighter page, not a broken one.
    if (!this.props.title) return null;

    return (
      <section className="px-1 md:px-4 py-6 md:py-12">
        <h2 className="text-lg md:text-2xl font-semibold text-white/95 mb-3 md:mb-4">
          {this.props.title}
        </h2>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6">
          <Icon name="AlertCircle" size={18} className="text-white/30 shrink-0" />
          <p className="text-sm text-white/40">
            No pudimos cargar esta sección. Recarga la página para intentarlo de
            nuevo.
          </p>
        </div>
      </section>
    );
  }
}
