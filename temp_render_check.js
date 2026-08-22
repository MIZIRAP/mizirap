function renderSplitEditView() {
    const mainContainer = document.getElementById('split-edit-main-container');
    if(!mainContainer) return;
    
    if(splits.length === 0) {
        mainContainer.innerHTML = `<div class="flex flex-col items-center justify-center py-8 opacity-40">
            <span class="material-symbols-outlined text-on-surface-variant mb-2">calendar_today</span>
            <p class="font-label-sm text-label-sm text-on-surface-variant">Henüz program eklenmemiş</p>
        </div>`;
        return;
    }
    
    mainContainer.innerHTML = '';
    
    splits.forEach(split => {
        const isSplitOpen = _openSplitAccordions.has(split.id);
        const splitCard = document.createElement('div');
        splitCard.className = `split-card ${isSplitOpen ? 'expanded' : ''}`;
        
        const splitInitial = split.name.charAt(0).toUpperCase();
        
        let daysHtml = '';
        if (!split.days || split.days.length === 0) {
            daysHtml = `
            <div class="flex flex-col items-center justify-center py-8 opacity-40">
                <span class="material-symbols-outlined text-on-surface-variant mb-2">calendar_today</span>
                <p class="font-label-sm text-label-sm text-on-surface-variant">Henüz gün eklenmemiş</p>
            </div>
            `;
        } else {
            daysHtml = '<div class="flex flex-col gap-4">';
            split.days.forEach((day, dayIdx) => {
                const dayAccordionKey = `${split.id}-${dayIdx}`;
                const isDayOpen = _openDayAccordions.has(dayAccordionKey);
                
                let exHtml = '';
                if (!day.exercises || day.exercises.length === 0) {
                    exHtml = `
                    <div class="flex flex-col items-center justify-center py-6 opacity-40">
                        <span class="material-symbols-outlined text-on-surface-variant mb-2">fitness_center</span>
                        <p class="font-label-sm text-label-sm text-on-surface-variant">Bu gün için hareket planlanmamış</p>
                    </div>
                    `;
                } else {
                    exHtml = `<div class="flex flex-col gap-3 ex-list" id="ex-list-${split.id}-${dayIdx}">`;
                    day.exercises.forEach((ex, exIdx) => {
                        const exAccordionKey = `${split.id}-${dayIdx}-${exIdx}`;
                        const isExOpen = _openExAccordions.has(exAccordionKey);
                        const initial = ex.name.charAt(0).toUpperCase();
                        const sets = ex.defaultSets || 3;
                        
                        exHtml += `
                        <div class="exercise-card pl-8 ${isExOpen ? 'expanded' : ''} ex-drag-item" data-ex-idx="${exIdx}" data-split-id="${split.id}" data-day-idx="${dayIdx}">
                            <div class="accordion-header neo-surface-small p-3 flex items-center justify-between cursor-pointer neo-button transition-all" onclick="toggleMizAccordion(this, '${exAccordionKey}', 'ex')">
                                <div class="flex items-center gap-3">
                                    <div class="neo-inset-small w-10 h-10 flex items-center justify-center text-tertiary font-bold rounded-full">${initial}</div>
                                    <div>
                                        <h4 class="font-title-sm text-title-sm text-on-surface drag-handle active:cursor-grabbing">${ex.name}</h4>
                                        <p class="font-label-sm text-label-sm text-text-secondary" id="sets-lbl-${split.id}-${dayIdx}-${exIdx}">${sets} set</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-secondary chevron">expand_more</span>
                                    <button class="p-1 text-error hover:text-on-error-container transition-colors" data-action="removeExerciseFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" onclick="event.stopPropagation()">
                                        <span class="material-symbols-outlined text-sm pointer-events-none">delete</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="accordion-content pt-2 pl-12 pr-2 pb-2 flex flex-col gap-2 ${isExOpen ? 'expanded' : ''}" style="${isExOpen ? 'max-height: 2000px;' : ''}">
                                <div class="flex flex-col gap-2 py-2">
                                    <div class="flex items-center justify-between gap-4 mb-2">
                                      <div class="flex items-center gap-3">
                                        <div class="flex flex-col">
                                          <div class="flex items-center gap-2 justify-center">
                                            <button data-action="changeExerciseSets" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="-1" class="neo-inset-small w-6 h-6 flex items-center justify-center text-primary neo-button"><span class="material-symbols-outlined text-sm pointer-events-none">remove</span></button>
                                            <span class="font-title-sm text-on-surface min-w-[40px] text-center">${sets}</span>
                                            <button data-action="changeExerciseSets" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="1" class="neo-inset-small w-6 h-6 flex items-center justify-center text-primary neo-button"><span class="material-symbols-outlined text-sm pointer-events-none">add</span></button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                    exHtml += `</div>`;
                }
                
                daysHtml += `
                <div class="day-card pl-4 ${isDayOpen ? 'expanded' : ''}">
                    <div class="accordion-header neo-surface-small p-4 flex items-center justify-between cursor-pointer neo-button transition-all z-20 relative" onclick="toggleMizAccordion(this, '${dayAccordionKey}', 'day')">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-outline-variant cursor-grab day-drag-handle">drag_indicator</span>
                            <div class="neo-inset-small px-2 py-1 flex items-center justify-center rounded text-tertiary font-title-sm text-[10px]">Gün ${dayIdx + 1}</div>
                            <div>
                                <h3 class="font-body-md text-body-md text-on-surface">${day.name}</h3>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-tertiary chevron">expand_more</span>
                            <button class="p-1 text-error hover:text-on-error-container transition-colors" data-action="removeDayFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" onclick="event.stopPropagation()">
                                <span class="material-symbols-outlined text-sm pointer-events-none">delete</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="accordion-content neo-inset-small mt-[-12px] pt-6 pb-3 px-3 relative z-10 ${isDayOpen ? 'expanded' : ''}" style="${isDayOpen ? 'max-height: 2000px;' : ''}">
                        ${exHtml}
                        <button data-action="openExercisePickerForSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" class="mt-2 py-2 text-center w-full font-title-sm text-sm text-tertiary flex items-center justify-center gap-2 hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-sm pointer-events-none">add</span> Hareket Ekle
                        </button>
                    </div>
                </div>
                `;
            });
            daysHtml += `</div>`;
        }
        
        splitCard.innerHTML = `
            <div class="accordion-header neo-surface p-5 flex items-center justify-between cursor-pointer neo-button transition-all z-30 relative" onclick="toggleMizAccordion(this, '${split.id}', 'split')">
                <div class="flex items-center gap-4">
                    <div class="neo-inset w-12 h-12 flex items-center justify-center rounded-full text-primary font-bold text-title-sm">${splitInitial}</div>
                    <div>
                        <h2 class="font-headline-md text-headline-md text-on-surface">${split.name}</h2>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary chevron">expand_more</span>
                    <button class="p-1 text-secondary hover:text-primary transition-colors" data-action="deleteSplit" data-split-id="${split.id}" onclick="event.stopPropagation()">
                        <span class="material-symbols-outlined pointer-events-none text-error">delete</span>
                    </button>
                </div>
            </div>
            
            <div class="accordion-content neo-inset mt-[-16px] pt-8 pb-4 px-4 relative z-20 ${isSplitOpen ? 'expanded' : ''}" style="${isSplitOpen ? 'max-height: 2000px;' : ''}">
                ${daysHtml}
                <div class="text-center mt-4 mb-2">
                    <button data-action="addDayToSplit" data-split-id="${split.id}" class="font-title-sm text-title-sm text-primary neo-surface-small px-4 py-2 rounded flex items-center justify-center gap-2 mx-auto neo-button">
                        <span class="material-symbols-outlined text-sm pointer-events-none">add</span> Gün Ekle
                    </button>
                </div>
            </div>
        `;
        
        mainContainer.appendChild(splitCard);
        
        if (split.days) {
            split.days.forEach((day, dayIdx) => {
                const listEl = splitCard.querySelector(`#ex-list-${split.id}-${dayIdx}`);
                if(listEl) _initExSortable(listEl, split.id, dayIdx);
            });
        }
    });
}
