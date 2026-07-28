// Formatting shared by the revenue dashboard and the full transaction list.
// Framework-free (no React/Next imports) so it stays unit-testable, same as
// app/pricing/plans-data.ts.

export const vnd = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";

export function vndCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",") + "B ₫";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + "M ₫";
  if (n >= 1e3) return Math.round(n / 1e3) + "K ₫";
  return Math.round(n) + " ₫";
}

/**
 * Colour for a revenue bucket. The buckets are what a payment BOUGHT, so this
 * also has to cover "Nạp quota lẻ" — standalone credits — which otherwise fell
 * through to the grey reserved for unattributed revenue.
 */
export function planColor(name: string): string {
  const p = name.toLowerCase();
  if (p.includes("quota")) return "#059669";
  if (p.includes("enterprise")) return "#db2777";
  if (p.includes("pro")) return "#7c3aed";
  if (p.includes("starter")) return "#2563eb";
  return "#8b93a3";
}

export const STATUS_META: Record<string, { label: string; color: string }> = {
  completed: { label: "Thành công", color: "#059669" },
  failed: { label: "Thất bại", color: "#c1483d" },
  pending: { label: "Đang xử lý", color: "#c98a2c" },
};

/** Falls back to the raw status so an unknown one still renders readably. */
export function statusMeta(status: string): { label: string; color: string } {
  return STATUS_META[status] ?? { label: status, color: "#8b93a3" };
}
