"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Bottom sheet (mobile) -> panel samping/modal tengah 480px (desktop).
 * Esc menutup, klik latar menutup, fokus awal ke judul.
 */
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
      className="fixed inset-0 z-50 grid items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-t-lg border border-garis bg-kartu p-6 text-teks-utama sm:mx-auto sm:w-[480px] sm:rounded-lg"
      >
        <h2 ref={titleRef} tabIndex={-1} className="text-headline">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
