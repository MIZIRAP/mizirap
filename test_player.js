document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const btn = document.querySelector('[data-action="openStretchPlayer"]');
        if (btn) btn.click();
    }, 1000);
});
