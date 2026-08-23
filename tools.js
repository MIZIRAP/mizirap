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
    training_time: 0,
    gender: 'm'
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

        // Reset result
        document.getElementById('tool-result-value').textContent = '--';
        document.getElementById('tool-result-unit').textContent = '';
        document.getElementById('tool-result-text').textContent = 'Bekleniyor';

        // Show/hide fields
        const allFields = ['height', 'weight', 'waist', 'hip', 'training_time', 'gender'];
        allFields.forEach(f => {
            const el = document.getElementById(`input-row-${f}`);
            if (el) {
                if (config.fields.includes(f)) {
                    el.classList.remove('hidden');
                    el.classList.add('flex');
                } else {
                    el.classList.add('hidden');
                    el.classList.remove('flex');
                }
            }
        });

        // Hide/show the inputs container based on if any number input is shown
        const numberInputs = config.fields.filter(f => f !== 'gender');
        const container = document.getElementById('tool-inputs-container');
        if (numberInputs.length > 0) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }

        const overlay = document.getElementById('tool-sheet-overlay');
        const sheet = document.getElementById('tool-sheet');
        
        overlay.classList.remove('hidden');
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
            btnF.className = "flex-1 h-full rounded-full flex items-center justify-center active:scale-95 transition-all text-[#22C55E]";
            btnF.style.boxShadow = "6px 6px 12px #E3E6EE, -6px -6px 12px #FFFFFF";
            
            btnM.className = "flex-1 h-full rounded-full flex items-center justify-center active:scale-95 transition-all text-[#585A68]";
            btnM.style.boxShadow = "none";
        }
        
        document.getElementById('tool-result-value').textContent = '--';
        document.getElementById('tool-result-unit').textContent = '';
        document.getElementById('tool-result-text').textContent = 'Bekleniyor';
    };

    window.calculateTool = () => {
        if (!currentActiveTool) return;
        const config = TOOLS_CONFIG[currentActiveTool];
        const res = config.calc();
        
        document.getElementById('tool-result-value').textContent = res.value;
        document.getElementById('tool-result-unit').textContent = res.unit;
        document.getElementById('tool-result-text').textContent = res.text;
    };
}

export function clearTools() {
    inputs = { height: 170, weight: 70, waist: 80, hip: 100, training_time: 0, gender: 'm' };
    ['height', 'weight', 'waist', 'hip', 'training_time'].forEach(k => {
        if(document.getElementById(`tool-${k}-display`)) document.getElementById(`tool-${k}-display`).textContent = inputs[k];
    });
    if(window.setToolGender) window.setToolGender('m');
}
