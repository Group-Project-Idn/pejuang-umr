import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  children: ReactNode;
  /** map kuning (default) atau sticky note. */
  tone?: "folder" | "note";
  /** Elemen pembungkus; aside untuk panel samping HUD. */
  as?: "section" | "aside";
};

/** Kartu map kuning / sticky note: kontur cokelat tua tebal, sudut membulat, bayangan kecil. */
export default function Card({
  title,
  children,
  className = "",
  tone = "folder",
  as: Tag = "section",
  ...rest
}: CardProps) {
  return (
    <Tag className={`${tone === "note" ? "ui-note" : "ui-folder"} p-4 ${className}`} {...rest}>
      {title ? <h2 className="ui-card-title">{title}</h2> : null}
      {children}
    </Tag>
  );
}
