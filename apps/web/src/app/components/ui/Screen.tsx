import type { ReactNode } from "react";

export type ScreenProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/", label: "Beranda", icon: "⌂" },
  { href: "/lobby", label: "Lobby", icon: "⚑" },
  { href: "/pengaturan", label: "Pengaturan", icon: "⚙" },
] as const;

/** Kerangka layar mobile-first: header + konten + nav pill bawah. */
export function Screen({ title, subtitle, actions, children }: ScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-permukaan px-4 pb-28 pt-6 text-teks-utama lg:max-w-5xl">
      <header className="grid gap-1">
        <h1 className="text-headline">{title}</h1>
        {subtitle ? <p className="text-body-sm text-teks-sekunder">{subtitle}</p> : null}
      </header>
      <div className="mt-6 grid gap-4">{children}</div>
      {actions ? <div className="mt-6 grid gap-3">{actions}</div> : null}
    </main>
  );
}

/** Item aktif berupa lingkaran kuning muda (guide). Navigasi atas di desktop. */
export function BottomNav({ active }: { active: "Beranda" | "Lobby" | "Pengaturan" }) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-garis bg-kartu px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
    >
      <ul className="mx-auto flex max-w-3xl items-center justify-around rounded-full bg-kartu-tinggi p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === active;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-label transition ${
                  isActive ? "bg-utama-lembut text-di-utama" : "text-teks-utama"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
