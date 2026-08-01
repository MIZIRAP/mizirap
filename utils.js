export const tl = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("tr-TR") : "";
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
