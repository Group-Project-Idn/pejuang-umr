import type { ReactNode } from "react";
import type { Category } from "@pejuang/shared";

export type CategoryIconProps = {
  category: Category;
  size?: number;
  className?: string;
};

const PATHS: Record<Category, ReactNode> = {
  work: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 13h18" />
    </>
  ),
  social: (
    <path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.5A8 8 0 1 1 21 12Z" />
  ),
  health: (
    <path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20Z" />
  ),
  finance: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  gold: (
    <path d="M12 3l2.4 5.6L20 9.5l-4.3 3.8L17 19l-5-3-5 3 1.3-5.7L4 9.5l5.6-.9L12 3Z" />
  ),
};

/** Ikon kategori heksa. Dekoratif: label teks tetap dari TILE_DETAILS[category].label. */
export default function CategoryIcon({ category, size = 24, className }: CategoryIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[category]}
    </svg>
  );
}
