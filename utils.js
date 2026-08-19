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

export async function handleFormSubmit(btn, inputs, submitAction) {
    // 1. Clear previous errors
    inputs.forEach(inputObj => {
        if (!inputObj.el) return;
        inputObj.el.classList.remove('border-error');
        inputObj.el.classList.remove('ring-error');
        // remove error text element if exists
        const wrapper = inputObj.el.parentElement;
        if (wrapper) {
            const next = inputObj.el.nextElementSibling;
            if(next && next.classList.contains('validation-error-text')) {
                next.remove();
            }
        }
    });

    // 2. Validate
    let isValid = true;
    for (const inputObj of inputs) {
        if (!inputObj.el) continue;
        const val = inputObj.el.value.trim();
        let errorMsg = null;
        
        if (inputObj.required !== false && !val) {
            errorMsg = "Bu alan zorunludur.";
        } else if (inputObj.type === 'number' && val) {
            const num = Number(val);
            if (isNaN(num)) {
                errorMsg = "Lütfen geçerli bir sayı girin.";
            } else if (inputObj.min !== undefined && num < inputObj.min) {
                errorMsg = `Değer ${inputObj.min} veya büyük olmalıdır.`;
            }
        }
        
        if (errorMsg) {
            inputObj.el.classList.add('border-error');
            inputObj.el.classList.add('ring-error'); // tailwind ring color if defined
            const errSpan = document.createElement('span');
            errSpan.className = "text-error text-xs mt-1 validation-error-text block font-medium";
            errSpan.textContent = errorMsg;
            if (inputObj.el.parentElement) {
                inputObj.el.parentElement.insertBefore(errSpan, inputObj.el.nextSibling);
            }
            isValid = false;
        }
    }

    if (!isValid) return false;

    // 3. Disable button
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin material-symbols-rounded mr-2">sync</span> Bekleniyor...`;
    btn.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        await submitAction();
        // Option to delay reset if submitAction handles it (e.g., shows success)
        // If submitAction wants to keep button disabled, it can return a promise that resolves later, but let's just restore it.
    } catch (err) {
        console.error(err);
        alert("İşlem sırasında bir hata oluştu: " + err.message);
    } finally {
        // If button text was changed by submitAction (e.g. to Success), don't immediately revert if it has bg-primary-container
        if (!btn.classList.contains('bg-primary-container')) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
        } else {
            // Restore it after 1 second if it was marked as success
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }, 1000);
        }
    }
    return true;
}
