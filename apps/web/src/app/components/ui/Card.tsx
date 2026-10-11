import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  children: ReactNode;
};

/** Kartu permukaan: elevasi via tingkat terang + garis tepi 1px, bukan bayangan. */
export default function Card({
  title,
  children,
  className = "",
  ...rest
}: CardProps) {
  return (
    <section
      className={`rounded-md border border-garis bg-kartu p-4 text-teks-utama ${className}`}
      {...rest}
    >
      {title ? <h2 className="text-title">{title}</h2> : null}
      {children}
    </section>
  );
}
