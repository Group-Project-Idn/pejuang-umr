"use client";

import { useEffect, type ReactNode } from "react";
import { HEX_PANEL_CLASS, HEX_PANEL_WRAPPER_CLASS } from "@/lib/hex-interaction";

export type SidePanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Konten di atas judul (mis. catatan privasi dan chip kategori). */
  header?: ReactNode;
  className?: string;
};

/**
 * Panel non-modal berupa kartu map kuning: tepi bawah (HP) atau kanan (desktop). Tanpa lapisan
 * gelap; hanya kartu yang menerima pointer sehingga papan di belakangnya tetap bisa diklik.
 */
export default function SidePanel({ open, title, onClose, children, header, className = "" }: SidePanelProps) {
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
      <section role="dialog" aria-label={title} className={`${HEX_PANEL_CLASS} ${className}`}>
        <span aria-hidden="true" className="hex-card-clip" />
        <div className="hex-card-scroll">
          {header}
          <h2 className="hex-card-title">{title}</h2>
          <div className="grid gap-3">{children}</div>
        </div>
      </section>
    </div>
  );
}
