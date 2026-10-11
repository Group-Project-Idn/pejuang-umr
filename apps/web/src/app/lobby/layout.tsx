import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Lobby — Pejuang UMR",
  description: "Cari room dan gabung permainan Pejuang UMR.",
};

export default function LobbyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

