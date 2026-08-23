import { calculateE1RM } from './activeSession.js';

// ==========================================
// CALCULATOR ENGINE
// ==========================================
export const CalculatorEngine = {
    calculateBMI: (weight, heightCm) => {
        const heightM = heightCm / 100;
        const bmi = weight / (heightM * heightM);
        let category = '';
        if (bmi < 18.5) category = 'Zayıf';
        else if (bmi >= 18.5 && bmi < 25) category = 'Normal';
        else if (bmi >= 25 && bmi < 30) category = 'Fazla Kilolu';
        else category = 'Obez';
        return { value: bmi.toFixed(1), unit: 'kg/m²', text: category };
    },

    calculateBroca: (heightCm, gender) => {
        const base = heightCm - 100;
        let ideal = 0;
        if (gender === 'm') ideal = base - (base * 0.10);
        else ideal = base - (base * 0.15);
        
        const min = (ideal * 0.9).toFixed(1);
        const max = (ideal * 1.1).toFixed(1);
        return { value: ideal.toFixed(1), unit: 'kg', text: `Aralık: ${min} - ${max} kg` };
    },

    calculateIdealWeight: (heightCm, gender) => {
        const heightInch = heightCm / 2.54;
        const over60 = Math.max(0, heightInch - 60);
        let d, r, m, h;
        
        if (gender === 'm') {
            d = 50 + 2.3 * over60;
            r = 52 + 1.9 * over60;
            m = 56.2 + 1.41 * over60;
            h = 48 + 2.7 * over60;
        } else {
            d = 45.5 + 2.3 * over60;
            r = 49 + 1.7 * over60;
            m = 53.1 + 1.36 * over60;
            h = 45.5 + 2.2 * over60;
        }
        
        const avg = (d + r + m + h) / 4;
        const min = Math.min(d, r, m, h).toFixed(1);
        const max = Math.max(d, r, m, h).toFixed(1);
        
        return { value: avg.toFixed(1), unit: 'kg', text: `Aralık: ${min} - ${max} kg` };
    },

    calculateWHR: (waist, hip, gender) => {
        const whr = waist / hip;
        let risk = '';
        if (gender === 'm') {
            if (whr < 0.90) risk = 'Düşük Risk';
            else if (whr <= 0.99) risk = 'Orta Risk';
            else risk = 'Yüksek Risk';
        } else {
            if (whr < 0.80) risk = 'Düşük Risk';
            else if (whr <= 0.84) risk = 'Orta Risk';
            else risk = 'Yüksek Risk';
        }
        return { value: whr.toFixed(2), unit: 'oran', text: risk };
    },

    calculateWater: (weight, trainingMin) => {
        const base = weight * 33; // ml
        const training = trainingMin * 12; // ml
        const totalLiters = (base + training) / 1000;
        return { value: totalLiters.toFixed(1), unit: 'L', text: `Temel: ${(base/1000).toFixed(1)}L + Spor: ${(training/1000).toFixed(1)}L` };
    },

    calculateHeartRate: (age) => {
        const maxHR = 220 - age;
        return { 
            value: maxHR, 
            unit: 'bpm', 
            text: `Yağ Yak: ${Math.round(maxHR*0.6)}-${Math.round(maxHR*0.7)} | Kardiyo: ${Math.round(maxHR*0.7)}-${Math.round(maxHR*0.8)}` 
        };
    },

    calculateBodyFat: (waist, neck, height, hip, gender) => {
        let bodyFat = 0;
        if (gender === 'm') {
            bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
        } else {
            bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
        }
        
        let category = '';
        if (gender === 'm') {
            if(bodyFat < 6) category = 'Tehlikeli (Düşük)';
            else if(bodyFat < 14) category = 'Atletik';
            else if(bodyFat < 18) category = 'Fit';
            else if(bodyFat < 25) category = 'Ortalama';
            else category = 'Yüksek';
        } else {
            if(bodyFat < 14) category = 'Tehlikeli (Düşük)';
            else if(bodyFat < 21) category = 'Atletik';
            else if(bodyFat < 25) category = 'Fit';
            else if(bodyFat < 32) category = 'Ortalama';
            else category = 'Yüksek';
        }
        return { value: bodyFat.toFixed(1), unit: '%', text: category };
    },

    calculateTDEE: (weight, height, age, gender, activityLevel) => {
        let bmr = 0;
        if (gender === 'm') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        const tdee = Math.round(bmr * activityLevel);
        inputs.tdee = tdee; // Downstream veri akışı için
        return { value: tdee, unit: 'kcal', text: `BMR (Bazal Met.): ${Math.round(bmr)} kcal` };
    },

    calculateCalorie: (tdee, goal) => {
        let target = tdee;
        let text = 'Mevcut kilonu korursun';
        if (goal === 'lose') {
            target -= 500;
            text = 'Haftada ~0.5kg yağ kaybı';
        } else if (goal === 'gain') {
            target += 500;
            text = 'Haftada ~0.5kg kas/kilo alımı';
        }
        inputs.targetCalorie = target; // Downstream Makro için
        return { value: target, unit: 'kcal', text: text };
    },

    calculateProtein: (weight, goal, activityLevel) => {
        let multiplier = 0.8;
        if (activityLevel >= 1.55) {
            multiplier = 1.5;
            if (goal === 'gain') multiplier = 2.0;
            if (goal === 'lose') multiplier = 1.8;
        } else {
            if (goal === 'lose') multiplier = 1.2;
            if (goal === 'gain') multiplier = 1.5;
        }
        const protein = Math.round(weight * multiplier);
        inputs.proteinGrams = protein; // Makro için kaydet
        return { value: protein, unit: 'g', text: `Tavsiye: ${multiplier.toFixed(1)}g / kg başına` };
    },

    calculateMacro: (targetCalorie, weight) => {
        let pGrams = inputs.proteinGrams;
        if (!pGrams) {
            pGrams = Math.round(weight * 1.6); // Varsayılan
        }
        
        const fKcal = targetCalorie * 0.25;
        const fGrams = Math.round(fKcal / 9);
        
        const pKcal = pGrams * 4;
        const remainingKcal = targetCalorie - fKcal - pKcal;
        
        let cGrams = Math.round(remainingKcal / 4);
        
        let warningText = '';
        if (remainingKcal < 0) {
            warningText = ' (⚠️ Kalan kalori negatif!)';
        }
        
        return { 
            value: targetCalorie, 
            unit: 'kcal', 
            text: `Karb: ${cGrams}g | Pro: ${pGrams}g | Yağ: ${fGrams}g${warningText}`,
            raw: { p: pGrams, c: cGrams, f: fGrams }
        };
    },

    calculateRestTime: (workoutType) => {
        if (workoutType === 'hypertrophy') return { value: '60-90', unit: 'sn', text: 'Kas gelişimi için ideal aralık' };
        if (workoutType === 'strength') return { value: '3-5', unit: 'dk', text: 'Maksimum güç ve toparlanma' };
        if (workoutType === 'endurance') return { value: '30-60', unit: 'sn', text: 'Kardiyovasküler kapasite artışı' };
        return { value: '60', unit: 'sn', text: 'Genel dinlenme' };
    },

    calculateBodyType: (wrist, height, gender) => {
        const ratio = height / wrist;
        let type = '';
        let desc = '';
        
        if (gender === 'm') {
            if (ratio > 10.4) { type = 'Ektomorf'; desc = 'İnce yapı, zor kilo alır'; }
            else if (ratio >= 9.6) { type = 'Mezomorf'; desc = 'Atletik yapı, kolay kas yapar'; }
            else { type = 'Endomorf'; desc = 'Geniş yapı, kolay yağlanır'; }
        } else {
            if (ratio > 11.0) { type = 'Ektomorf'; desc = 'İnce yapı, zor kilo alır'; }
            else if (ratio >= 10.5) { type = 'Mezomorf'; desc = 'Atletik yapı, kolay kas yapar'; }
            else { type = 'Endomorf'; desc = 'Geniş yapı, kolay yağlanır'; }
        }
        
        return { value: type, unit: 'tipi', text: desc };
    }
};

// ==========================================
// UI STATE & LOGIC
// ==========================================
let inputs = {
    height: 170,
    weight: 70,
    waist: 80,
    hip: 100,
    neck: 40,
    age: 25,
    wrist: 17,
    weight_lifted: 60,
    reps: 8,
    training_time: 0,
    activity_level: 1.2,
    goal: 'maintain',
    workout_type: 'hypertrophy',
    gender: 'm',
    tdee: 0, // dynamic
    targetCalorie: 0 // dynamic
};

let currentActiveTool = null;

const TOOLS_CONFIG = {
    'vki': {
        title: 'Vücut Kitle İndeksi',
        fields: ['height', 'weight'],
        calc: () => CalculatorEngine.calculateBMI(inputs.weight, inputs.height)
    },
    'broca': {
        title: 'Boy Kilo Endeksi (Broca)',
        fields: ['height', 'gender'],
        calc: () => CalculatorEngine.calculateBroca(inputs.height, inputs.gender)
    },
    'ideal': {
        title: 'İdeal Kilo',
        fields: ['height', 'gender'],
        calc: () => CalculatorEngine.calculateIdealWeight(inputs.height, inputs.gender)
    },
    'whr': {
        title: 'Bel-Kalça Oranı (WHR)',
        fields: ['waist', 'hip', 'gender'],
        calc: () => CalculatorEngine.calculateWHR(inputs.waist, inputs.hip, inputs.gender)
    },
    'water': {
        title: 'Günlük Su İhtiyacı',
        fields: ['weight', 'training_time'],
        calc: () => CalculatorEngine.calculateWater(inputs.weight, inputs.training_time)
    },
    'heartrate': {
        title: 'Kalp Hızı Bölgeleri',
        fields: ['age'],
        calc: () => CalculatorEngine.calculateHeartRate(inputs.age)
    },
    'bodyfat': {
        title: 'Vücut Yağı Oranı',
        fields: ['height', 'waist', 'neck', 'hip', 'gender'],
        calc: () => CalculatorEngine.calculateBodyFat(inputs.waist, inputs.neck, inputs.height, inputs.hip, inputs.gender)
    },
    'tdee': {
        title: 'TDEE Hesaplama',
        fields: ['weight', 'height', 'age', 'gender', 'activity_level'],
        calc: () => CalculatorEngine.calculateTDEE(inputs.weight, inputs.height, inputs.age, inputs.gender, inputs.activity_level)
    },
    'calorie': {
        title: 'Günlük Kalori İhtiyacı',
        fields: ['weight', 'height', 'age', 'gender', 'activity_level', 'goal'],
        calc: () => {
            CalculatorEngine.calculateTDEE(inputs.weight, inputs.height, inputs.age, inputs.gender, inputs.activity_level);
            return CalculatorEngine.calculateCalorie(inputs.tdee, inputs.goal);
        }
    },
    'protein': {
        title: 'Günlük Protein İhtiyacı',
        fields: ['weight', 'activity_level', 'goal'],
        calc: () => CalculatorEngine.calculateProtein(inputs.weight, inputs.goal, inputs.activity_level)
    },
    'macro': {
        title: 'Makro Dağılımı',
        fields: ['weight', 'height', 'age', 'gender', 'activity_level', 'goal'],
        calc: () => {
            CalculatorEngine.calculateTDEE(inputs.weight, inputs.height, inputs.age, inputs.gender, inputs.activity_level);
            CalculatorEngine.calculateCalorie(inputs.tdee, inputs.goal);
            return CalculatorEngine.calculateMacro(inputs.targetCalorie, inputs.weight);
        }
    },
    'rest_time': {
        title: 'Dinlenme Süresi',
        fields: ['workout_type'],
        calc: () => CalculatorEngine.calculateRestTime(inputs.workout_type)
    },
    'onerm': {
        title: '1RM Hesaplama',
        fields: ['weight_lifted', 'reps'],
        calc: () => {
            const rm = calculateE1RM(inputs.weight_lifted, inputs.reps, null);
            return { value: rm, unit: 'kg', text: `%80'i: ${(rm * 0.8).toFixed(1)}kg (Hipertrofi için)` };
        }
    },
    'bodytype': {
        title: 'Vücut Tipi Analizi',
        fields: ['wrist', 'height', 'gender'],
        calc: () => CalculatorEngine.calculateBodyType(inputs.wrist, inputs.height, inputs.gender)
    }
};

export function initTools() {
    window.openTool = (toolId) => {
        currentActiveTool = toolId;
        const config = TOOLS_CONFIG[toolId];
        if (!config) {
            alert('Bu araç yakında eklenecek!');
            return;
        }

        // Update title
        document.getElementById('tool-sheet-title').textContent = config.title;

        // Auto-fill from profile if available
        const profileMap = {
            height: 'profile-height',
            weight: 'profile-weight',
            waist: 'profile-waist',
            hip: 'profile-hip',
            neck: 'profile-neck',
            wrist: 'profile-wrist'
        };
        for (const [toolKey, profileId] of Object.entries(profileMap)) {
            const el = document.getElementById(profileId);
            if (el && el.value) {
                const val = parseFloat(el.value);
                if (!isNaN(val) && val > 0) {
                    inputs[toolKey] = val;
                    if(document.getElementById(`tool-${toolKey}-display`)) {
                        document.getElementById(`tool-${toolKey}-display`).textContent = val;
                    }
                }
            }
        }
        
        // Handle age from dob
        const dobEl = document.getElementById('profile-dob');
        if (dobEl && dobEl.value) {
            const parts = dobEl.value.split('.');
            let ageVal = 25;
            if (parts.length === 3) {
                ageVal = new Date().getFullYear() - parseInt(parts[2], 10);
            } else {
                const dateObj = new Date(dobEl.value);
                if(!isNaN(dateObj.getTime())) {
                     ageVal = new Date().getFullYear() - dateObj.getFullYear();
                }
            }
            if(!isNaN(ageVal) && ageVal > 0) {
                inputs.age = ageVal;
                if(document.getElementById('tool-age-display')) document.getElementById('tool-age-display').textContent = ageVal;
            }
        }
        
        // Handle gender, goal, activity
        const genderEl = document.getElementById('profile-gender');
        if (genderEl && genderEl.value) {
            if(window.setToolGender) window.setToolGender(genderEl.value);
        }
        const goalEl = document.getElementById('profile-goal');
        if (goalEl && goalEl.value) {
            const sel = document.getElementById('tool-goal-select');
            if (sel) {
                sel.value = goalEl.value;
                if(window.setToolGoal) window.setToolGoal(goalEl.value);
                const textEl = document.getElementById('tool-goal-text');
                if(textEl) textEl.textContent = sel.options[sel.selectedIndex].text;
            }
        }
        const activityEl = document.getElementById('profile-activity');
        if (activityEl && activityEl.value) {
            const sel = document.getElementById('tool-activity-select');
            if (sel) {
                sel.value = activityEl.value;
                if(window.setToolActivity) window.setToolActivity(activityEl.value);
                const textEl = document.getElementById('tool-activity-text');
                if(textEl) textEl.textContent = sel.options[sel.selectedIndex].text;
            }
        }

        // Reset result
        document.getElementById('tool-result-value').textContent = '--';
        document.getElementById('tool-result-unit').textContent = '';
        document.getElementById('tool-result-text').textContent = 'Bekleniyor';

        // Show/hide fields
        const allFields = ['height', 'weight', 'waist', 'hip', 'neck', 'age', 'wrist', 'weight_lifted', 'reps', 'training_time', 'activity_level', 'goal', 'workout_type', 'gender'];
        allFields.forEach(f => {
            const el = document.getElementById(`input-row-${f}`);
            if (el) {
                if (config.fields.includes(f)) {
                    el.classList.remove('hidden');
                    // select elements and gender row have different default flex classes
                    if(f === 'gender' || f === 'activity_level' || f === 'goal' || f === 'workout_type') {
                        el.classList.add('flex');
                    } else {
                        el.classList.add('flex');
                    }
                } else {
                    el.classList.add('hidden');
                    el.classList.remove('flex');
                }
            }
        });

        // Hide/show the inputs container based on if any number input is shown
        const numberInputs = config.fields.filter(f => !['gender', 'activity_level', 'goal', 'workout_type'].includes(f));
        const container = document.getElementById('tool-inputs-container');
        if (numberInputs.length > 0) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }

        const overlay = document.getElementById('tool-sheet-overlay');
        const sheet = document.getElementById('tool-sheet');
        
        overlay.classList.remove('hidden');
        sheet.classList.remove('hidden');
        void overlay.offsetWidth; // reflow
        overlay.classList.remove('opacity-0');
        sheet.classList.remove('translate-y-full');
    };

    window.closeTool = () => {
        const overlay = document.getElementById('tool-sheet-overlay');
        const sheet = document.getElementById('tool-sheet');
        
        overlay.classList.add('opacity-0');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
            sheet.classList.add('hidden');
        }, 300);
        currentActiveTool = null;
    };

    window.adjustToolInput = (type, amount) => {
        inputs[type] += amount;
        
        // Boundaries
        if (type === 'height' && inputs[type] < 100) inputs[type] = 100;
        if (type === 'height' && inputs[type] > 250) inputs[type] = 250;
        
        if (type === 'weight' && inputs[type] < 30) inputs[type] = 30;
        if (type === 'weight' && inputs[type] > 250) inputs[type] = 250;
        
        if (type === 'age' && inputs[type] < 10) inputs[type] = 10;
        if (type === 'age' && inputs[type] > 120) inputs[type] = 120;
        
        if (type === 'neck' && inputs[type] < 20) inputs[type] = 20;
        if (type === 'neck' && inputs[type] > 80) inputs[type] = 80;
        
        if (type === 'wrist' && inputs[type] < 10) inputs[type] = 10;
        if (type === 'wrist' && inputs[type] > 30) inputs[type] = 30;
        
        if (type === 'weight_lifted' && inputs[type] < 1) inputs[type] = 1;
        if (type === 'weight_lifted' && inputs[type] > 500) inputs[type] = 500;
        
        if (type === 'reps' && inputs[type] < 1) inputs[type] = 1;
        if (type === 'reps' && inputs[type] > 100) inputs[type] = 100;
        
        if (type === 'waist' && inputs[type] < 40) inputs[type] = 40;
        if (type === 'waist' && inputs[type] > 200) inputs[type] = 200;
        
        if (type === 'hip' && inputs[type] < 40) inputs[type] = 40;
        if (type === 'hip' && inputs[type] > 200) inputs[type] = 200;
        
        if (type === 'training_time' && inputs[type] < 0) inputs[type] = 0;
        if (type === 'training_time' && inputs[type] > 300) inputs[type] = 300;

        document.getElementById(`tool-${type}-display`).textContent = inputs[type];
        
        // Reset result
        document.getElementById('tool-result-value').textContent = '--';
        document.getElementById('tool-result-unit').textContent = '';
        document.getElementById('tool-result-text').textContent = 'Bekleniyor';
    };

    window.setToolGender = (gender) => {
        inputs.gender = gender;
        const btnM = document.getElementById('tool-gender-m');
        const btnF = document.getElementById('tool-gender-f');
        
        if (gender === 'm') {
            btnM.className = "flex-1 h-full rounded-full flex items-center justify-center active:scale-95 transition-all text-[#22C55E]";
            btnM.style.boxShadow = "6px 6px 12px #E3E6EE, -6px -6px 12px #FFFFFF";
            
            btnF.className = "flex-1 h-full rounded-full flex items-center justify-center active:scale-95 transition-all text-[#585A68]";
            btnF.style.boxShadow = "none";
        } else {
            btnF.className = "flex-1 h-full rounded-full flex items-center justify-center active:scale-95 transition-all text-[#F43F5E]";
            btnF.style.boxShadow = "6px 6px 12px #E3E6EE, -6px -6px 12px #FFFFFF";
            
            btnM.className = "flex-1 h-full rounded-full flex items-center justify-center active:scale-95 transition-all text-[#585A68]";
            btnM.style.boxShadow = "none";
        }
        
        if (currentActiveTool === 'bodyfat') {
            const hipRow = document.getElementById('input-row-hip');
            if (gender === 'm') {
                hipRow.classList.add('hidden');
                hipRow.classList.remove('flex');
            } else {
                hipRow.classList.remove('hidden');
                hipRow.classList.add('flex');
            }
        }
        
        document.getElementById('tool-result-value').textContent = '--';
        document.getElementById('tool-result-unit').textContent = '';
        document.getElementById('tool-result-text').textContent = 'Bekleniyor';
    };

    window.setToolActivity = (val) => {
        inputs.activity_level = parseFloat(val);
    };

    window.setToolGoal = (val) => {
        inputs.goal = val;
    };

    window.setToolWorkoutType = (val) => {
        inputs.workout_type = val;
    };

    window.calculateTool = () => {
        if (!currentActiveTool) return;
        const config = TOOLS_CONFIG[currentActiveTool];
        const res = config.calc();
        
        document.getElementById('tool-result-value').textContent = res.value;
        document.getElementById('tool-result-unit').textContent = res.unit;
        document.getElementById('tool-result-text').textContent = res.text;
    };

    // Tools Search Logic
    const searchInput = document.getElementById('tools-search-input');
    const emptyState = document.getElementById('tools-empty-state');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLocaleLowerCase('tr-TR');
            const cards = document.querySelectorAll('#view-tools .tool-card-item');
            let visibleCount = 0;

            cards.forEach(card => {
                const text = card.textContent.toLocaleLowerCase('tr-TR');
                if (text.includes(query)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (emptyState) {
                if (visibleCount === 0) {
                    emptyState.classList.remove('hidden');
                    emptyState.classList.add('flex');
                } else {
                    emptyState.classList.add('hidden');
                    emptyState.classList.remove('flex');
                }
            }
        });
    }
}

export function clearTools() {
    inputs = { 
        height: 170, weight: 70, waist: 80, hip: 100, 
        neck: 40, age: 25, wrist: 17, weight_lifted: 60, reps: 8,
        training_time: 0, activity_level: 1.2, goal: 'maintain', 
        workout_type: 'hypertrophy', gender: 'm',
        tdee: 0, targetCalorie: 0
    };
    ['height', 'weight', 'waist', 'hip', 'neck', 'age', 'wrist', 'weight_lifted', 'reps', 'training_time'].forEach(k => {
        if(document.getElementById(`tool-${k}-display`)) document.getElementById(`tool-${k}-display`).textContent = inputs[k];
    });
    if(window.setToolGender) window.setToolGender('m');
    if(document.getElementById('tool-activity-select')) document.getElementById('tool-activity-select').value = "1.2";
    if(document.getElementById('tool-goal-select')) document.getElementById('tool-goal-select').value = "maintain";
    if(document.getElementById('tool-workout-select')) document.getElementById('tool-workout-select').value = "hypertrophy";
    
    // Reset search
    const searchInput = document.getElementById('tools-search-input');
    if (searchInput) {
        searchInput.value = '';
        const cards = document.querySelectorAll('#view-tools .tool-card-item');
        cards.forEach(card => card.style.display = 'flex');
        const emptyState = document.getElementById('tools-empty-state');
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
        }
    }
}
