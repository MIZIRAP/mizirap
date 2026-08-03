    <script>
        // Modal Logic
        const addFoodModal = document.getElementById('addFoodModal');
        const addFoodModalContent = document.getElementById('addFoodModalContent');
        const addFoodModalTitle = document.getElementById('modalMealTitle');

        window.openAddFoodModal = function(mealName) {
            addFoodModalTitle.innerText = `${mealName} - Yiyecek Ekle`;
            addFoodModal.classList.remove('hidden');
            addFoodModal.classList.add('flex');
            
            // Trigger animation
            setTimeout(() => {
                addFoodModalContent.classList.remove('translate-y-full');
                addFoodModalContent.classList.add('translate-y-0');
            }, 10);
            
            document.body.style.overflow = 'hidden';
        }

        window.closeAddFoodModal = function() {
            addFoodModalContent.classList.remove('translate-y-0');
            addFoodModalContent.classList.add('translate-y-full');
            
            setTimeout(() => {
                addFoodModal.classList.add('hidden');
                addFoodModal.classList.remove('flex');
                document.body.style.overflow = 'auto';
            }, 300);
        }

        // Close on backdrop click
        addFoodModal.addEventListener('click', function(e) {
            if (e.target === addFoodModal) {
                closeAddFoodModal();
            }
        });

        // Calories Goal Modal UI Logic
        const caloriesGoalBtn = document.getElementById('calories-goal-btn');
        const caloriesGoalModal = document.getElementById('calories-goal-modal');
        const caloriesGoalModalContent = document.getElementById('calories-goal-modal-content');
        const caloriesGoalMinus = document.getElementById('calories-goal-minus');
        const caloriesGoalPlus = document.getElementById('calories-goal-plus');
        const caloriesGoalAmountDisplay = document.getElementById('calories-goal-amount-display');
        const caloriesGoalCancel = document.getElementById('calories-goal-cancel');
        const caloriesGoalSave = document.getElementById('calories-goal-save');

        function openCaloriesGoalModal() {
            caloriesGoalModal.classList.remove('hidden');
            setTimeout(() => {
                caloriesGoalModalContent.classList.remove('scale-95', 'opacity-0');
                caloriesGoalModalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeCaloriesGoalModal() {
            caloriesGoalModalContent.classList.remove('scale-100', 'opacity-100');
            caloriesGoalModalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                caloriesGoalModal.classList.add('hidden');
            }, 200);
        }

        if (caloriesGoalBtn) caloriesGoalBtn.addEventListener('click', openCaloriesGoalModal);
        if (caloriesGoalCancel) caloriesGoalCancel.addEventListener('click', closeCaloriesGoalModal);
        
        caloriesGoalModal.addEventListener('click', function(e) {
            if (e.target === caloriesGoalModal) {
                closeCaloriesGoalModal();
            }
        });

        let tempCaloriesGoal = 2000;
        if (caloriesGoalMinus) {
            caloriesGoalMinus.addEventListener('click', () => {
                if (tempCaloriesGoal > 500) tempCaloriesGoal -= 100;
                caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
            });
        }
        if (caloriesGoalPlus) {
            caloriesGoalPlus.addEventListener('click', () => {
                tempCaloriesGoal += 100;
                caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
            });
        }

        document.querySelectorAll('.calories-goal-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                tempCaloriesGoal = parseInt(btn.dataset.amount);
                caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
                
                document.querySelectorAll('.calories-goal-preset').forEach(b => {
                    b.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-bold');
                    b.classList.add('bg-surface-container', 'text-on-surface-variant');
                });
                btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-bold');
                btn.classList.remove('bg-surface-container', 'text-on-surface-variant');
            });
        });

        if (caloriesGoalSave) {
            caloriesGoalSave.addEventListener('click', () => {
                const amountDisplay = document.getElementById('calories-goal-amount-display');
                if (amountDisplay) dailyCalorieGoal = parseInt(amountDisplay.textContent) || 2000;
                
                const karbInput = document.getElementById('macro-goal-karb');
                if (karbInput) karbGoal = parseInt(karbInput.value) || 240;
                
                const proteinInput = document.getElementById('macro-goal-protein');
                if (proteinInput) proteinGoal = parseInt(proteinInput.value) || 110;
                
                const yagInput = document.getElementById('macro-goal-yag');
                if (yagInput) yagGoal = parseInt(yagInput.value) || 66;
                
                if (typeof updateUIState === 'function') updateUIState();
                closeCaloriesGoalModal();
            });
        }

        // Global State for Tracking
        let totalCaloriesConsumed = 0;
        let dailyCalorieGoal = 2000;
        let proteinConsumed = 0;
        let proteinGoal = 110;
        let karbConsumed = 0;
        let karbGoal = 240;
        let yagConsumed = 0;
        let yagGoal = 66;

        function updateUIState() {
            // Update Goals
            const calGoalEl = document.getElementById('ui-calorie-goal');
            if (calGoalEl) calGoalEl.textContent = dailyCalorieGoal;
            
            const proteinGoalEl = document.getElementById('ui-protein-goal');
            if (proteinGoalEl) proteinGoalEl.textContent = proteinGoal;
            
            const karbGoalEl = document.getElementById('ui-karb-goal');
            if (karbGoalEl) karbGoalEl.textContent = karbGoal;
            
            const yagGoalEl = document.getElementById('ui-yag-goal');
            if (yagGoalEl) yagGoalEl.textContent = yagGoal;
            
            // Update Consumed
            const calConsEl = document.getElementById('ui-calorie-consumed');
            if (calConsEl) calConsEl.textContent = totalCaloriesConsumed;
            
            const calRemEl = document.getElementById('ui-calorie-remaining');
            if (calRemEl) {
                let remaining = dailyCalorieGoal - totalCaloriesConsumed;
                calRemEl.textContent = `Kalan: ${remaining > 0 ? remaining : 0} kcal`;
            }
            
            const proteinConsEl = document.getElementById('ui-protein-consumed');
            if (proteinConsEl) proteinConsEl.textContent = proteinConsumed;
            
            const karbConsEl = document.getElementById('ui-karb-consumed');
            if (karbConsEl) karbConsEl.textContent = karbConsumed;
            
            const yagConsEl = document.getElementById('ui-yag-consumed');
            if (yagConsEl) yagConsEl.textContent = yagConsumed;
            
            // Update SVG Circle
            const circle = document.getElementById('ui-calorie-circle');
            if (circle) {
                let percentage = Math.min(totalCaloriesConsumed / dailyCalorieGoal, 1);
                let offset = 339.292 - (339.292 * percentage);
                circle.style.strokeDashoffset = offset;
            }
            
            // Update Macro Bars
            const proteinBar = document.getElementById('ui-protein-bar');
            if (proteinBar) proteinBar.style.width = `${Math.min((proteinConsumed / proteinGoal) * 100, 100)}%`;
            
            const karbBar = document.getElementById('ui-karb-bar');
            if (karbBar) karbBar.style.width = `${Math.min((karbConsumed / karbGoal) * 100, 100)}%`;
            
            const yagBar = document.getElementById('ui-yag-bar');
            if (yagBar) yagBar.style.width = `${Math.min((yagConsumed / yagGoal) * 100, 100)}%`;
        }

        // New Food (Library) Modal Logic
        const newFoodModal = document.getElementById('newFoodModal');
        const newFoodModalContent = document.getElementById('newFoodModalContent');

        window.openNewFoodModal = function() {
            newFoodModal.classList.remove('hidden');
            setTimeout(() => {
                newFoodModal.classList.remove('opacity-0');
                newFoodModalContent.classList.remove('translate-y-full');
            }, 10);
        }

        window.closeNewFoodModal = function() {
            newFoodModal.classList.add('opacity-0');
            newFoodModalContent.classList.add('translate-y-full');
            setTimeout(() => {
                newFoodModal.classList.add('hidden');
            }, 300);
        }

        if (newFoodModal) {
            newFoodModal.addEventListener('click', (e) => {
                if (e.target === newFoodModal) {
                    closeNewFoodModal();
                }
            });
        }

        // Add Portion Modal Logic
        let currentKcalPer100g = 0;
        let currentFoodName = "";

        window.openAddPortionModal = function(name, kcal100) {
            currentFoodName = name;
            currentKcalPer100g = kcal100;
            document.getElementById('portion-food-name').textContent = name;
            document.getElementById('portion-food-kcal-text').textContent = `${kcal100} kcal / 100g`;
            const gramInput = document.getElementById('gram-input');
            if(gramInput) gramInput.value = 100;
            window.updatePortionTotal();
            
            const modal = document.getElementById('addPortionModal');
            const content = document.getElementById('addPortionModalContent');
            if(modal && content) {
                modal.classList.remove('hidden');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    content.classList.remove('translate-y-full');
                }, 10);
            }
        };

        window.closeAddPortionModal = function() {
            const modal = document.getElementById('addPortionModal');
            const content = document.getElementById('addPortionModalContent');
            if(modal && content) {
                modal.classList.add('opacity-0');
                content.classList.add('translate-y-full');
                setTimeout(() => {
                    modal.classList.add('hidden');
                }, 300);
            }
        };

        window.updatePortionTotal = function() {
            const gramInput = document.getElementById('gram-input');
            const totalKcalEl = document.getElementById('total-kcal');
            if(gramInput && totalKcalEl) {
                let grams = parseInt(gramInput.value);
                if (isNaN(grams) || grams < 0) grams = 0;
                const total = Math.round((grams / 100) * currentKcalPer100g);
                totalKcalEl.textContent = total;
            }
        };

        window.adjustAmount = function(amount) {
            const gramInput = document.getElementById('gram-input');
            if(gramInput) {
                let current = parseInt(gramInput.value);
                if (isNaN(current)) current = 0;
                let newValue = current + amount;
                if (newValue < 0) newValue = 0;
                gramInput.value = newValue;
                window.updatePortionTotal();
                
                gramInput.classList.add('scale-105');
                setTimeout(() => {
                    gramInput.classList.remove('scale-105');
                }, 150);
            }
        };

        window.addFoodToLog = function() {
            const gramInput = document.getElementById('gram-input');
            let grams = 100;
            if(gramInput) grams = parseInt(gramInput.value) || 100;
            const total = Math.round((grams / 100) * currentKcalPer100g);
            
            // Update Global State
            totalCaloriesConsumed += total;
            // Approximate macros for demo
            let p = 0, k = 0, y = 0;
            if(currentFoodName.includes("Tavuk")) { p = Math.round(31 * grams/100); y = Math.round(3.6 * grams/100); }
            else if(currentFoodName.includes("Yulaf")) { k = Math.round(66 * grams/100); p = Math.round(17 * grams/100); y = Math.round(7 * grams/100); }
            else if(currentFoodName.includes("Elma")) { k = Math.round(14 * grams/100); }
            else { p = Math.round(10 * grams/100); k = Math.round(20 * grams/100); y = Math.round(5 * grams/100); }
            
            proteinConsumed += p;
            karbConsumed += k;
            yagConsumed += y;
            if (typeof updateUIState === 'function') updateUIState();
            
            const logList = document.getElementById('daily-log-list');
            if (logList) {
                const newEntry = document.createElement('div');
                newEntry.className = "flex justify-between items-center p-3 border-b border-surface-container-high last:border-0";
                newEntry.innerHTML = `
                <div class="flex flex-col">
                <span class="font-body-md text-body-md text-on-surface font-medium">${currentFoodName}</span>
                <span class="font-label-sm text-label-sm text-on-surface-variant">${grams}g</span>
                </div>
                <span class="font-body-md text-body-md text-on-surface font-semibold text-primary">+${total} kcal</span>
                `;
                
                logList.insertBefore(newEntry, logList.firstChild);
                
                while (logList.children.length > 3) {
                    logList.removeChild(logList.lastChild);
                }
            }
            
            closeAddPortionModal();
            
            document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
            const target = document.getElementById("view-calories");
            if(target) target.classList.remove("hidden");
        };

        // Attach listeners safely
        document.addEventListener('DOMContentLoaded', () => {
            const modal = document.getElementById('addPortionModal');
            if(modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeAddPortionModal();
                });
            }
            const gramInput = document.getElementById('gram-input');
            if(gramInput) {
                gramInput.addEventListener('blur', function() {
                    let val = parseInt(this.value);
                    if (isNaN(val) || val <= 0) this.value = 100;
                    window.updatePortionTotal();
                });
            }
        });
    </script>
