import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "secondary" | "inverted" | "outlined";
};

/** Tombol komik 02_DESIGN: hijau (utama), oranye, biru, outlined untuk aksi ringan; min tinggi 44px. */
export default function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return <button className={`ui-btn ui-btn-${variant} ${className}`} {...rest} />;
}
