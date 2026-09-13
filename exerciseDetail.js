import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let currentExerciseDetail = null;
let currentChart = null;
let visibleCount = 10;
let currentFilter = 10;

export async function openProgressDetail(exerciseId, exerciseName, category) {
    const uid = localStorage.getItem('uid');
    if (!uid) return;

    // Reset state
    currentExerciseDetail = null;
    visibleCount = 10;
    currentFilter = 10;
    
    // Set basic info while loading
    document.getElementById('ex-detail-name').textContent = exerciseName;
    document.getElementById('ex-detail-cat').textContent = category || "Yükleniyor...";
    document.getElementById('ex-detail-equip').textContent = "-";
    document.getElementById('ex-detail-pr').textContent = "-";
    document.getElementById('ex-detail-max-vol').textContent = "-";
    document.getElementById('ex-detail-total-sessions').textContent = "-";
    document.getElementById('ex-detail-history-list').innerHTML = `<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>`;
    
    window.showView('view-exercise-detail');
    history.pushState({view: 'view-exercise-detail'}, "", "?view=view-exercise-detail");
    window.scrollTo(0,0);

    // Default filters UI reset
    window.updateExChartFilter(10, true);

    try {
        const docRef = doc(db, 'users', uid, 'exerciseProgress', exerciseId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            currentExerciseDetail = docSnap.data();
            renderExerciseDetail();
        } else {
            document.getElementById('ex-detail-history-list').innerHTML = `<div class="text-center text-sm text-[#64748B] py-8">Kayıt bulunamadı.</div>`;
        }
    } catch (e) {
        console.error("Detay yüklenemedi:", e);
        document.getElementById('ex-detail-history-list').innerHTML = `<div class="text-center text-sm text-red-500 py-8">Hata oluştu.</div>`;
    }
};

function renderExerciseDetail() {
    if (!currentExerciseDetail) return;
    
    const data = currentExerciseDetail;
    
    // 1. Header
    const catMap = {
        'chest': 'Göğüs', 'upper-back': 'Sırt', 'lower-back': 'Bel', 'deltoids': 'Omuz', 
        'biceps': 'Biceps', 'triceps': 'Triceps', 'quadriceps': 'Bacak', 'hamstrings': 'Arka Bacak',
        'calves': 'Kalf', 'glutes': 'Kalça', 'core': 'Karın'
    };
    
    let catText = "Diğer";
    if (data.category && data.category[0]) {
        catText = catMap[data.category[0]] || data.category[0];
    }
    
    document.getElementById('ex-detail-cat').textContent = catText;
    document.getElementById('ex-detail-equip').textContent = data.equipment || "Serbest Ağırlık";
    
    // 2. Stats
    if (data.personalRecord && data.personalRecord.weight) {
        document.getElementById('ex-detail-pr').innerHTML = `${data.personalRecord.weight}<span class="text-[10px]">kg</span> <span class="text-xs text-slate-500 font-normal ml-1">x${data.personalRecord.reps}</span>`;
    } else {
        document.getElementById('ex-detail-pr').textContent = "-";
    }
    
    if (data.maxVolume && data.maxVolume.value) {
        document.getElementById('ex-detail-max-vol').innerHTML = `${data.maxVolume.value}<span class="text-[10px]">kg</span>`;
    } else {
        document.getElementById('ex-detail-max-vol').textContent = "-";
    }
    
    const entries = data.entries || [];
    document.getElementById('ex-detail-total-sessions').textContent = entries.length;
    
    // 3. Chart
    renderChart();
    
    // 4. List
    renderHistoryList();
}

window.updateExChartFilter = function(filterVal, skipRender = false) {
    currentFilter = filterVal;
    // Update active button classes
    const btnIds = ['ex-chart-filter-10', 'ex-chart-filter-20', 'ex-chart-filter-all'];
    btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.className = "px-3 py-1 rounded-lg text-xs font-semibold text-[#64748B] transition-all";
            el.style.boxShadow = "none";
        }
    });
    
    let activeId = 'ex-chart-filter-all';
    if (filterVal === 10) activeId = 'ex-chart-filter-10';
    if (filterVal === 20) activeId = 'ex-chart-filter-20';
    
    const activeEl = document.getElementById(activeId);
    if (activeEl) {
        activeEl.className = "px-3 py-1 rounded-lg text-xs font-semibold text-[#1E293B] bg-[#F0F2F8] transition-all";
        activeEl.style.boxShadow = "2px 2px 5px #D1D9E6, -2px -2px 5px rgba(255, 255, 255, 0.7)";
    }
    
    if (!skipRender) {
        renderChart();
    }
};

function renderChart() {
    if (!currentExerciseDetail || !currentExerciseDetail.entries || currentExerciseDetail.entries.length === 0) return;
    
    // Sort chronological for chart
    const entries = [...currentExerciseDetail.entries].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    let chartData = entries;
    if (currentFilter !== 'all') {
        chartData = entries.slice(-currentFilter);
    }
    
    const labels = chartData.map(e => {
        const d = new Date(e.date);
        return !isNaN(d) ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : e.date;
    });
    const values = chartData.map(e => e.totalVolume);
    const prPointRadius = chartData.map(e => e.isPR ? 6 : 0);
    const prPointColors = chartData.map(e => e.isPR ? '#F59E0B' : 'transparent');
    
    const ctx = document.getElementById('ex-detail-chart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    if (!window.Chart) {
        console.warn("Chart.js is not loaded yet.");
        return;
    }

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Toplam Hacim (kg)',
                data: values,
                borderColor: '#3B82F6',
                borderWidth: 2,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: prPointRadius,
                pointBackgroundColor: prPointColors,
                pointBorderColor: prPointColors,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { display: true, grid: { color: '#E2E8F0', drawBorder: false }, ticks: { font: { size: 10 }, maxTicksLimit: 5 } }
            },
            layout: {
                padding: { left: -5, right: 10, top: 10, bottom: 0 }
            }
        }
    });
}

function renderHistoryList() {
    const container = document.getElementById('ex-detail-history-list');
    const entries = currentExerciseDetail.entries || [];
    
    if (entries.length === 0) {
        container.innerHTML = `<div class="text-center text-sm text-[#64748B] py-8">Kayıt bulunamadı.</div>`;
        document.getElementById('ex-detail-load-more').classList.add('hidden');
        return;
    }

    // Descending for list
    const sorted = [...entries].sort((a,b) => new Date(b.date) - new Date(a.date));
    const visibleEntries = sorted.slice(0, visibleCount);
    
    let html = '';
    
    visibleEntries.forEach(entry => {
        let chgHtml = '';
        if (entry.changePercent > 0) {
            chgHtml = `<div class="text-[#22C55E] text-xs font-bold flex items-center"><span class="material-symbols-rounded text-[14px]">trending_up</span>%${entry.changePercent}</div>`;
        } else if (entry.changePercent < 0) {
            chgHtml = `<div class="text-[#EF4444] text-xs font-bold flex items-center"><span class="material-symbols-rounded text-[14px]">trending_down</span>%${Math.abs(entry.changePercent)}</div>`;
        } else {
            chgHtml = `<div class="text-[#64748B] text-xs font-bold flex items-center"><span class="material-symbols-rounded text-[14px]">trending_flat</span>%0</div>`;
        }
        
        const dateObj = new Date(entry.date);
        const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : entry.date;
        
        const splitText = entry.splitName ? `<span class="bg-[#E2E8F0] text-[#475569] text-[10px] font-bold px-2 py-0.5 rounded-md">${entry.splitName}</span>` : '';
        const prBadge = entry.isPR ? `<span class="text-amber-500 material-symbols-rounded text-lg drop-shadow-md" title="Yeni PR!">workspace_premium</span>` : '';
        
        let setsHtml = '';
        if (entry.sets && entry.sets.length > 0) {
            setsHtml = `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">`;
            entry.sets.forEach((set, idx) => {
                setsHtml += `<div class="bg-[#F8FAFC] px-2 py-1.5 rounded-lg flex justify-between items-center text-xs" style="box-shadow: inset 2px 2px 4px #D1D9E6, inset -2px -2px 4px rgba(255,255,255,0.7);">
                    <span class="font-semibold text-slate-500">${idx+1}. Set</span>
                    <span class="font-bold text-slate-700">${set.reps} <span class="text-[10px] font-normal">x</span> ${set.weight}kg</span>
                </div>`;
            });
            setsHtml += `</div>`;
        }
        
        html += `
        <div class="bg-[#F0F2F8] p-4 rounded-2xl flex flex-col gap-2" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
            <div class="flex justify-between items-start">
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-bold text-slate-800">${dateStr}</span>
                    <div class="flex gap-2">${splitText}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${chgHtml}
                    ${prBadge}
                </div>
            </div>
            <div class="text-sm text-slate-600 mt-1">
                Toplam Hacim: <span class="font-bold text-slate-800">${entry.totalVolume} kg</span>
            </div>
            ${setsHtml}
        </div>
        `;
    });
    
    container.innerHTML = html;
    
    if (visibleCount < sorted.length) {
        document.getElementById('ex-detail-load-more').classList.remove('hidden');
    } else {
        document.getElementById('ex-detail-load-more').classList.add('hidden');
    }
}

window.loadMoreExHistory = function() {
    visibleCount += 10;
    renderHistoryList();
};

window.openProgressDetail = openProgressDetail;
