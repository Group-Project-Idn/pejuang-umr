import type { Metadata } from "next";
import { Fredoka, Kalam, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { SfxProvider } from "./sfx-provider";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Pejuang UMR",
  description: "Game strategi kehidupan multiplayer berbasis papan heksagonal.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${fredoka.variable} ${nunito.variable} ${kalam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SfxProvider />
        {children}
      </body>
    </html>
  );
}
