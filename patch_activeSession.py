import re

with open('activeSession.js', 'r') as f:
    content = f.read()

# 1. Add calculateE1RM
content = content.replace(
    '// ─── Module state ──────────────────────────────────────────────────────────',
    '''// ─── Utilities ─────────────────────────────────────────────────────────────
function calculateE1RM(weight, reps, rpe) {
    if (!weight || !reps) return 0;
    const rir = rpe !== null ? (10 - rpe) : 0;
    const estimatedMaxReps = reps + rir;
    return Math.round(weight * (1 + estimatedMaxReps / 30) * 10) / 10;
}

// ─── Module state ──────────────────────────────────────────────────────────'''
)

# 2. _buildExState
content = re.sub(
    r"status:\s*draft\?\.status\s*\?\?\s*'pending'(\s*//\s*'pending' \| 'draft' \| 'completed')?",
    "",
    content
)
# Clean up trailing comma on previous line if needed
content = content.replace("rpe:    draft?.rpe    ?? null,\n            });", "rpe:    draft?.rpe    ?? null\n            });")

# 3. _renderSessionExercises
content = re.sub(
    r"const completedCount = state\.sets\.filter\(s => s\.status === 'completed'\)\.length;\n\s*const totalSets = state\.sets\.length;",
    r"const totalSets = state.sets.length;",
    content
)
content = re.sub(
    r"<span class=\"font-label-sm text-label-sm \$\{completedCount === totalSets && completedCount > 0 \? 'text-tertiary' : 'text-on-surface-variant'\}\">\$\{completedCount\}/\$\{totalSets\}</span>",
    r"<span class=\"font-label-sm text-label-sm text-on-surface-variant\">${totalSets} Set</span>",
    content
)

# 4. _renderSets
render_sets_old = """    state.sets.forEach((set, setIdx) => {
        const setEl = document.createElement('div');
        setEl.id = `set-row-${exId}-${setIdx}`;

        if (set.status === 'completed') {
            setEl.className = 'flex items-center gap-sm px-md py-2.5 border-t border-surface-container-high bg-surface-container/30';
            setEl.innerHTML = _completedSetHTML(exId, setIdx, set);
        } else {
            const isActive = state.sets.slice(0, setIdx).every(s => s.status === 'completed');
            if (isActive) {
                setEl.className = 'flex flex-col gap-md px-md py-md border-t border-surface-container-high bg-surface-container-low/40 border-l-4 border-l-primary';
                setEl.innerHTML = _activeSetHTML(exId, setIdx, set);
            } else {
                setEl.className = 'flex items-center gap-sm px-md py-2.5 border-t border-surface-container-high opacity-40';
                setEl.innerHTML = _pendingSetHTML(setIdx, set);
            }
        }

        container.appendChild(setEl);
    });"""

render_sets_new = """    state.sets.forEach((set, setIdx) => {
        const setEl = document.createElement('div');
        setEl.id = `set-row-${exId}-${setIdx}`;
        setEl.className = 'flex flex-col gap-md px-md py-md border-t border-surface-container-high bg-surface-container-low/40 border-l-4 border-l-primary';
        setEl.innerHTML = _activeSetHTML(exId, setIdx, set);
        container.appendChild(setEl);
    });"""

content = content.replace(render_sets_old, render_sets_new)

# 5. HTML Templates
html_start_idx = content.find('// ─── HTML templates ────────────────────────────────────────────────────────')
html_end_idx = content.find('// ─── User actions (window.* for HTML onclick) ──────────────────────────────')

html_templates_old = content[html_start_idx:html_end_idx]

html_templates_new = """// ─── HTML templates ────────────────────────────────────────────────────────

function _activeSetHTML(exId, setIdx, set) {
    const currentE1RM = calculateE1RM(set.weight, set.reps, set.rpe);
    const isRoughEstimate = set.rpe === null;
    const e1rmDisplay = isRoughEstimate
        ? `<span class="italic text-on-surface-variant/60">~${currentE1RM}kg</span>`
        : `<span>${currentE1RM}kg</span>`;

    const rpeButtons = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        return `<button onclick="sessionSetRPE('${exId}', ${setIdx}, ${r})"
            class="w-10 h-10 rounded-full border transition-all duration-150 font-label-lg text-label-lg active:scale-95
                ${isSelected
                    ? 'bg-primary text-on-primary border-transparent shadow-sm scale-110 ring-2 ring-primary/30 ring-offset-1 ring-offset-surface-container-low'
                    : 'bg-surface text-on-surface-variant border-surface-variant hover:border-primary/40'}">${r}</button>`;
    }).join('');

    return `
        <!-- Set number + weight×reps row -->
        <div class="flex items-center gap-md">
            <span class="font-label-lg text-label-lg text-on-surface-variant w-5 shrink-0">${setIdx + 1}</span>
            <div class="flex-1 grid grid-cols-2 gap-3">
                <!-- Weight -->
                <div class="flex flex-col items-center gap-1">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Ağırlık (kg)</span>
                    <div class="flex items-center bg-surface rounded-lg border border-surface-variant/30 w-full justify-between p-0.5">
                        <button onclick="sessionStepWeight('${exId}', ${setIdx}, -2.5)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">remove</span>
                        </button>
                        <span class="font-title-lg text-title-lg text-on-surface min-w-[3rem] text-center">${set.weight}</span>
                        <button onclick="sessionStepWeight('${exId}', ${setIdx}, 2.5)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">add</span>
                        </button>
                    </div>
                </div>
                <!-- Reps -->
                <div class="flex flex-col items-center gap-1">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Tekrar</span>
                    <div class="flex items-center bg-surface rounded-lg border border-surface-variant/30 w-full justify-between p-0.5">
                        <button onclick="sessionStepReps('${exId}', ${setIdx}, -1)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">remove</span>
                        </button>
                        <span class="font-title-lg text-title-lg text-on-surface min-w-[2rem] text-center">${set.reps}</span>
                        <button onclick="sessionStepReps('${exId}', ${setIdx}, 1)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">add</span>
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
}

"""

content = content.replace(html_templates_old, html_templates_new)

# 6. User Actions
content = content.replace("    if (!set || set.status === 'completed') return;", "    if (!set) return;")
content = content.replace("_debounceSaveDraft", "_debounceSaveSet")

# Remove sessionCompleteSet
content = re.sub(r"window\.sessionCompleteSet = async function\(exId, setIdx\) \{[\s\S]*?\};\n", "", content)

# 7. Add _refreshE1RMDisplay
e1rm_refresh = """function _refreshE1RMDisplay(exId, setIdx, set) {
    const el = document.getElementById(`e1rm-display-${exId}-${setIdx}`);
    if (!el) return;
    const isRough = set.rpe === null;
    const val = calculateE1RM(set.weight, set.reps, set.rpe);
    el.innerHTML = isRough
        ? `Tahmini e1RM: <span class="italic text-on-surface-variant/60">~${val}kg</span>`
        : `Tahmini e1RM: <span>${val}kg</span>`;
}"""

content = content.replace(
    "function _refreshRPEButtons",
    e1rm_refresh + "\n\nfunction _refreshRPEButtons"
)

# Call _refreshE1RMDisplay inside stepper methods
content = content.replace("_refreshWeightRepsDisplay(exId, setIdx, set);\n    _debounceSaveSet(exId, setIdx);", "_refreshWeightRepsDisplay(exId, setIdx, set);\n    _refreshE1RMDisplay(exId, setIdx, set);\n    _debounceSaveSet(exId, setIdx);")
content = content.replace("_refreshRPEButtons(exId, setIdx, set);\n    _debounceSaveSet(exId, setIdx);", "_refreshRPEButtons(exId, setIdx, set);\n    _refreshE1RMDisplay(exId, setIdx, set);\n    _debounceSaveSet(exId, setIdx);")

# 8. sessionAddSet
content = re.sub(
    r"rpe:\s*null,\n\s*status:\s*'pending'",
    r"rpe:    null",
    content
)

# 9. finishSession - remove auto-completion logic and status from mapping
content = re.sub(
    r"// Auto-complete pending sets\n\s*for \(const set of state\.sets\) \{\n\s*if \(set\.status !== 'completed'\) \{\n\s*set\.status = 'completed';\n\s*\}\n\s*\}",
    "",
    content
)
content = re.sub(
    r"rpe:\s*s\.rpe,\n\s*status:\s*s\.status",
    r"rpe:    s.rpe",
    content
)

# 10. _updateExAccordionHeader
content = re.sub(
    r"const completedCount = state\.sets\.filter\(s => s\.status === 'completed'\)\.length;\n\s*const totalSets = state\.sets\.length;",
    r"const totalSets = state.sets.length;",
    content
)
content = re.sub(
    r"counterEl\.textContent = `\$\{completedCount\}/\$\{totalSets\}`;",
    r"counterEl.textContent = `${totalSets} Set`;",
    content
)
content = re.sub(
    r"counterEl\.className = `font-label-sm text-label-sm \$\{completedCount === totalSets && completedCount > 0 \? 'text-tertiary' : 'text-on-surface-variant'\}`;",
    r"counterEl.className = `font-label-sm text-label-sm text-on-surface-variant`;",
    content
)

# 11. _debounceSaveSet and _persistSet
content = re.sub(r"if \(set && set\.status !== 'completed'\) \{", "if (set) {", content)
content = content.replace("async function _persistSet(exId, setIdx, set, status) {", "async function _persistSet(exId, setIdx, set) {")
content = content.replace("_persistSet(exId, setIdx, set, 'draft');", "_persistSet(exId, setIdx, set);")
content = re.sub(
    r"rpe:\s*s\.rpe \?\? null,\n\s*status:\s*s\.status",
    r"rpe:    s.rpe ?? null",
    content
)


with open('activeSession.js', 'w') as f:
    f.write(content)

