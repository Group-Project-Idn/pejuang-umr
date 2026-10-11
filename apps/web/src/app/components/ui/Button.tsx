import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "secondary" | "inverted" | "outlined";
};

/** Tombol sesuai 02_DESIGN: satu Primary per layar, min tinggi 44px. */
export default function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-label font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] disabled:cursor-not-allowed disabled:opacity-50 btn-${variant} ${className}`}
      {...rest}
    />
  );
}
