import { Suspense } from "react";
import { AiringCalendarPage } from "@/components/calendar/AiringCalendarPage";

export const metadata = { title: "Mi calendario" };

// Suspense because the page reads `?week=` with useSearchParams, which fails
// the production build without a boundary to bail into.
export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AiringCalendarPage />
    </Suspense>
  );
}
