export const PosterSkeleton = ({ title }: { title: string }) => {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-neutral-900">
      <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.08)_37%,rgba(255,255,255,0.04)_63%)] bg-[length:400%_100%]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-10 w-10 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 4h16v16H4z" />
          <path d="m4 15 4-4 4 4 4-4 4 4" />
        </svg>
        <span className="text-sm">{title}</span>
      </div>
    </div>
  );
}