"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/custom/Icon";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

/** "hace 3 h", "hace 2 d" — enough precision for something that aired today. */
function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/**
 * Episodes released for the anime the user is watching.
 *
 * The popover carries its own opaque background rather than inheriting the
 * header's. The header is `fixed top-0` and switches to `backdrop-blur-xl` on
 * scroll, which samples whatever is behind it — a translucent panel anchored
 * there would show the page sliding underneath the text.
 */
export default function NotificationBell() {
  const { items, unreadCount, isUnread, markRead } = useNotifications();
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
            <p className="text-base font-semibold text-white">Nuevos episodios</p>
            <p className="text-xs text-white/50 mt-0.5">Últimas 24 horas</p>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-sm text-white/50">
              Nada nuevo por ahora. Aquí aparecen los episodios de lo que estás
              viendo.
            </p>
          ) : (
            <ul className="max-h-[60vh] md:max-h-[28rem] overflow-y-auto divide-y divide-white/5">
              {items.map((n) => {
                const unread = isUnread(n);
                return (
                  <li key={`${n.animeId}-${n.episode}`}>
                    <Link
                      href={`/anime/${n.animeId}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors",
                        // Dimmed, not removed: a read episode is still the
                        // answer to "which one came out today".
                        !unread && "opacity-60",
                      )}
                    >
                      {/* 2:3, the poster's own ratio. */}
                      {n.poster ? (
                        <img
                          src={n.poster}
                          alt=""
                          className="w-12 h-[4.5rem] rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-[4.5rem] rounded-md bg-white/10 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-white line-clamp-2">
                          {n.title}
                        </span>
                        <span className="block mt-1 text-sm text-white/60">
                          Episodio {n.episode} · {timeAgo(n.airedAt)}
                        </span>
                      </span>
                      {unread && (
                        <span className="shrink-0 flex items-center">
                          <span
                            className="w-2 h-2 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Sin leer</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
