import re

with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace _renderSets
old_render_sets = """function _renderSets(exId) {
    const container = document.getElementById(`sets-container-${exId}`);
    if (!container) return;
    container.innerHTML = '';

    const state = _exState[exId];
    if (!state) return;

    state.sets.forEach((set, setIdx) => {
        const setEl = document.createElement('div');
        setEl.id = `set-row-${exId}-${setIdx}`;
        
        // ESKİ GÖRÜNÜM (Beğenmezseniz aşağıdaki satırın yorumunu kaldırın ve YENİ GÖRÜNÜM kısmını silin):
        // setEl.className = 'flex flex-col gap-md px-md py-md border-t border-surface-container-high bg-background shadow-neo/40 border-l-4 border-l-primary';
        
        // YENİ GÖRÜNÜM: Rakamları ve boşlukları büyütmeden, sadece arka plan tonunu (zebra deseni) ve üst çizgi rengini değiştirerek belirginlik artırıldı.
        const bgClass = (setIdx % 2 === 0) ? 'bg-background shadow-neo/40' : 'bg-background shadow-neoest/40';
        setEl.className = `flex flex-col gap-md px-md py-md border-none shadow-neo-inset rounded-xl mt-2 ${bgClass} border-l-4 border-l-primary`;
        
        setEl.innerHTML = _activeSetHTML(exId, setIdx, set);
        container.appendChild(setEl);
    });

    // Update accordion header counter
    _updateExAccordionHeader(exId);
}"""

new_render_sets = """function _renderSets(exId) {
    const container = document.getElementById(`sets-container-${exId}`);
    if (!container) return;
    container.innerHTML = '';

    const state = _exState[exId];
    if (!state) return;

    state.sets.forEach((set, setIdx) => {
        const isCurrent = setIdx === state.sets.length - 1;
        const setEl = document.createElement('article');
        setEl.className = 'neo-surface overflow-hidden';
        setEl.id = `set-row-${exId}-${setIdx}`;
        
        setEl.innerHTML = _activeSetHTML(exId, setIdx, set, isCurrent);
        container.appendChild(setEl);
    });

    // Append Add Set Button
    const addSetBtn = document.createElement('button');
    addSetBtn.className = 'w-full py-4 neo-inset-pill flex items-center justify-center gap-2 text-primary font-body-md neo-surface-interactive mt-2';
    addSetBtn.innerHTML = '<span class="material-symbols-rounded">add</span>Yeni Set Ekle';
    addSetBtn.onclick = () => sessionAddSet(exId);
    container.appendChild(addSetBtn);

    // Update accordion header counter (legacy support if needed)
    // _updateExAccordionHeader(exId);
}"""

content = content.replace(old_render_sets, new_render_sets)

# Replace _activeSetHTML
old_active_set_html = """function _activeSetHTML(exId, setIdx, set) {
    const currentE1RM = calculateE1RM(set.weight, set.reps, set.rpe);
    const isRoughEstimate = set.rpe === null;
    const e1rmDisplay = isRoughEstimate
        ? `<span class="italic text-on-surface-variant/60">~${currentE1RM}kg</span>`
        : `<span>${currentE1RM}kg</span>`;

    const rpeButtons = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        return `<button data-action="sessionSetRPE" data-ex-id="${exId}" data-set-idx="${setIdx}" data-rpe="${r}"
            class="w-10 h-10 rounded-full border transition-all duration-150 font-label-lg text-label-lg active:scale-95
                ${isSelected
                    ? 'bg-gradient-to-r from-neon-purple to-neon-blue text-white border-transparent shadow-sm scale-110 ring-2 ring-primary/30 ring-offset-1 ring-offset-surface-container-low'
                    : 'bg-background shadow-neo text-on-surface-variant border-surface-variant hover:border-primary/40'}">${r}</button>`;
    }).join('');

    return `
        <!-- Set number + weight×reps row -->
        <div class="flex items-center gap-md">
            <span class="font-label-lg text-label-lg text-on-surface-variant w-5 shrink-0">${setIdx + 1}</span>
            <div class="flex-1 grid grid-cols-2 gap-3">
                <!-- Weight -->
                <div class="flex flex-col items-center gap-1">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Ağırlık (kg)</span>
                    <div class="flex items-center bg-background shadow-neo rounded-lg border-none w-full justify-between p-0.5">
                        <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-2.5"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-neon-blue hover:bg-gradient-to-r from-neon-purple to-neon-blue/5 active:scale-90 transition-all">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <span class="font-title-lg text-title-lg text-on-surface min-w-[3rem] text-center">${set.weight}</span>
                        <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="2.5"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-neon-blue hover:bg-gradient-to-r from-neon-purple to-neon-blue/5 active:scale-90 transition-all">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>
                <!-- Reps -->
                <div class="flex flex-col items-center gap-1">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Tekrar</span>
                    <div class="flex items-center bg-background shadow-neo rounded-lg border-none w-full justify-between p-0.5">
                        <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-1"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-neon-blue hover:bg-gradient-to-r from-neon-purple to-neon-blue/5 active:scale-90 transition-all">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <span class="font-title-lg text-title-lg text-on-surface min-w-[2rem] text-center">${set.reps}</span>
                        <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="1"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-neon-blue hover:bg-gradient-to-r from-neon-purple to-neon-blue/5 active:scale-90 transition-all">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <!-- RPE Selector -->
        <div class="flex flex-col gap-2">
            <span class="font-label-sm text-label-sm text-on-surface-variant">RPE (Zorluk) — opsiyonel</span>
            <div class="rpe-btn-group flex justify-between items-center">${rpeButtons}</div>
            <p class="text-center font-body-md text-body-md text-on-surface-variant mt-1" id="e1rm-display-${exId}-${setIdx}">
                Tahmini e1RM: ${e1rmDisplay}
            </p>
        </div>
    `;
}"""

new_active_set_html = """function _activeSetHTML(exId, setIdx, set, isCurrent = false) {
    const currentE1RM = calculateE1RM(set.weight, set.reps, set.rpe);
    const isRoughEstimate = set.rpe === null;
    const e1rmDisplay = isRoughEstimate
        ? `<span class="italic">~${currentE1RM}kg</span>`
        : `<span>${currentE1RM}kg</span>`;

    const rpeButtons = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        const btnClass = isSelected 
            ? 'flex-1 py-3 neo-inset rounded-xl font-body-md text-body-md text-primary font-bold bg-primary/5'
            : 'flex-1 py-3 neo-surface rounded-xl font-body-md text-body-md text-text-secondary neo-surface-interactive';
        return `<button data-action="sessionSetRPE" data-ex-id="${exId}" data-set-idx="${setIdx}" data-rpe="${r}" class="${btnClass}">${r}</button>`;
    }).join('');

    const titleText = isCurrent ? 'Şu anki set' : `${set.weight}kg × ${set.reps} reps`;
    const titleClass = isCurrent ? 'text-primary font-semibold' : 'text-on-surface';
    const numBgClass = isCurrent ? '' : 'bg-accent-green/10';
    const numTextClass = isCurrent ? 'text-primary' : 'text-accent-green';
    const rpeLabel = (set.rpe && !isCurrent) ? `<span class="font-label-sm text-label-sm text-outline ml-2" id="rpe-summary-${exId}-${setIdx}">RPE ${set.rpe}</span>` : `<span class="font-label-sm text-label-sm text-outline ml-2" id="rpe-summary-${exId}-${setIdx}"></span>`;

    return `
        <button class="w-full p-4 flex items-center justify-between focus:outline-none" onclick="toggleSet(this)">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 neo-inset-circle flex items-center justify-center ${numBgClass}">
                    <span class="font-title-sm text-title-sm ${numTextClass} font-bold">${setIdx + 1}</span>
                </div>
                <span class="font-body-md text-body-md ${titleClass}" id="set-summary-${exId}-${setIdx}">${titleText}</span>
                ${rpeLabel}
            </div>
            <span class="material-symbols-rounded text-primary transition-transform duration-300 transform ${isCurrent ? 'rotate-180' : ''}" data-icon="expand_more">expand_more</span>
        </button>
        <div class="expandable-content ${isCurrent ? 'expanded' : ''}">
            <div class="expandable-inner px-5 pb-5">
                <!-- Weight Stepper -->
                <div class="flex justify-between items-center mb-6 pt-2">
                    <span class="font-title-sm text-title-sm text-text-primary">Ağırlık (kg)</span>
                    <div class="flex items-center gap-4">
                        <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-2.5" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <span class="font-display-lg text-display-lg w-16 text-center text-on-surface" id="weight-val-${exId}-${setIdx}">${set.weight}</span>
                        <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="2.5" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>
                <!-- Reps Stepper -->
                <div class="flex justify-between items-center mb-6">
                    <span class="font-title-sm text-title-sm text-text-primary">Tekrar</span>
                    <div class="flex items-center gap-4">
                        <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-1" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <span class="font-display-lg text-display-lg w-16 text-center text-on-surface" id="reps-val-${exId}-${setIdx}">${set.reps}</span>
                        <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="1" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>
                <hr class="border-surface-variant mb-6 mx-2">
                <!-- RPE Selection -->
                <div class="mb-6">
                    <p class="font-label-sm text-label-sm text-text-secondary mb-3">RPE (Zorluk) — opsiyonel</p>
                    <div class="rpe-btn-group flex justify-between gap-2">${rpeButtons}</div>
                </div>
                <!-- Actions & e1RM -->
                <div class="flex justify-between items-center mt-2">
                    <div class="neo-inset-pill px-4 py-2 inline-flex items-center">
                        <span class="font-label-sm text-label-sm font-bold text-tertiary" id="e1rm-display-${exId}-${setIdx}">Tahmini e1RM: ${e1rmDisplay}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}"""

content = content.replace(old_active_set_html, new_active_set_html)

with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'w', encoding='utf-8') as f:
    f.write(content)

