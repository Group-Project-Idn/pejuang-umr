"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { HEX_PANEL_CLASS, HEX_PANEL_WRAPPER_CLASS } from "@/lib/hex-interaction";

export type SidePanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Panel non-modal: tepi bawah (mobile) atau kanan (desktop). Tanpa lapisan gelap;
 * hanya panel yang menerima pointer sehingga papan di belakangnya tetap bisa diklik.
 */
export default function SidePanel({ open, title, onClose, children }: SidePanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

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
    <div className={HEX_PANEL_WRAPPER_CLASS}>
      <section role="dialog" aria-label={title} className={HEX_PANEL_CLASS}>
        <h2 ref={titleRef} className="text-title">
          {title}
        </h2>
        <div className="mt-3 grid gap-3">{children}</div>
      </section>
    </div>
  );
}
