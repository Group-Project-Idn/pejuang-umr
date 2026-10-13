import type { Metadata } from "next";
import { SettingsScreen } from "./settings-screen";

export const metadata: Metadata = {
  title: "Pengaturan — Pejuang UMR",
};

export default function PengaturanPage() {
  return <SettingsScreen />;
}
