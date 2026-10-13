import type { Category } from "@pejuang/shared";
import BaseCategoryIcon from "../game/CategoryIcon";

/** Ikon kategori petak (dekoratif; label kategori selalu ditulis di sebelahnya). */
export default function CategoryIcon({ category }: { category: Category }) {
  return <span aria-hidden="true" className="hex-category-icon"><BaseCategoryIcon category={category} size={16} /></span>;
}
