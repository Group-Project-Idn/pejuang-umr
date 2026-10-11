import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "inverted"
  | "outlined";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-utama text-di-utama hover:brightness-105 active:brightness-95 disabled:opacity-50",
  secondary:
    "bg-kartu-tinggi text-teks-utama hover:brightness-110 active:brightness-90 disabled:opacity-50",
  inverted:
    "bg-kontras text-di-kontras hover:brightness-105 active:brightness-95 disabled:opacity-50",
  outlined:
    "bg-kartu text-teks-utama border border-garis hover:bg-kartu-tinggi disabled:opacity-50",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

/**
 * Satu tombol aksi utama per layar. Target sentuh min 44px,
 * state hover/pressed/focus/disabled/loading, label pembaca layar via props.
 */
export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const busy = loading || disabled;
  return (
    <button
      type={type}
      disabled={busy}
      aria-disabled={busy}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 py-3 text-label transition disabled:cursor-not-allowed motion-reduce:transition-none ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
