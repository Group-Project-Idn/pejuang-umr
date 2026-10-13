"use client";

import { useEffect, type ReactNode } from "react";
import PopupFrame from "./PopupFrame";
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
      <PopupFrame title={title} header={header} className={`${HEX_PANEL_CLASS} ${className}`}>
        {children}
      </PopupFrame>
    </div>
  );
}
