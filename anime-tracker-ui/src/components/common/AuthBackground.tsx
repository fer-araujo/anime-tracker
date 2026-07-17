/* -------------------------------------------------------------------------- */
/*  AuthBackground — full-screen gradient orbs                                */
/* -------------------------------------------------------------------------- */

interface AuthBackgroundProps {
  className?: string;
}

export function AuthBackground({ className }: AuthBackgroundProps) {
  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute -top-[40%] -left-[30%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(142_72%_45%/0.08)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(260_60%_50%/0.06)_0%,transparent_60%)] blur-[120px]" />
      <div className="absolute top-[10%] right-[5%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(200_70%_50%/0.05)_0%,transparent_60%)] blur-[100px]" />
    </div>
  );
}
