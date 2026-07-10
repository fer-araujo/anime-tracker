import type { ReactNode, HTMLAttributes } from "react";

/* -------------------------------------------------------------------------- */
/*  Card — Compound component pattern                                       */
/* -------------------------------------------------------------------------- */

/**
 * Root card container.
 * Renders a rounded bordered surface with a subtle shadow.
 *
 * @example
 * ```tsx
 * <Card.Root className="w-80">
 *   <Card.Header>Header</Card.Header>
 *   <Card.Content>Body</Card.Content>
 *   <Card.Footer>Footer</Card.Footer>
 * </Card.Root>
 * ```
 */
function CardRoot({
  className = "",
  children,
  ...props
}: { className?: string; children?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-6 rounded-xl border bg-card text-card-foreground py-6 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Optional card header — sits at the top of the card.
 */
function CardHeader({
  className = "",
  children,
  ...props
}: { className?: string; children?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Main card content area.
 */
function CardContent({
  className = "",
  children,
  ...props
}: { className?: string; children?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Optional card footer — sits at the bottom of the card.
 */
function CardFooter({
  className = "",
  children,
  ...props
}: { className?: string; children?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export { CardRoot, CardHeader, CardContent, CardFooter };

/**
 * Card — compound component with `.Root`, `.Header`, `.Content`, `.Footer` sub-components.
 *
 * @example
 * ```tsx
 * import { Card } from "@/components/custom/Card";
 *
 * <Card.Root>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Content>Content</Card.Content>
 * </Card.Root>
 * ```
 */
export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
};

export default Card;