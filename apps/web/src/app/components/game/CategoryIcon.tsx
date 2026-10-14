import type { Category } from "@pejuang/shared";

export type CategoryIconProps = {
  category: Category;
  size?: number;
  className?: string;
};

const CATEGORY_EMOJI: Record<Exclude<Category, "gold">, string> = {
  work: "💼",
  social: "🤝",
  health: "💚",
  finance: "💰",
};

/** Ikon kategori heksa. Dekoratif: label teks tetap dari TILE_DETAILS[category].label. */
export default function CategoryIcon({ category, size = 24, className }: CategoryIconProps) {
  if (category !== "gold") {
    return (
      <span
        aria-hidden="true"
        className={`category-emoji category-emoji-${category}${className ? ` ${className}` : ""}`}
        style={{ width: size, height: size, fontSize: size * 0.78 }}
      >
        {CATEGORY_EMOJI[category]}
      </span>
    );
  }
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
      <path d="M12 3l2.4 5.6L20 9.5l-4.3 3.8L17 19l-5-3-5 3 1.3-5.7L4 9.5l5.6-.9L12 3Z" />
    </svg>
  );
}
