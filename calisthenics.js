import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { registerListener } from "./listenerManager.js";
import { escapeHtml } from "./utils.js";

let currentUid = null;
let profile = null; // { maxPushups, maxSitups, maxPullups, daysPerWeek, startWeek, currentMultiplier }
let logs = {}; // { "week_day": { completed: true, timestamp } }
let currentWeek = 1;

let unsubProfile = null;
let unsubLogs = null;

// Program Üretim Mantığı
function generatePushups(max, week, day, daysPerWeek, multiplier) {
    if (max <= 5 && week <= 3 && multiplier === 1.0) {
        // Seviye 1 Referans (Max 5)
        const ref = {
            1: ["5-4-4-3-3", "5-5-4-3-3", "6-5-4-4-3", "6-6-5-4-4"],
            2: ["6-5-5-4-4", "7-6-5-4-4", "7-7-6-5-4", "8-7-6-5-4"],
            3: ["8-7-6-5-5", "8-8-7-6-5", "9-8-7-7-6", "9-9-8-7-6"]
        };
        const refWeek = ref[week];
        return refWeek ? refWeek[Math.min(day - 1, refWeek.length - 1)] : "5-5-5-5-5";
    }

    let m = Math.max(1, Math.round(max * multiplier));
    let sets = [
        Math.max(1, Math.ceil(m * 1.0)),
        Math.max(1, Math.ceil(m * 0.9)),
        Math.max(1, Math.ceil(m * 0.8)),
        Math.max(1, Math.ceil(m * 0.7)),
        Math.max(1, Math.ceil(m * 0.7))
    ];

    let progressCount = (week - 1) * daysPerWeek + (day - 1);
    for (let i = 0; i < progressCount; i++) {
        let type = i % 3;
        if (type === 0) {
            sets[sets.length - 1] += 1;
        } else if (type === 1) {
            sets[0] += 1;
        } else {
            if (sets.length < 6) sets.push(sets[sets.length - 1]);
            else sets[1] += 1;
        }
    }
    return sets.join("-");
}

function generateSitups(max, week, day, daysPerWeek, multiplier) {
    if (max <= 10 && week <= 3 && multiplier === 1.0) {
         // Seviye 1 Referans (Max 10)
         const ref = {
            1: ["10-10-8-8", "12-10-10-8", "12-12-10-10", "15-12-10-10"],
            2: ["15-12-10-10", "15-15-12-10", "18-15-12-12", "18-18-15-12"],
            3: ["20-15-15-12", "20-18-15-15", "22-20-18-15", "25-20-18-15"]
        };
        const refWeek = ref[week];
        return refWeek ? refWeek[Math.min(day - 1, refWeek.length - 1)] : "10-10-10-10";
    }

    let m = Math.max(1, Math.round(max * multiplier));
    let sets = [
        Math.max(1, Math.ceil(m * 1.0)),
        Math.max(1, Math.ceil(m * 0.9)),
        Math.max(1, Math.ceil(m * 0.8)),
        Math.max(1, Math.ceil(m * 0.7))
    ];

    let progressCount = (week - 1) * daysPerWeek + (day - 1);
    for (let i = 0; i < progressCount; i++) {
        let type = i % 3;
        if (type === 0) sets[sets.length - 1] += 1;
        else if (type === 1) sets[0] += 2;
        else sets[1] += 1;
    }
    return sets.join("-");
}

function generatePullups(max, week, day, daysPerWeek, multiplier) {
    if (max === 0) {
        // Seviye 1 (Asılı Kalma / Negatif)
        let prog = (week - 1) * daysPerWeek + (day - 1);
        const plan = [
            "3x15 sn asılı kalma + 3x3 negatif (5 sn iniş)",
            "3x20 sn asılı kalma + 3x4 negatif",
            "4x15 sn asılı kalma + 3x5 negatif",
            "4x20 sn asılı kalma + 4x4 negatif",
            "3x25 sn asılı kalma + 4x3 negatif",
            "3x30 sn asılı kalma + 4x4 negatif",
            "4x20 sn asılı kalma + 4x5 negatif",
            "4x25 sn asılı kalma + 5x4 negatif",
            "3x35 sn asılı kalma + 5x3 negatif",
            "Direnç bandı ile 3x3 çekiş",
            "Direnç bandı ile 3x4 çekiş",
            "Direnç bandı ile 4x4 çekiş"
        ];
        return plan[Math.min(prog, plan.length - 1)];
    }

    let m = Math.max(1, Math.round(max * multiplier));
    let sets = [
        Math.max(1, Math.ceil(m * 1.0)),
        Math.max(1, Math.ceil(m * 0.9)),
        Math.max(1, Math.ceil(m * 0.8)),
        Math.max(1, Math.ceil(m * 0.7))
    ];

    let progressCount = (week - 1) * daysPerWeek + (day - 1);
    for (let i = 0; i < progressCount; i++) {
        let type = i % 3;
        if (type === 0) sets[sets.length - 1] += 1;
        else if (type === 1) sets[0] += 1;
        else {
            if (sets.length < 5) sets.push(sets[sets.length - 1]);
            else sets[1] += 1;
        }
    }
    return sets.join("-");
}

// UI Yöneticisi
function renderCalisthenics() {
    const container = document.getElementById("calisthenics-container");
    if (!container) return;
    
    if (!profile) {
        container.innerHTML = `
        <a href="#" data-action="openCalisthenicsModal" class="bg-[#F0F2F8] p-4 rounded-2xl flex items-center justify-between active:scale-[0.99] transition-transform mb-4" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-[#F0F2F8] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px rgba(255, 255, 255, 0.7);">
                    <span class="material-symbols-rounded text-[#1E293B]">fitness_center</span>
                </div>
                <div>
                    <h4 class="font-bold text-sm text-[#1E293B]">Kalistenik Programı</h4>
                    <p class="text-xs font-medium text-[#64748B] mt-0.5">Programını oluşturmak için tıkla</p>
                </div>
            </div>
            <span class="material-symbols-rounded text-[#1E293B]">chevron_right</span>
        </a>`;
        return;
    }

    let html = `<div class="flex flex-col gap-4 mt-8 mb-4">
        <h3 class="font-bold text-xl text-[#1E293B]">Kalistenik Program</h3>
        <p class="text-sm font-medium text-[#64748B]">Hafta ${currentWeek} • ${profile.daysPerWeek} Günlük Program</p>
    </div>`;

    // Calculate current day to display
    let activeDay = 1;
    for (let i = 1; i <= profile.daysPerWeek; i++) {
        if (!logs[`${currentWeek}_${i}`]) {
            activeDay = i;
            break;
        }
    }
    // If all completed this week, show last day (feedback modal should trigger)
    if (activeDay > profile.daysPerWeek) activeDay = profile.daysPerWeek;

    const pushupsPlan = generatePushups(profile.maxPushups, currentWeek, activeDay, profile.daysPerWeek, profile.currentMultiplier || 1.0);
    const situpsPlan = generateSitups(profile.maxSitups, currentWeek, activeDay, profile.daysPerWeek, profile.currentMultiplier || 1.0);
    const pullupsPlan = generatePullups(profile.maxPullups, currentWeek, activeDay, profile.daysPerWeek, profile.currentMultiplier || 1.0);

    const isCompleted = logs[`${currentWeek}_${activeDay}`];

    const cards = [
        { id: 'pushup', title: 'Şınav', icon: 'fitness_center', plan: pushupsPlan, desc: 'Göğüs ve Arka Kol' },
        { id: 'situp', title: 'Mekik', icon: 'sports_gymnastics', plan: situpsPlan, desc: 'Karın' },
        { id: 'pullup', title: 'Barfiks', icon: 'sports_martial_arts', plan: pullupsPlan, desc: 'Sırt ve Biceps' }
    ];

    cards.forEach(card => {
        html += `
        <div class="neon-card rounded-[32px] mt-4" style="border-radius: 32px;">
            <div class="neon-card-inner bg-[#F0F2F8] p-6 flex flex-col gap-4 relative overflow-hidden" style="border-radius: 29px; box-shadow: 8px 8px 16px #D1D9E6, -8px -8px 16px rgba(255, 255, 255, 0.7);">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">GÜN ${activeDay}</h2>
                        <h3 class="text-2xl font-bold text-[#1E293B] mb-2">${card.title}</h3>
                        <p class="text-sm font-medium text-neon-blue">${card.plan}</p>
                        <p class="text-xs font-medium text-[#64748B] mt-2">Set arası 60-90 sn dinlen</p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-[#F0F2F8] flex items-center justify-center shrink-0" style="box-shadow: inset 4px 4px 8px #D1D9E6, inset -4px -4px 8px rgba(255, 255, 255, 0.7);">
                        <span class="material-symbols-rounded text-[#1E293B] text-xl">${card.icon}</span>
                    </div>
                </div>
            </div>
        </div>`;
    });

    if (!isCompleted) {
        html += `
        <button data-action="completeCalisthenicsDay" data-week="${currentWeek}" data-day="${activeDay}" class="w-full py-4 mt-6 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-white shadow-neo-lowest shadow-sm">
            <span class="material-symbols-rounded text-white">check_circle</span>
            <span class="font-bold text-white">Günü Tamamla</span>
        </button>
        <div class="text-center mt-4">
            <a href="#" data-action="calisthenicsAssessmentOpen" class="text-xs font-medium text-[#64748B] hover:text-[#1E293B] transition-colors">Programı Yeniden Ayarla</a>
        </div>`;
    } else {
        html += `
        <div class="w-full py-4 mt-6 rounded-2xl bg-[#E2E8F0] flex items-center justify-center gap-2" style="box-shadow: inset 4px 4px 8px #D1D9E6, inset -4px -4px 8px #FFFFFF;">
            <span class="material-symbols-rounded text-[#64748B]">done_all</span>
            <span class="font-bold text-[#64748B]">Gün Tamamlandı</span>
        </div>`;
    }

    container.innerHTML = html;
}

// Başlatma (Init)
export function initCalisthenics(uid) {
    if(!uid) return;
    currentUid = uid;

    unsubProfile = registerListener(onSnapshot(doc(db, "users", uid, "calisthenics_profile", "main"), (docSnap) => {
        if (docSnap.exists()) {
            profile = docSnap.data();
            fetchLogsAndRender();
        } else {
            profile = null;
            renderCalisthenics();
        }
    }));
}

function fetchLogsAndRender() {
    if (unsubLogs) unsubLogs();
    unsubLogs = registerListener(onSnapshot(doc(db, "users", currentUid, "calisthenics_logs", "main"), (docSnap) => {
        if (docSnap.exists()) {
            logs = docSnap.data() || {};
        } else {
            logs = {};
        }
        
        currentWeek = 1;
        while(true) {
            let allCompleted = true;
            for(let i = 1; i <= profile.daysPerWeek; i++) {
                if(!logs[`${currentWeek}_${i}`]) {
                    allCompleted = false; break;
                }
            }
            if(allCompleted) currentWeek++;
            else break;
        }

        renderCalisthenics();
    }));
}

export function clearCalisthenics() {
    if (unsubProfile) unsubProfile();
    if (unsubLogs) unsubLogs();
    currentUid = null;
    profile = null;
    logs = {};
}

// Olay Yöneticileri
document.addEventListener('click', async (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    if (action === 'openCalisthenicsModal') {
        e.preventDefault();
        const m = document.getElementById("calisthenicsAssessmentModal");
        if(m) m.classList.remove("hidden");
    }
    else if (action === 'calisthenicsAssessmentClose') {
        e.preventDefault();
        const m = document.getElementById("calisthenicsAssessmentModal");
        if(m) m.classList.add("hidden");
    }
    else if (action === 'saveCalisthenicsAssessment') {
        e.preventDefault();
        const pInput = document.getElementById("cal-pushup").value;
        const sInput = document.getElementById("cal-situp").value;
        const puInput = document.getElementById("cal-pullup").value;
        const dInput = document.getElementById("cal-days").value;

        if (pInput === "" || sInput === "" || puInput === "") {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        const btn = actionBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = "Kaydediliyor...";
        btn.disabled = true;

        const newProfile = {
            maxPushups: parseInt(pInput),
            maxSitups: parseInt(sInput),
            maxPullups: parseInt(puInput),
            daysPerWeek: parseInt(dInput),
            currentMultiplier: 1.0,
            updatedAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, "users", currentUid, "calisthenics_profile", "main"), newProfile);
            const m = document.getElementById("calisthenicsAssessmentModal");
            if (m) m.classList.add("hidden");
        } catch(err) {
            console.error(err);
            alert("Hata oluştu.");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    else if (action === 'completeCalisthenicsDay') {
        e.preventDefault();
        if(!currentUid) return;
        const week = parseInt(actionBtn.getAttribute("data-week"));
        const day = parseInt(actionBtn.getAttribute("data-day"));

        const btn = actionBtn;
        btn.disabled = true;
        btn.innerHTML = "Kaydediliyor...";

        try {
            const updatedLogs = { ...logs, [`${week}_${day}`]: true };
            await setDoc(doc(db, "users", currentUid, "calisthenics_logs", "main"), updatedLogs, { merge: true });

            if (day === profile.daysPerWeek) {
                // Son gün bitti, geribildirim göster
                const f = document.getElementById("calisthenicsFeedbackModal");
                if (f) {
                    f.classList.remove("hidden");
                    f.setAttribute("data-week", week);
                }
            }
        } catch (err) {
            console.error(err);
            alert("Kaydedilemedi.");
            btn.disabled = false;
            btn.innerHTML = "Günü Tamamla";
        }
    }
    else if (action === 'submitCalisthenicsFeedback') {
        e.preventDefault();
        const type = actionBtn.getAttribute("data-type");
        const f = document.getElementById("calisthenicsFeedbackModal");
        
        let delta = 0;
        if (type === "easy") delta = 0.10;
        else if (type === "hard") delta = -0.10;

        let newMulti = (profile.currentMultiplier || 1.0) + delta;
        newMulti = Math.max(0.5, Math.min(2.0, newMulti)); // Güvenli sınır

        try {
            actionBtn.disabled = true;
            await setDoc(doc(db, "users", currentUid, "calisthenics_profile", "main"), { currentMultiplier: newMulti }, { merge: true });
            if(f) f.classList.add("hidden");
        } catch(err) {
            console.error(err);
        } finally {
            actionBtn.disabled = false;
        }
    }
});
