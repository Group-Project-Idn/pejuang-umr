"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Bottom sheet mobile-first: Esc menutup, fokus ke judul saat dibuka. */
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
      className="fixed inset-0 z-40 grid items-end justify-items-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-garis bg-kartu p-4 text-teks-utama"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 ref={titleRef} tabIndex={-1} className="text-title focus:outline-none">
          {title}
        </h2>
        <div className="mt-3 grid gap-3">{children}</div>
      </section>
    </div>
  );
}
