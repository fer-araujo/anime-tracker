"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/custom/Icon";
import { useNotifications } from "@/hooks/useNotifications";

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
  const { items, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Reading is opening. Waiting for a separate "mark as read" control would
    // leave a badge sitting over a list the user has already looked at.
    if (next) void markRead();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
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
        <div className="absolute right-0 top-11 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-neutral-950 shadow-xl shadow-black/40 overflow-hidden z-50">
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-base font-semibold text-white">Nuevos episodios</p>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-sm text-white/50">
              Nada nuevo por ahora. Aquí aparecen los episodios de lo que estás
              viendo.
            </p>
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto divide-y divide-white/5">
              {items.map((n) => (
                <li key={`${n.animeId}-${n.episode}`}>
                  <Link
                    href={`/anime/${n.animeId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
                  >
                    {/* 2:3, the poster's own ratio. The first version was
                        40×56, which read as a thumbnail of a thumbnail. */}
                    {n.poster ? (
                      <img
                        src={n.poster}
                        alt=""
                        className="w-12 h-[4.5rem] rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-[4.5rem] rounded-md bg-white/10 shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium text-white line-clamp-2">
                        {n.title}
                      </span>
                      <span className="block mt-1 text-sm text-white/60">
                        Episodio {n.episode} · {timeAgo(n.airedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
