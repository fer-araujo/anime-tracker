"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/custom/Icon";
import { NotificationRow } from "@/components/common/NotificationRow";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

/**
 * Episodes of the anime the user is watching: what came out, and what is
 * still due today.
 *
 * The popover carries its own opaque background rather than inheriting the
 * header's. The header is `fixed top-0` and switches to `backdrop-blur-xl` on
 * scroll, which samples whatever is behind it — a translucent panel anchored
 * there would show the page sliding underneath the text.
 */
export default function NotificationBell() {
  const { items, unreadCount, isUnread, isPending, now, markRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Read on close, however it closes — the bell, a click elsewhere, or following
  // a link. Marking on open flipped every row to "read" the moment the panel
  // appeared, so the dot saying which episode is new was gone before anyone saw
  // it. Watching the transition here keeps the three exits from each needing to
  // remember to do it.
  useEffect(() => {
    if (wasOpen.current && !open && unreadCount > 0) void markRead();
    wasOpen.current = open;
  }, [open, unreadCount, markRead]);

  // Split against the live clock rather than the API's flag, so an episode
  // moves out of "Más tarde hoy" the minute it airs. Released newest first;
  // pending soonest first, under them — what is out is what the badge is for.
  const released = items
    .filter((n) => !isPending(n))
    .sort((a, b) => Date.parse(b.airedAt) - Date.parse(a.airedAt));
  const pending = items
    .filter((n) => isPending(n))
    .sort((a, b) => Date.parse(a.airedAt) - Date.parse(b.airedAt));
  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
        aria-expanded={open}
      >
        <Icon name="Bell" className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-black flex items-center justify-center"
            // The count is already in the button's label, so repeating it here
            // would make a screen reader say the number twice.
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "z-50 rounded-xl border border-white/10 bg-neutral-950 shadow-xl shadow-black/40 overflow-hidden",
            // Full width on phones. Anchored to the bell, a 384 px panel runs
            // off the left edge of a 375 px screen, because the bell sits well
            // in from the right next to the menu button.
            "fixed inset-x-4 top-16",
            "md:absolute md:inset-x-auto md:right-0 md:top-11 md:w-96",
          )}
        >
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-base font-semibold text-white">Episodios</p>
            <p className="text-xs text-white/50 mt-0.5">
              Últimas 24 horas y lo que sale hoy
            </p>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-sm text-white/50">
              Nada nuevo por ahora. Aquí aparecen los episodios de lo que estás
              viendo.
            </p>
          ) : (
            <div className="max-h-[60vh] md:max-h-[28rem] overflow-y-auto">
              {released.length > 0 && (
                <ul className="divide-y divide-white/5">
                  {released.map((n) => (
                    <NotificationRow
                      key={`${n.animeId}-${n.airedAt}`}
                      n={n}
                      upcoming={false}
                      unread={isUnread(n)}
                      now={now}
                      onNavigate={close}
                    />
                  ))}
                </ul>
              )}
              {pending.length > 0 && (
                <>
                  <p className="px-5 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-white/40">
                    Más tarde hoy
                  </p>
                  <ul className="divide-y divide-white/5">
                    {pending.map((n) => (
                      <NotificationRow
                        key={`${n.animeId}-${n.airedAt}`}
                        n={n}
                        upcoming
                        unread={false}
                        now={now}
                        onNavigate={close}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
