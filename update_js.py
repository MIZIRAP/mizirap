with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update _renderSessionExercises
old_render = """        const card = document.createElement('section');
        card.className = 'bg-background shadow-neo rounded-[32px] shadow-sm border-none overflow-hidden';
        card.id = `session-card-${ex.id}`;

        card.innerHTML = `
            <!-- Accordion Header -->
            <button class="w-full flex items-center gap-sm p-md text-left hover:bg-background shadow-neo transition-colors"
                    data-action="sessionToggleExAccordion" data-ex-id="${ex.id}">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue-container/20 flex items-center justify-center text-neon-blue shrink-0">
                    <span class="material-symbols-rounded" style="font-variation-settings:'FILL' 1">fitness_center</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h2 class="font-title-lg text-title-lg text-on-surface truncate">${escHtml(ex.name)}</h2>
                    <p class="font-body-md text-body-md text-on-surface-variant">${prevLine}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">${totalSets} Set</span>
                    <span class="material-symbols-rounded text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}" style="font-size:20px" id="chevron-${ex.id}">expand_more</span>
                </div>
            </button>
            <!-- Accordion Body -->
            <div id="accordion-body-${ex.id}" class="${isOpen ? '' : 'hidden'}">
                <div class="flex flex-col" id="sets-container-${ex.id}"></div>
            </div>
        `;

        container.appendChild(card);
        if (isOpen) _renderSets(ex.id);
    });"""

new_render = """        const card = document.createElement('div');
        card.className = 'flex flex-col gap-4';
        card.id = `session-card-${ex.id}`;

        card.innerHTML = `
            <!-- Exercise Header Card -->
            <section class="neo-surface p-5 flex items-center justify-between cursor-pointer neo-surface-interactive"
                     data-action="sessionToggleExAccordion" data-ex-id="${ex.id}">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 neo-inset-circle flex items-center justify-center text-primary">
                        <span class="material-symbols-rounded text-2xl" style="font-variation-settings:'FILL' 1">fitness_center</span>
                    </div>
                    <div class="flex flex-col">
                        <h2 class="font-body-md text-body-md text-on-surface font-semibold">${escHtml(ex.name)}</h2>
                        <p class="font-label-sm text-label-sm text-[#585a68]">${prevLine}</p>
                    </div>
                </div>
                <div class="w-10 h-10 neo-inset-circle flex items-center justify-center text-outline">
                    <span class="material-symbols-rounded transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}" id="chevron-${ex.id}">arrow_forward_ios</span>
                </div>
            </section>
            
            <!-- Sets Container -->
            <section id="accordion-body-${ex.id}" class="flex flex-col gap-4 ${isOpen ? '' : 'hidden'}">
                <div class="flex flex-col gap-4" id="sets-container-${ex.id}"></div>
            </section>
        `;

        container.appendChild(card);
        if (isOpen) _renderSets(ex.id);
    });"""

content = content.replace(old_render, new_render)

with open('/Users/boratektas/Desktop/mizirap/activeSession.js', 'w', encoding='utf-8') as f:
    f.write(content)
