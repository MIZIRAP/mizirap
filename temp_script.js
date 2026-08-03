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
                // Here we would save the goal to Firebase
                // For now, just close
                closeCaloriesGoalModal();
            });
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
        const addPortionModal = document.getElementById('addPortionModal');
        const addPortionModalContent = document.getElementById('addPortionModalContent');
        const portionFoodName = document.getElementById('portion-food-name');
        const portionFoodKcalText = document.getElementById('portion-food-kcal-text');
        const gramInput = document.getElementById('gram-input');
        const totalKcalEl = document.getElementById('total-kcal');
        let currentKcalPer100g = 0;
        let currentFoodName = "";

        window.openAddPortionModal = function(name, kcal100) {
            currentFoodName = name;
            currentKcalPer100g = kcal100;
            portionFoodName.textContent = name;
