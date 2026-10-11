import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

/** Tombol ikon bulat: emote, Ajakan, kamera, jeda. Wajib label aksesibel. */
export default function IconButton({
  label,
  children,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid min-h-11 min-w-11 place-items-center rounded-full border border-garis bg-kartu-tinggi text-lg text-teks-utama transition hover:bg-kartu disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${className}`}
      {...rest}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
