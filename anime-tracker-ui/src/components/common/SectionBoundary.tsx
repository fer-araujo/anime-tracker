"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/custom/Icon";

/** Long enough for a backend that was just woken to finish warming up. */
const AUTO_RETRY_MS = 4000;

type BoundaryProps = {
  title?: string;
  children: ReactNode;
  onRetry: () => void;
  retrying: boolean;
  autoRetry: boolean;
};

/**
 * Must be a class component — `componentDidCatch` has no hooks equivalent, and
 * React deliberately has no built-in boundary primitive.
 */
class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    if (this.props.autoRetry) {
      this.timer = setTimeout(this.props.onRetry, AUTO_RETRY_MS);
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    // Titleless sections (the hero) collapse silently rather than reserve
    // 70vh for an error notice — letting the shelves below take the space
    // reads as a lighter page, not a broken one. They still retry once.
    if (!this.props.title) return null;

    const waiting = this.props.retrying || this.props.autoRetry;

    return (
      <section className="px-1 md:px-4 py-6 md:py-12">
        <h2 className="text-lg md:text-2xl font-semibold text-white/95 mb-3 md:mb-4">
          {this.props.title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6">
          <Icon name="AlertCircle" size={18} className="text-white/30 shrink-0" />
          <p className="text-sm text-white/40 flex-1 min-w-48" aria-live="polite">
            {waiting
              ? "Esta sección está tardando. Volviendo a intentar…"
              : "No pudimos cargar esta sección."}
          </p>
          {!waiting && (
            <button
              type="button"
              onClick={this.props.onRetry}
              className="h-8 px-3 rounded-lg text-sm text-white/80 border border-white/15 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Reintentar
            </button>
          )}
        </div>
      </section>
    );
  }
}

/**
 * Per-section error boundary for the homepage shelves.
 *
 * `error.tsx` only isolates at the *route* level, so a single failing shelf
 * would take the whole page down with it. Wrapping each `<Suspense>` in one of
 * these keeps a dead upstream contained: the other shelves still stream in.
 *
 * It also heals. The usual failure is not a broken upstream but a slow one —
 * the first request after the API restarts can outlast the fetch timeout — and
 * telling people to reload the page for that asked them to do by hand what the
 * page can do itself. A failed section re-requests the server components once
 * on its own, then offers a button.
 *
 * `router.refresh()` inside a transition re-renders the server components
 * without a navigation, and the transition stays pending until the new payload
 * has committed. Only then is the boundary remounted: remounting earlier would
 * render the same errored payload and fail again at once.
 */
export function SectionBoundary({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  const [attempt, setAttempt] = useState(0);
  const wasRetrying = useRef(false);

  useEffect(() => {
    if (wasRetrying.current && !retrying) setAttempt((a) => a + 1);
    wasRetrying.current = retrying;
  }, [retrying]);

  const retry = () => startTransition(() => router.refresh());

  return (
    <Boundary
      key={attempt}
      title={title}
      onRetry={retry}
      retrying={retrying}
      autoRetry={attempt === 0}
    >
      {children}
    </Boundary>
  );
}
