import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update saveNewExercise to persist to localStorage and update EXERCISE_MUSCLE_MAPPING
old_save = """        function saveNewExercise() {
            const nameInput = document.getElementById('newExerciseName');
            const name = nameInput.value.trim();
            if(!name) {
                alert('Lütfen hareket adını girin');
                return;
            }
            
            const muscleGroup = document.querySelector('input[name="newExerciseMuscle"]:checked').value;
            
            // Create the exercise item HTML dynamically
            const letter = name.charAt(0).toUpperCase();"""

new_save = """        function saveNewExercise() {
            const nameInput = document.getElementById('newExerciseName');
            const name = nameInput.value.trim();
            if(!name) {
                alert('Lütfen hareket adını girin');
                return;
            }
            
            const muscleGroup = document.querySelector('input[name="newExerciseMuscle"]:checked').value;
            
            const categoryToSvgMap = {
                'Göğüs': ['chest'],
                'Sırt': ['upper-back'],
                'Omuz': ['deltoids'],
                'Bacak': ['quadriceps', 'hamstring'],
                'Biceps': ['biceps'],
                'Triceps': ['triceps'],
                'Karın': ['abs'],
                'Kalça': ['gluteal']
            };
            
            if (window.EXERCISE_MUSCLE_MAPPING) {
                window.EXERCISE_MUSCLE_MAPPING[name] = { 
                    primary: categoryToSvgMap[muscleGroup] || [], 
                    secondary: [] 
                };
            }
            
            if (typeof currentUid !== 'undefined') {
                const customKey = `miz_custom_exercises_${currentUid || 'guest'}`;
                let customExercises = JSON.parse(localStorage.getItem(customKey) || "[]");
                if (!customExercises.some(ex => ex.name === name)) {
                    customExercises.push({ name: name, muscleGroup: muscleGroup });
                    localStorage.setItem(customKey, JSON.stringify(customExercises));
                }
            }
            
            // Create the exercise item HTML dynamically
            const letter = name.charAt(0).toUpperCase();"""

html = html.replace(old_save, new_save)

# 2. Fix the delete logic in deleteCurrentExercise
old_delete = """        function deleteCurrentExercise() {
            if (!currentExerciseElement) return;
            
            if (confirm("Bu hareketi silmek istediğinize emin misiniz?")) {
                currentExerciseElement.remove();
                currentExerciseElement = null;
                closeExerciseSheet();
                applyExerciseFilters();
            }
        }"""

new_delete = """        function deleteCurrentExercise() {
            if (!currentExerciseElement) return;
            
            if (confirm("Bu hareketi silmek istediğinize emin misiniz?")) {
                const name = currentExerciseElement.querySelector('h4').innerText;
                
                if (typeof currentUid !== 'undefined') {
                    const customKey = `miz_custom_exercises_${currentUid || 'guest'}`;
                    let customExercises = JSON.parse(localStorage.getItem(customKey) || "[]");
                    customExercises = customExercises.filter(ex => ex.name !== name);
                    localStorage.setItem(customKey, JSON.stringify(customExercises));
                }
                
                if (window.EXERCISE_MUSCLE_MAPPING && window.EXERCISE_MUSCLE_MAPPING[name]) {
                    delete window.EXERCISE_MUSCLE_MAPPING[name];
                }
                
                currentExerciseElement.remove();
                currentExerciseElement = null;
                closeExerciseSheet();
                applyExerciseFilters();
            }
        }"""

html = html.replace(old_delete, new_delete)

# 3. Add loadCustomExercises to index.html to be called globally
js_inject = """        function loadCustomExercises() {
            if (typeof currentUid === 'undefined') return;
            const customKey = `miz_custom_exercises_${currentUid || 'guest'}`;
            let customExercises = JSON.parse(localStorage.getItem(customKey) || "[]");
            
            const categoryToSvgMap = {
                'Göğüs': ['chest'],
                'Sırt': ['upper-back'],
                'Omuz': ['deltoids'],
                'Bacak': ['quadriceps', 'hamstring'],
                'Biceps': ['biceps'],
                'Triceps': ['triceps'],
                'Karın': ['abs'],
                'Kalça': ['gluteal']
            };
            
            const container = document.getElementById('exercise-list-container');
            if (!container) return;
            
            customExercises.forEach(ex => {
                // Skip if already in DOM
                const existingItems = Array.from(document.querySelectorAll('.exercise-item h4')).map(el => el.innerText);
                if (existingItems.includes(ex.name)) return;
                
                if (window.EXERCISE_MUSCLE_MAPPING) {
                    window.EXERCISE_MUSCLE_MAPPING[ex.name] = { 
                        primary: categoryToSvgMap[ex.muscleGroup] || [], 
                        secondary: [] 
                    };
                }
                
                const letter = ex.name.charAt(0).toUpperCase();
                const newExerciseHtml = `
                    <div onclick="openExerciseSheet(this, '${ex.name}')" class="neo-surface p-5 flex items-center justify-between neo-button transition-all exercise-item mb-4 cursor-pointer">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full neo-inset flex items-center justify-center bg-surface-light text-primary font-bold">${letter}</div>
                            <div>
                                <h4 class="font-semibold text-body-md text-on-surface tracking-tight">${ex.name}</h4>
                                <p class="text-xs text-on-surface-variant capitalize">Ana Kas: ${ex.muscleGroup}</p>
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
                
                const categoryGroups = container.querySelectorAll('.exercise-category');
                let targetGroup = null;
                categoryGroups.forEach(group => {
                    if (group.getAttribute('data-category') === ex.muscleGroup) {
                        targetGroup = group;
                    }
                });
                
                if (targetGroup) {
                    const list = targetGroup.querySelector('.flex.flex-col.gap-2');
                    list.insertAdjacentHTML('beforeend', newExerciseHtml);
                }
            });
            
            // We need to re-init favorites because new items were added!
            if (typeof initFavoritesUI === 'function') {
                initFavoritesUI();
            }
        }
"""

html = html.replace("function saveNewExercise() {", js_inject + "\n        function saveNewExercise() {")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html logic!")
