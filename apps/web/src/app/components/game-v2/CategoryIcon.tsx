import type { Category } from "@pejuang/shared";
import { TILE_DETAILS } from "@/data/game";

/** Ikon kategori petak (dekoratif; label kategori selalu ditulis di sebelahnya). */
export default function CategoryIcon({ category }: { category: Category }) {
  return <span aria-hidden="true" className="hex-category-icon">{TILE_DETAILS[category].icon}</span>;
}
