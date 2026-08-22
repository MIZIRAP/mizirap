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
        splitCard.className = `split-card w-full max-w-[342px] mx-auto flex flex-col items-center ${isSplitOpen ? 'expanded' : ''}`;
        
        const splitInitial = (split.name || 'S').charAt(0).toUpperCase();
        
        let daysHtml = '';
        if (!split.days || split.days.length === 0) {
            daysHtml = `
            <div class="flex flex-col items-center justify-center py-8 opacity-40">
                <span class="material-symbols-outlined text-on-surface-variant mb-2">calendar_today</span>
                <p class="font-label-sm text-label-sm text-on-surface-variant">Henüz gün eklenmemiş</p>
            </div>
            `;
        } else {
            daysHtml = '<div class="flex flex-col w-full items-center">';
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
                    exHtml = `<div class="flex flex-col gap-3 w-full items-center ex-list" id="ex-list-${split.id}-${dayIdx}">`;
                    day.exercises.forEach((ex, exIdx) => {
                        const exAccordionKey = `${split.id}-${dayIdx}-${exIdx}`;
                        const isExOpen = _openExAccordions.has(exAccordionKey);
                        const initial = (ex.name || 'E').charAt(0).toUpperCase();
                        const sets = ex.defaultSets || 3;
                        
                        exHtml += `
                        <div class="exercise-card w-[282px] flex flex-col items-center ${isExOpen ? 'expanded' : ''} ex-drag-item" data-ex-idx="${exIdx}" data-split-id="${split.id}" data-day-idx="${dayIdx}">
                            <div class="accordion-header w-[282px] h-[56px] bg-[#E8EAF0] rounded-[12px] p-3 flex items-center justify-between cursor-pointer transition-all z-20 relative" style="box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.6);" onclick="toggleMizAccordion(this, '${exAccordionKey}', 'ex')">
                                <div class="flex items-center gap-3">
                                    <div class="w-[40px] h-[40px] bg-[#E8EAF0] rounded-full flex items-center justify-center text-[#712AE2] font-bold text-[16px] shrink-0" style="box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.08), inset -2px -2px 4px rgba(255, 255, 255, 0.6);">${initial}</div>
                                    <div class="flex flex-col">
                                        <h4 class="font-semibold text-[#181C20] text-[14px] leading-[21px] tracking-[0.7px] drag-handle active:cursor-grabbing select-none">${ex.name}</h4>
                                        <p class="font-normal text-[#585A68] text-[12px] leading-[17px] mt-[-1px]" id="sets-lbl-${split.id}-${dayIdx}-${exIdx}">${sets} set</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <span class="material-symbols-rounded text-[#1E293B] text-[16px] transition-transform chevron">expand_more</span>
                                    <button class="p-1 transition-colors" data-action="removeExerciseFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" onclick="event.stopPropagation()">
                                        <span class="material-symbols-rounded text-[#BA1A1A] text-[16px] pointer-events-none">delete</span>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Ex Content -->
                            <div class="accordion-content w-[250px] bg-transparent pt-3 pb-3 flex flex-col gap-2 relative z-10 transition-all overflow-hidden ${isExOpen ? 'expanded' : ''}" style="margin-top: 0px; ${isExOpen ? 'max-height: 500px;' : ''}">
                                <div class="flex items-center gap-4 w-[160px] h-[40px] mx-auto mt-2">
                                    <button data-action="changeExerciseSets" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="-1" class="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.002)]" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.6);">
                                        <div class="w-[14px] h-[2px] bg-[#5B5D6D] pointer-events-none"></div>
                                    </button>
                                    <span class="font-bold text-[24px] leading-[29px] tracking-[-0.48px] text-[#000000] min-w-[40px] text-center">${sets}</span>
                                    <button data-action="changeExerciseSets" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="1" class="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.002)]" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.6);">
                                        <span class="material-symbols-rounded text-[#5B5D6D] text-[14px] font-bold pointer-events-none">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                    exHtml += `</div>`;
                }
                
                daysHtml += `
                <div class="day-card w-full flex flex-col items-center ${isDayOpen ? 'expanded' : ''}">
                    <!-- Day Header -->
                    <div class="accordion-header w-[300px] h-[56px] bg-[#E8EAF0] rounded-[12px] px-4 flex items-center justify-between cursor-pointer transition-all z-30 relative" style="box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.6); ${dayIdx > 0 ? 'margin-top: 12px;' : ''}" onclick="toggleMizAccordion(this, '${dayAccordionKey}', 'day')">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-rounded text-[#C7C4D7] text-[16px] cursor-grab day-drag-handle shrink-0">drag_indicator</span>
                            <div class="bg-[#E8EAF0] px-2 py-1 rounded-[4px] flex items-center justify-center shrink-0" style="box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.08), inset -2px -2px 4px rgba(255, 255, 255, 0.6);">
                                <span class="text-[#712AE2] font-normal text-[10px] leading-[15px]">Gün ${dayIdx + 1}</span>
                            </div>
                            <h3 class="font-medium text-[#181C20] text-[16px] leading-[24px] truncate select-none">${day.name}</h3>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="material-symbols-rounded text-[#1E293B] text-[16px] transition-transform chevron">expand_more</span>
                            <button class="p-1 transition-colors" data-action="removeDayFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" onclick="event.stopPropagation()">
                                <span class="material-symbols-rounded text-[#BA1A1A] text-[16px] pointer-events-none">delete</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Day Content -->
                    <div class="accordion-content w-[294px] bg-[#E8EAF0] rounded-[8px] pt-[24px] pb-[12px] px-[12px] relative z-20 flex flex-col items-center transition-all overflow-hidden ${isDayOpen ? 'expanded' : ''}" style="margin-top: -12px; ${isDayOpen ? 'max-height: 2000px;' : ''}">
                        ${exHtml}
                        <!-- Add Exercise Button -->
                        <button data-action="openExercisePickerForSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" class="mt-4 w-[156px] h-[40px] bg-[#F7F9FF] rounded-full flex items-center justify-center active:scale-95 transition-transform mx-auto shrink-0" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                            <span class="font-bold text-[#1E293B] text-[12px] leading-[16px] tracking-[0.6px] uppercase pointer-events-none">Hareket Ekle</span>
                        </button>
                    </div>
                </div>
                `;
            });
            daysHtml += `</div>`;
        }
        
        let splitHeaderStyles = 'box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.6);';
        let splitHeaderWrapperClass = 'accordion-header w-[342px] h-[72px] rounded-[24px] relative z-40 transition-all cursor-pointer';
        
        // Gradient border magic
        if (isSplitOpen) {
            splitHeaderWrapperClass += ' p-[2px] bg-gradient-to-r from-[#4648D4] to-[#20E0B0]';
        } else {
            splitHeaderWrapperClass += ' bg-[#E8EAF0]';
        }

        splitCard.innerHTML = `
            <!-- Split Header Wrapper -->
            <div class="${splitHeaderWrapperClass}" style="${isSplitOpen ? 'box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.6);' : splitHeaderStyles}" onclick="toggleMizAccordion(this, '${split.id}', 'split')">
                <div class="w-full h-full bg-[#E8EAF0] rounded-[22px] px-5 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-[48px] h-[48px] bg-[#E8EAF0] rounded-full flex items-center justify-center text-[#4648D4] font-bold text-[14px] leading-[21px] tracking-[0.7px] shrink-0" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.6);">
                            ${splitInitial}
                        </div>
                        <h2 class="font-bold text-[#181C20] text-[20px] leading-[26px] select-none" style="font-family: 'Plus Jakarta Sans', sans-serif;">${split.name}</h2>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="material-symbols-rounded text-[#1E293B] text-[16px] transition-transform chevron">expand_more</span>
                    </div>
                </div>
            </div>
            
            <!-- Split Content -->
            <div class="accordion-content w-[342px] bg-[#E8EAF0] rounded-[16px] pt-[32px] px-[16px] pb-[16px] relative z-30 flex flex-col items-center transition-all overflow-hidden ${isSplitOpen ? 'expanded' : ''}" style="margin-top: -16px; ${isSplitOpen ? 'max-height: 5000px;' : ''}">
                ${daysHtml}
                <!-- Add Day Button -->
                <div class="w-full flex justify-center mt-6 mb-2">
                    <button data-action="addDayToSplit" data-split-id="${split.id}" class="w-[127px] h-[40px] bg-[#F7F9FF] rounded-full flex items-center justify-center active:scale-95 transition-transform shrink-0" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                        <span class="font-bold text-[#1E293B] text-[12px] leading-[16px] tracking-[0.6px] uppercase pointer-events-none">Gün Ekle</span>
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
