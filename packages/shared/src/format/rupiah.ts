const FULL_FORMAT = new Intl.NumberFormat("id-ID");
const SHORT_FORMAT = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

export function formatRupiah(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}Rp${FULL_FORMAT.format(Math.abs(value))}`;
}

export function formatRupiahShort(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${sign}Rp${SHORT_FORMAT.format(absolute / 1_000_000)}jt`;
  }
  if (absolute >= 1_000) {
    return `${sign}Rp${Math.round(absolute / 1_000)}rb`;
  }
  return `${sign}Rp${absolute}`;
}
