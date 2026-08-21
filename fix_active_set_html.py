with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_fn_pattern = r'function _activeSetHTML\(exId, setIdx, set, isCurrent = false\) \{.*?(?=\n\}\n)'
old_fn_match = re.search(old_fn_pattern, content, re.DOTALL)

if not old_fn_match:
    print("Could not find _activeSetHTML")
    exit(1)

old_fn = old_fn_match.group(0) + "\n}"

new_fn = """function _activeSetHTML(exId, setIdx, set, isCurrent = false) {
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
    
    // Icon colors: current set uses primary, completed sets use outline
    const chevronColor = isCurrent ? 'text-primary' : 'text-outline';
    
    // We will expand the current set by default, and collapse the completed sets by default
    const isExpanded = isCurrent; 

    // For completed sets, the inputs should be read-only (opacity-50 pointer-events-none)
    const wrapperClass = isCurrent ? '' : 'opacity-50 pointer-events-none';

    return `
        <button class="w-full p-4 flex items-center justify-between focus:outline-none" onclick="toggleSet(this)">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 neo-inset-circle flex items-center justify-center ${numBgClass}">
                    <span class="font-title-sm text-title-sm ${numTextClass} font-bold">${setIdx + 1}</span>
                </div>
                <span class="font-body-md text-body-md ${titleClass}" id="set-summary-${exId}-${setIdx}">${titleText}</span>
                ${rpeLabel}
            </div>
            <span class="material-symbols-outlined ${chevronColor} transition-transform duration-300 transform ${isExpanded ? 'rotate-180' : ''}" data-icon="expand_more">expand_more</span>
        </button>
        <div class="expandable-content ${isExpanded ? 'expanded' : ''}">
            <div class="expandable-inner px-5 pb-5">
                <div class="${wrapperClass}">
                    <!-- Weight Stepper -->
                    <div class="flex justify-between items-center mb-6 pt-2">
                        <span class="font-title-sm text-title-sm text-text-primary">Ağırlık (kg)</span>
                        <div class="flex items-center gap-4">
                            <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-2.5" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="remove">remove</span>
                            </button>
                            <span class="font-display-lg text-display-lg w-16 text-center text-on-surface" id="weight-val-${exId}-${setIdx}">${set.weight}</span>
                            <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="2.5" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="add">add</span>
                            </button>
                        </div>
                    </div>
                    <!-- Reps Stepper -->
                    <div class="flex justify-between items-center mb-6">
                        <span class="font-title-sm text-title-sm text-text-primary">Tekrar</span>
                        <div class="flex items-center gap-4">
                            <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-1" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="remove">remove</span>
                            </button>
                            <span class="font-display-lg text-display-lg w-16 text-center text-on-surface" id="reps-val-${exId}-${setIdx}">${set.reps}</span>
                            <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="1" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="add">add</span>
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
        </div>
    `;
}"""

content = content.replace(old_fn, new_fn)

with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated _activeSetHTML")
