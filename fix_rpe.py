with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_rpe = """function _refreshRPEButtons(exId, setIdx, set) {
    const row = document.getElementById(`set-row-${exId}-${setIdx}`);
    if (!row) return;
    // Only target buttons inside the dedicated .rpe-btn-group container
    const rpeGroup = row.querySelector('.rpe-btn-group');
    if (!rpeGroup) return;
    rpeGroup.querySelectorAll('button').forEach((btn, i) => {
        const rpeVal = i + 6;
        const isSelected = set.rpe === rpeVal;
        btn.className = `w-10 h-10 rounded-full border transition-all duration-150 font-label-lg text-label-lg active:scale-95
            ${isSelected
                ? 'bg-gradient-to-r from-neon-purple to-neon-blue text-white border-transparent shadow-sm scale-110 ring-2 ring-primary/30 ring-offset-1'
                : 'bg-background shadow-neo text-on-surface-variant border-surface-variant hover:border-primary/40'}`;
    });
}"""

new_rpe = """function _refreshRPEButtons(exId, setIdx, set) {
    const row = document.getElementById(`set-row-${exId}-${setIdx}`);
    if (!row) return;
    const rpeGroup = row.querySelector('.rpe-btn-group');
    if (!rpeGroup) return;

    rpeGroup.innerHTML = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        const btnClass = isSelected 
            ? 'flex-1 py-3 neo-inset rounded-xl font-body-md text-body-md text-primary font-bold bg-primary/5'
            : 'flex-1 py-3 neo-surface rounded-xl font-body-md text-body-md text-text-secondary neo-surface-interactive';
        return `<button data-action="sessionSetRPE" data-ex-id="${exId}" data-set-idx="${setIdx}" data-rpe="${r}" class="${btnClass}">${r}</button>`;
    }).join('');

    const summaryLabel = document.getElementById(`rpe-summary-${exId}-${setIdx}`);
    if (summaryLabel) {
        summaryLabel.textContent = set.rpe ? `RPE ${set.rpe}` : '';
    }
}"""

if old_rpe in content:
    content = content.replace(old_rpe, new_rpe)
    with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed RPE")
else:
    print("Old RPE not found")
