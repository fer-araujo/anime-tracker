"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/custom/Icon";
import Select, { type SelectOption } from "@/components/custom/Select";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Build the page number list with ellipsis marks */
function buildPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}

/* -------------------------------------------------------------------------- */
/*  PageButton                                                                 */
/* -------------------------------------------------------------------------- */

function PageButton({
  page,
  active,
  onClick,
}: {
  page: number | "ellipsis";
  active: boolean;
  onClick: () => void;
}) {
  if (page === "ellipsis") {
    return (
      <span
        aria-hidden="true"
        className="w-9 h-9 hidden sm:inline-flex items-center justify-center text-xs text-muted-foreground select-none"
      >
        …
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Página ${page}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-9 h-9 hidden sm:inline-flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25"
          : "bg-white/5 text-muted-foreground border-transparent hover:bg-white/10 hover:text-foreground hover:border-white/10",
      )}
    >
      {page}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                 */
/* -------------------------------------------------------------------------- */

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pages = useMemo(
    () => buildPages(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const sizeOptions: SelectOption[] = useMemo(
    () =>
      pageSizeOptions.map((n) => ({
        value: String(n),
        label: String(n),
      })),
    [pageSizeOptions],
  );

  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-white/10"
    >
      {/* Info */}
      <p className="text-xs text-muted-foreground order-1 sm:order-none">
        Mostrando{" "}
        <span className="text-foreground font-medium">{from}</span>
        –
        <span className="text-foreground font-medium">{to}</span> de{" "}
        <span className="text-foreground font-medium">{totalItems}</span>
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1.5 order-2 sm:order-none">
        {/* Prev */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Página anterior"
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer border",
            currentPage === 1
              ? "border-white/5 bg-transparent text-muted-foreground/30 cursor-not-allowed"
              : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
          )}
        >
          <Icon name="ChevronLeft" size={14} />
        </button>

        {/* Page numbers */}
        {pages.map((page, i) => (
          <PageButton
            key={
              page === "ellipsis" ? `ellipsis-${i}` : `page-${page}`
            }
            page={page}
            active={page === currentPage}
            onClick={() =>
              page !== "ellipsis" && onPageChange(page)
            }
          />
        ))}

        {/* Next */}
        <button
          type="button"
          onClick={() =>
            onPageChange(Math.min(totalPages, currentPage + 1))
          }
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer border",
            currentPage === totalPages
              ? "border-white/5 bg-transparent text-muted-foreground/30 cursor-not-allowed"
              : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
          )}
        >
          <Icon name="ChevronRight" size={14} />
        </button>

        {/* Page size selector — opens upward */}
        <div className="ml-2 w-[70px]">
          <Select
            options={sizeOptions}
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            dropdownUp
          />
        </div>
      </div>
    </nav>
  );
}
