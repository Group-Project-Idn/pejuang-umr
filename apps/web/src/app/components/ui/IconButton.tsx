import type { ButtonHTMLAttributes } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

/** Tombol ikon 44px dengan label aksesibel wajib. */
export default function IconButton({ label, className = "", ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-11 place-items-center rounded-full border border-garis bg-kartu-tinggi text-body text-teks-utama transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}
