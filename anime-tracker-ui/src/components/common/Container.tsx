export function Container({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`mx-auto max-w-7xl px-5 md:px-8 ${className}`}>
      {children}
    </div>
  );
}
