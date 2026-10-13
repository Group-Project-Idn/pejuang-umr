"use client";

import { useEffect, useRef, type ReactNode } from "react";
import PopupFrame from "./PopupFrame";

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
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
      <PopupFrame
        modal
        title={title}
        titleRef={titleRef}
        className="comic-dialog-card"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </PopupFrame>
    </div>
  );
}
