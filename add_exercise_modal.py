import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I will insert the new bottom sheet right after the exercise-bottom-sheet block
# Let's find a safe injection point. 
# `<div id="exercise-bottom-sheet"` ends at some point.
# I'll just insert it before `<!-- ================= DİZİ / FİLM ================= -->` which is a major section break.

insertion_point = html.find('<!-- ================= DİZİ / FİLM ================= -->')
if insertion_point == -1:
    print("Could not find insertion point!")
    exit(1)

new_modal_html = """
    <!-- Add Exercise Bottom Sheet -->
    <div id="add-exercise-bottom-sheet" class="fixed inset-0 bg-black/30 z-[100] flex items-end opacity-0 pointer-events-none transition-opacity duration-300" onclick="closeAddExerciseSheetOnOutsideClick(event)">
        <div class="bg-background shadow-neo rounded-t-[24px] w-full max-w-md mx-auto shadow-2xl transform transition-transform translate-y-full duration-300 relative max-h-[90vh] flex flex-col" id="add-exercise-bottom-sheet-content">
            <!-- Drag Handle -->
            <div class="w-full flex justify-center pt-4 pb-2 cursor-pointer" onclick="closeAddExerciseSheet()">
                <div class="w-12 h-1.5 bg-outline-variant rounded-full opacity-60"></div>
            </div>
            
            <!-- Header -->
            <div class="px-6 pb-4 flex justify-between items-center z-30">
                <h2 class="font-headline-md text-on-surface text-xl font-bold">Hareket Ekle</h2>
                <button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant shadow-neo-inset hover:bg-surface-container-low transition-colors group" onclick="closeAddExerciseSheet()">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            
            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
                <form id="add-exercise-form" class="space-y-6 flex flex-col pb-8">
                    <!-- 1. Exercise Name Input -->
                    <div class="flex flex-col gap-2">
                        <label class="font-title-sm text-on-surface-variant text-sm uppercase tracking-wider pl-1" for="newExerciseName">Hareket Adı</label>
                        <div class="relative">
                            <input class="w-full h-14 bg-background focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 font-body-md text-on-surface placeholder:text-outline-variant outline-none transition-shadow shadow-neo-inset border-none" id="newExerciseName" placeholder="Örn: Flat Barbell Bench Press" type="text" required>
                        </div>
                    </div>
                    
                    <!-- 2. Muscle Group Chips Grid -->
                    <div class="flex flex-col gap-3">
                        <label class="font-title-sm text-on-surface-variant text-sm uppercase tracking-wider pl-1">Ana Kas Grubu</label>
                        <div class="grid grid-cols-3 gap-3">
                            <label class="cursor-pointer group">
                                <input checked class="peer sr-only" name="newExerciseMuscle" type="radio" value="Göğüs">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Göğüs</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Sırt">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Sırt</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Omuz">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Omuz</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Bacak">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Bacak</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Biceps">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Biceps</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Triceps">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Triceps</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Karın">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Karın</div>
                            </label>
                            <label class="cursor-pointer group">
                                <input class="peer sr-only" name="newExerciseMuscle" type="radio" value="Kalça">
                                <div class="h-12 flex items-center justify-center rounded-xl bg-background shadow-neo text-on-surface font-body-md peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue peer-checked:text-white transition-all duration-200">Kalça</div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>
            
            <!-- Bottom Action Bar -->
            <div class="absolute bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-md rounded-t-xl z-40 border-t border-surface-variant/30 flex gap-4">
                <button class="flex-1 h-[56px] rounded-full border border-outline-variant bg-transparent font-title-sm text-on-surface-variant hover:bg-surface-container-low active:bg-surface-variant transition-colors flex items-center justify-center" type="button" onclick="closeAddExerciseSheet()">
                    Vazgeç
                </button>
                <button class="flex-[1.5] h-[56px] bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-full flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-primary/20" type="button" onclick="saveNewExercise()">
                    <span class="font-label-md text-label-md text-body-lg font-body-lg">Kaydet</span>
                    <span class="material-symbols-rounded icon-md">check_circle</span>
                </button>
            </div>
        </div>
    </div>
"""

new_html = html[:insertion_point] + new_modal_html + "\n" + html[insertion_point:]

# 2. Add the JS functions to open/close this new modal and to save the exercise
# The best place is next to openExerciseSheet / closeExerciseSheet in index.html

js_insertion_point = new_html.find('function closeExerciseSheet() {')
if js_insertion_point == -1:
    print("Could not find JS insertion point!")
    exit(1)

new_js = """
        function openAddExerciseSheet() {
            const sheet = document.getElementById('add-exercise-bottom-sheet');
            const sheetContent = document.getElementById('add-exercise-bottom-sheet-content');
            
            document.getElementById('newExerciseName').value = '';
            
            sheet.classList.remove('pointer-events-none');
            sheet.classList.add('opacity-100');
            sheet.classList.remove('opacity-0');
            
            setTimeout(() => {
                sheetContent.classList.remove('translate-y-full');
                sheetContent.classList.add('translate-y-0');
            }, 10);
        }

        function closeAddExerciseSheet() {
            const sheet = document.getElementById('add-exercise-bottom-sheet');
            const sheetContent = document.getElementById('add-exercise-bottom-sheet-content');
            
            sheetContent.classList.add('translate-y-full');
            sheetContent.classList.remove('translate-y-0');
            
            setTimeout(() => {
                sheet.classList.remove('opacity-100');
                sheet.classList.add('opacity-0');
                sheet.classList.add('pointer-events-none');
            }, 300);
        }

        function closeAddExerciseSheetOnOutsideClick(event) {
            if (event.target.id === 'add-exercise-bottom-sheet') {
                closeAddExerciseSheet();
            }
        }
        
        function saveNewExercise() {
            const nameInput = document.getElementById('newExerciseName');
            const name = nameInput.value.trim();
            if(!name) {
                alert('Lütfen hareket adını girin');
                return;
            }
            
            const muscleGroup = document.querySelector('input[name="newExerciseMuscle"]:checked').value;
            
            // Create the exercise item HTML dynamically
            const letter = name.charAt(0).toUpperCase();
            
            const newExerciseHtml = `
                <div onclick="openExerciseSheet(this, '${name}')" class="neo-surface p-5 flex items-center justify-between neo-button transition-all exercise-item mb-4 cursor-pointer">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full neo-inset flex items-center justify-center bg-surface-light text-primary font-bold">${letter}</div>
                        <div>
                            <h4 class="font-semibold text-body-md text-on-surface tracking-tight">${name}</h4>
                            <p class="text-xs text-on-surface-variant capitalize">Ana Kas: ${muscleGroup}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="p-2 text-on-surface-variant hover:text-primary transition-colors exercise-fav-btn flex items-center justify-center" data-action="toggleFav">
                            <span class="material-symbols-rounded text-xl">star</span>
                        </button>
                        <span class="material-symbols-rounded text-on-surface-variant">chevron_right</span>
                    </div>
                </div>
            `;
            
            // Add it to the correct category in the DOM
            const container = document.getElementById('exercise-list-container');
            const categoryGroups = container.querySelectorAll('.exercise-category');
            let targetGroup = null;
            
            categoryGroups.forEach(group => {
                if (group.getAttribute('data-category') === muscleGroup) {
                    targetGroup = group;
                }
            });
            
            if (targetGroup) {
                const list = targetGroup.querySelector('.flex.flex-col.gap-2');
                list.insertAdjacentHTML('beforeend', newExerciseHtml);
            } else {
                // Should not happen since all categories are defined
                alert('Kategori bulunamadı!');
            }
            
            // Note: Since this is frontend only and the user just asked for the UI, 
            // the added exercise won't persist across full page reloads without backend logic.
            // But this accomplishes the requested feature in the current session.
            
            closeAddExerciseSheet();
            
            // Re-apply filters so it shows up if filters are active
            applyExerciseFilters();
        }

"""

new_html = new_html[:js_insertion_point] + new_js + new_html[js_insertion_point:]

# 3. Hook the + button to openAddExerciseSheet()
# The header button is currently:
# <button class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button">
#    <span class="material-symbols-rounded text-primary">add</span>
# </button>

new_html = new_html.replace(
    '''<button class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button">
                    <span class="material-symbols-rounded text-primary">add</span>
                </button>''',
    '''<button class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button" onclick="openAddExerciseSheet()">
                    <span class="material-symbols-rounded text-primary">add</span>
                </button>'''
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Done generating add exercise modal!")
