import type { ReactNode } from "react";
import Button from "./Button";

export type ScreenProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const NAV_ITEMS = ["Beranda", "Mabar", "Cara Main", "Pengaturan"] as const;

export type BottomNavProps = {
  active?: (typeof NAV_ITEMS)[number];
};

/** Kerangka Screen + BottomNav sesuai 02_DESIGN (mobile-first, max-w-md). */
export function Screen({ title, subtitle, actions, children }: ScreenProps) {
  return (
    <main className="mx-auto grid w-full max-w-md gap-4 bg-latar px-4 pb-24 pt-6 text-teks-utama">
      <header className="grid gap-1">
        <p className="text-label uppercase tracking-widest text-teks-sekunder">Pejuang UMR</p>
        <h1 className="text-headline">{title}</h1>
        {subtitle ? <p className="text-body-sm text-teks-sekunder">{subtitle}</p> : null}
        {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      <div className="grid gap-4">{children}</div>
    </main>
  );
}

export function BottomNav({ active = "Beranda" }: BottomNavProps) {
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-30 border-t border-garis bg-kartu">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <li key={item}>
            <Button
              variant="secondary"
              aria-current={item === active ? "page" : undefined}
              className={`w-full rounded-none border-0 ${item === active ? "text-indikator-kekayaan" : "text-teks-sekunder"}`}
            >
              {item}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
