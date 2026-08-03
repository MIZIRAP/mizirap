export const formatCurrency = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
export const formatDate = (d, options = {}) => {
    if (!d) return "";
    const dateObj = d.toDate ? d.toDate() : new Date(d);
    return dateObj.toLocaleDateString("tr-TR", options);
};
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function validatePositiveNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (num <= 0) return false;
    return true;
}
