import Link from "next/link";
import Icon, { type IconName } from "@/components/custom/Icon";

type EmptyStateAction =
  | { href: string; label: string }
  | { onClick: () => void; label: string };

const ACTION_CLASS =
  "h-11 px-6 inline-flex items-center bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer";

/**
 * The page-sized "nothing to show here" block, with at most one way forward.
 *
 * The action is a link when the way forward is another page, and a button when
 * it is trying again on this one.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: EmptyStateAction;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[40vh] border border-dashed border-white/10 rounded-2xl bg-white/5 px-6 py-14">
      <Icon name={icon} size={40} className="text-white/25 mb-5" />
      <h2 className="text-xl font-bold text-white mb-2 text-balance">{title}</h2>
      <p className="text-white/55 max-w-md mb-6 text-balance">{body}</p>
      {action && "href" in action ? (
        <Link href={action.href} className={ACTION_CLASS}>
          {action.label}
        </Link>
      ) : action ? (
        <button type="button" onClick={action.onClick} className={ACTION_CLASS}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
