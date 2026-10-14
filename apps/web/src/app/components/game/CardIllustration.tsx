import type { Category } from "@pejuang/shared";
import CategoryIcon from "./CategoryIcon";

export type CardIllustrationProps = {
  category: Category;
};

/** Adegan kategori hanya menggambarkan Rencana; tidak mengisyaratkan hasil Realita. */
export default function CardIllustration({ category }: CardIllustrationProps) {
  return (
    <div className={`card-illustration card-illustration-${category}`} aria-hidden="true">
      <svg viewBox="0 0 200 92" preserveAspectRatio="xMidYMid meet" focusable="false">
        <ellipse cx="100" cy="80" rx="76" ry="7" fill="#76523a" opacity=".15" />
        {category === "work" ? (
          <>
            <rect x="40" y="52" width="120" height="22" rx="6" fill="#e9a365" />
            <path d="M32 74h136M48 74v9m104-9v9" />
            <path d="M67 51V25a5 5 0 0 1 5-5h56a5 5 0 0 1 5 5v26Z" fill="#7fb0f5" />
            <path d="M59 52h82l-7 7H66Z" fill="#d9e3f7" />
            <path d="M99 11v5m-13-3-3-3m28 3 3-3" />
            <rect x="146" y="39" width="12" height="14" rx="3" fill="#fff3bf" />
          </>
        ) : category === "social" ? (
          <>
            <circle cx="67" cy="30" r="12" fill="#f4b7ae" />
            <circle cx="133" cy="30" r="12" fill="#e9a365" />
            <path d="M45 72V55a17 17 0 0 1 17-17h10a17 17 0 0 1 17 17v17Zm66 0V55a17 17 0 0 1 17-17h10a17 17 0 0 1 17 17v17Z" fill="#7fb0f5" />
            <path d="M92 53h16m-8-8v16" />
            <path d="M97 19c-7-9-17 3 3 14 20-11 10-23 3-14Z" fill="#f4b7ae" />
          </>
        ) : category === "health" ? (
          <>
            <path d="M100 70C48 40 57 15 76 15c12 0 20 8 24 15 4-7 12-15 24-15 19 0 28 25-24 55Z" fill="#86da99" />
            <path d="M74 45h16l7-13 9 24 7-11h14" fill="none" stroke="#fff7de" strokeWidth="5" />
            <path d="M39 24v9m-4-4h9m111 28v9m-4-4h9" />
          </>
        ) : category === "finance" ? (
          <>
            <rect x="48" y="30" width="104" height="46" rx="9" fill="#e9a365" />
            <path d="M48 43h104" />
            <rect x="109" y="50" width="43" height="18" rx="5" fill="#fff3bf" />
            <circle cx="125" cy="59" r="4" fill="#f5c542" />
            <circle cx="76" cy="20" r="14" fill="#f5c542" />
            <path d="M76 12v16m-5-12h8c6 0 6 7-1 7h-7" />
          </>
        ) : (
          <>
            <circle cx="100" cy="43" r="35" fill="#fff3bf" />
            <path d="M47 22v10m-5-5h10m106 26v10m-5-5h10" />
          </>
        )}
      </svg>
      {category === "gold" ? <span className="card-illustration-gold-icon"><CategoryIcon category="gold" size={46} /></span> : null}
    </div>
  );
}