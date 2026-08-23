let currentBmiHeight = 170;
let currentBmiWeight = 70;
let currentBmiGender = 'm';

export function initTools() {
    window.openToolBmi = () => {
        const overlay = document.getElementById('bmi-sheet-overlay');
        const sheet = document.getElementById('bmi-sheet');
        if (!overlay || !sheet) return;
        
        overlay.classList.remove('hidden');
        // trigger reflow
        void overlay.offsetWidth;
        overlay.classList.remove('opacity-0');
        sheet.classList.remove('translate-y-full');
    };

    window.closeToolBmi = () => {
        const overlay = document.getElementById('bmi-sheet-overlay');
        const sheet = document.getElementById('bmi-sheet');
        if (!overlay || !sheet) return;
        
        overlay.classList.add('opacity-0');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    };

    window.adjustBmiInput = (type, amount) => {
        if (type === 'height') {
            currentBmiHeight += amount;
            if (currentBmiHeight < 100) currentBmiHeight = 100;
            if (currentBmiHeight > 250) currentBmiHeight = 250;
            document.getElementById('bmi-height-display').textContent = currentBmiHeight;
        } else if (type === 'weight') {
            currentBmiWeight += amount;
            if (currentBmiWeight < 30) currentBmiWeight = 30;
            if (currentBmiWeight > 250) currentBmiWeight = 250;
            document.getElementById('bmi-weight-display').textContent = currentBmiWeight;
        }
        
        // Reset result when inputs change
        document.getElementById('bmi-result-value').textContent = '--';
        document.getElementById('bmi-result-text').textContent = 'Bekleniyor';
    };

    window.setBmiGender = (gender) => {
        currentBmiGender = gender;
        const btnM = document.getElementById('bmi-gender-m');
        const btnF = document.getElementById('bmi-gender-f');
        
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
        
        document.getElementById('bmi-result-value').textContent = '--';
        document.getElementById('bmi-result-text').textContent = 'Bekleniyor';
    };

    window.calculateBmi = () => {
        const heightM = currentBmiHeight / 100;
        const bmi = currentBmiWeight / (heightM * heightM);
        const bmiStr = bmi.toFixed(1);
        
        document.getElementById('bmi-result-value').textContent = bmiStr;
        
        let text = '';
        if (bmi < 18.5) text = 'İdeal Kilonun Altında';
        else if (bmi >= 18.5 && bmi < 25) text = 'İdeal Kilo (Sağlıklı)';
        else if (bmi >= 25 && bmi < 30) text = 'İdeal Kilonun Üstünde';
        else text = 'Obezite Sınırında/Üstünde';
        
        document.getElementById('bmi-result-text').textContent = text;
    };
}

export function clearTools() {
    currentBmiHeight = 170;
    currentBmiWeight = 70;
    currentBmiGender = 'm';
    if(document.getElementById('bmi-height-display')) document.getElementById('bmi-height-display').textContent = '170';
    if(document.getElementById('bmi-weight-display')) document.getElementById('bmi-weight-display').textContent = '70';
    if(document.getElementById('bmi-result-value')) document.getElementById('bmi-result-value').textContent = '--';
    if(document.getElementById('bmi-result-text')) document.getElementById('bmi-result-text').textContent = 'Bekleniyor';
    if(window.setBmiGender) window.setBmiGender('m');
}
