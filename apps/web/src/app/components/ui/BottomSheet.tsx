"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Dialog map komik: Esc menutup, fokus ke judul saat dibuka. */
export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="comic-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="paper-panel comic-dialog-card"
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true" className="hex-card-clip" />
        <div className="comic-dialog-scroll">
          <h2 ref={titleRef} tabIndex={-1} className="hex-card-title focus:outline-none">
            {title}
          </h2>
          <div className="comic-dialog-body">{children}</div>
        </div>
      </section>
    </div>
  );
}
