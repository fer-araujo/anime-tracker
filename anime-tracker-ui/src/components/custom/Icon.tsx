import type { SVGAttributes, ReactElement } from "react";

/* -------------------------------------------------------------------------- */
/*  Icon — inline SVG components (no lucide-react dependency)                */
/* -------------------------------------------------------------------------- */

export type IconName =
  | "Star"
  | "Info"
  | "Plus"
  | "Search"
  | "ChevronLeft"
  | "ChevronRight"
  | "ChevronDown"
  | "ExternalLink"
  | "Clock"
  | "Calendar"
  | "Filter"
  | "Heart"
  | "Menu"
  | "X"
  | "Play"
  | "List"
  | "AlertCircle"
  | "Check"
  | "Trash2"
  | "Edit3"
  | "Share2"
  | "MoreHorizontal"
  | "Loader2"
  | "Bell"
  | "User"
  | "ImageIcon"
  | "Tv"
  | "MonitorPlay"
  | "Trophy";

/**
 * SVG path data map — each entry provides the `d` attribute value(s).
 * Uses `currentColor` so the icon inherits its parent text color.
 */
const paths: Record<IconName, { viewBox: string; children: ReactElement[] }> = {
  Star: {
    viewBox: "0 0 24 24",
    children: [
      <path
        key="star"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor"
        strokeWidth="2"
      />,
    ],
  },
  Info: {
    viewBox: "0 0 24 24",
    children: [
      <path key="info" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />,
    ],
  },
  Plus: {
    viewBox: "0 0 24 24",
    children: [
      <path key="plus" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />,
    ],
  },
  Search: {
    viewBox: "0 0 24 24",
    children: [
      <path key="search" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />,
    ],
  },
  ChevronLeft: {
    viewBox: "0 0 24 24",
    children: [
      <path key="chevron-left" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />,
    ],
  },
  ChevronRight: {
    viewBox: "0 0 24 24",
    children: [
      <path key="chevron-right" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />,
    ],
  },
  ChevronDown: {
    viewBox: "0 0 24 24",
    children: [
      <path key="chevron-down" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor" />,
    ],
  },
  ExternalLink: {
    viewBox: "0 0 24 24",
    children: [
      <path key="ext-link" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor" />,
    ],
  },
  Clock: {
    viewBox: "0 0 24 24",
    children: [
      <path key="clock" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor" />,
    ],
  },
  Calendar: {
    viewBox: "0 0 24 24",
    children: [
      <path key="calendar" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor" />,
    ],
  },
  Filter: {
    viewBox: "0 0 24 24",
    children: [
      <path key="filter" d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" fill="currentColor" />,
    ],
  },
  Heart: {
    viewBox: "0 0 24 24",
    children: [
      <path key="heart" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />,
    ],
  },
  Menu: {
    viewBox: "0 0 24 24",
    children: [
      <path key="menu" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />,
    ],
  },
  X: {
    viewBox: "0 0 24 24",
    children: [
      <path key="x" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />,
    ],
  },
  Play: {
    viewBox: "0 0 24 24",
    children: [
      <path key="play" d="M8 5v14l11-7z" fill="currentColor" />,
    ],
  },
  List: {
    viewBox: "0 0 24 24",
    children: [
      <path key="list" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor" />,
    ],
  },
  AlertCircle: {
    viewBox: "0 0 24 24",
    children: [
      <path key="alert" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-1-1 2-4-2-4 1-1 3 5-2 4 1 1h-2zm2-5h-1v-2h2v2zm0 4h-1v-2h2v2z" fill="currentColor" />,
    ],
  },
  Check: {
    viewBox: "0 0 24 24",
    children: [
      <path key="check" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />,
    ],
  },
  Trash2: {
    viewBox: "0 0 24 24",
    children: [
      <path key="trash" d="M3 6v2h18V6H3zm3 12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V8H6v10zm3-8h2v8H9v-8zm4 0h2v8h-2v-8zM13 3h-4l-1 2H4v2h18V5h-4l-1-2z" fill="currentColor" />,
    ],
  },
  Edit3: {
    viewBox: "0 0 24 24",
    children: [
      <path key="edit3" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />,
    ],
  },
  Share2: {
    viewBox: "0 0 24 24",
    children: [
      <path key="share2" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.24-.09.46-.09.69 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" fill="currentColor" />,
    ],
  },
  MoreHorizontal: {
    viewBox: "0 0 24 24",
    children: [
      <path key="more-horiz" d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor" />,
    ],
  },
  Loader2: {
    viewBox: "0 0 24 24",
    children: [
      <path key="loader" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="currentColor" opacity="0.3" />,
      <path key="loader-spin" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill="currentColor" />,
    ],
  },
  Bell: {
    viewBox: "0 0 24 24",
    children: [
      <path key="bell" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor" />,
    ],
  },
  User: {
    viewBox: "0 0 24 24",
    children: [
      <path key="user" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />,
    ],
  },
  ImageIcon: {
    viewBox: "0 0 24 24",
    children: [
      <path key="image" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" />,
    ],
  },
  Tv: {
    viewBox: "0 0 24 24",
    children: [
      <path key="tv" d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor" />,
    ],
  },
  MonitorPlay: {
    viewBox: "0 0 24 24",
    children: [
      <path key="monitor-play" d="M22 3H2c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-1v-2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H2V5h20v12zM9.5 8.5v5l5-3-5-2z" fill="currentColor" />,
    ],
  },
  Trophy: {
    viewBox: "0 0 24 24",
    children: [
      <path key="trophy" d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" fill="currentColor" />,
    ],
  },
};

/**
 * Icon component — renders inline SVG icons without lucide-react.
 *
 * Uses `currentColor` so the icon inherits its parent's text color.
 *
 * @example
 * ```tsx
 * <Icon name="Search" className="text-muted-foreground" />
 * <Icon name="Star" size={20} className="text-yellow-400" />
 * ```
 */
export default function Icon({
  name,
  className = "",
  size = 16,
  ...props
}: {
  /** Icon identifier — see {@link IconName}. */
  name: IconName;
  /** Additional CSS classes. */
  className?: string;
  /** Icon width and height in pixels (default 16). */
  size?: number;
} & Omit<SVGAttributes<SVGSVGElement>, "name" | "className" | "children">) {
  const icon = paths[name];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      {icon.children}
    </svg>
  );
}

/** @internal Map of icon name to SVG data. */
export const ICON_PATHS = { ...paths };