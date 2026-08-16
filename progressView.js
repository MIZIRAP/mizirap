import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { detectProgressStatus, getSuggestionText } from "./progressiveOverload.js";

const MUSCLE_NAMES_TR = {
    "chest": "Göğüs",
    "upper-back": "Sırt",
    "lower-back": "Alt Sırt",
    "deltoids": "Omuz",
    "biceps": "Biceps",
    "triceps": "Triceps",
    "quads": "Ön Bacak",
    "hamstrings": "Arka Bacak",
    "glutes": "Kalça",
    "calves": "Kalf",
    "core": "Karın"
};

// State
let allProgressData = []; // Array of processed exercise progress

export async function openProgressView() {
    // Show view
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-progress').classList.remove('hidden');

    const uid = window.currentUid || localStorage.getItem('uid');
    if (!uid) return;

    const summaryText = document.getElementById('progress-summary-text');
    const listContainer = document.getElementById('progress-list-container');
    const filtersContainer = document.getElementById('progress-filters-container');

    summaryText.innerText = "Yükleniyor...";
    listContainer.innerHTML = "";
    filtersContainer.style.display = "none";

    try {
        const progressRef = collection(db, 'users', uid, 'exercise_progress');
        const snap = await getDocs(progressRef);
        
        allProgressData = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            const exId = doc.id;
            const summaries = data.recentSessionSummaries || [];
            
            // At least 2 sessions needed to calculate progress
            if (summaries.length >= 2) {
                const status = detectProgressStatus(summaries);
                if (status) {
                    const muscleData = window.EXERCISE_MUSCLE_MAPPING?.[exId] || {};
                    const primaryMuscle = (muscleData.primary && muscleData.primary[0]) ? muscleData.primary[0] : "diğer";
                    const currentE1RM = data.currentE1RM || summaries[summaries.length - 1].e1rm || 0;

                    allProgressData.push({
                        exId,
                        status,
                        summaries,
                        primaryMuscle,
                        currentE1RM
                    });
                }
            }
        });

        if (allProgressData.length === 0) {
            summaryText.innerText = "İlerleme verisi için en az 2 antrenman tamamlaman gerekiyor.";
            document.getElementById('progress-count-progressing').innerText = "0";
            document.getElementById('progress-count-plateaued').innerText = "0";
            document.getElementById('progress-count-attention').innerText = "0";
            return;
        }

        renderProgressView();
        setupFilters();
    } catch (e) {
        console.error("Error loading progress data:", e);
        summaryText.innerText = "Veri yüklenirken hata oluştu.";
    }
}

function renderProgressView(filterStatus = 'all') {
    const listContainer = document.getElementById('progress-list-container');
    const summaryText = document.getElementById('progress-summary-text');
    
    // Filter data
    const filteredData = filterStatus === 'all' 
        ? allProgressData 
        : allProgressData.filter(d => d.status === filterStatus);

    // Calculate totals based on ALL data for the summary card
    const progressing = allProgressData.filter(d => d.status === 'progressing').length;
    const plateaued = allProgressData.filter(d => d.status === 'plateaued').length;
    const attention = allProgressData.filter(d => d.status === 'attention').length;

    document.getElementById('progress-count-progressing').innerText = progressing;
    document.getElementById('progress-count-plateaued').innerText = plateaued;
    document.getElementById('progress-count-attention').innerText = attention;
    
    summaryText.innerText = `${progressing} egzersizde ilerliyorsun, ${plateaued} platoda, ${attention} dikkat gerektiriyor`;
    document.getElementById('progress-filters-container').style.display = "block";
    listContainer.innerHTML = "";

    // Group by muscle
    const grouped = {};
    filteredData.forEach(item => {
        const m = item.primaryMuscle;
        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(item);
    });

    const getStatusColorClass = (status) => {
        if (status === 'progressing') return 'primary-container';
        if (status === 'plateaued') return 'tertiary-container';
        if (status === 'attention') return 'error';
        return 'primary-container';
    };

    const getStatusLabelTR = (status) => {
        if (status === 'progressing') return 'İLERLİYOR';
        if (status === 'plateaued') return 'PLATODA';
        if (status === 'attention') return 'DİKKAT';
        return '';
    };

    const drawSparkline = (summaries, statusClass) => {
        // Create an SVG line based on the last 5 e1RM values
        if (summaries.length === 0) return '';
        
        // Use up to the last 5 values for the sparkline
        const vals = summaries.slice(-5).map(s => s.e1rm);
        const min = Math.min(...vals) * 0.95; // give some bottom padding
        const max = Math.max(...vals) * 1.05; // give some top padding
        const range = max - min || 1; // avoid div by 0
        
        // SVG box: 48x16
        const width = 48;
        const height = 16;
        
        const points = vals.map((val, idx) => {
            const x = (idx / Math.max(1, vals.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        }).join(" L ");

        return `
            <svg class="w-12 h-4" viewBox="0 0 48 16">
                <path class="trend-line stroke-${statusClass}" d="M ${points}"></path>
            </svg>
        `;
    };

    // Render each group
    for (const [muscle, items] of Object.entries(grouped)) {
        const muscleNameTR = MUSCLE_NAMES_TR[muscle] || muscle.toUpperCase();
        
        let itemsHtml = items.map(item => {
            const statusClass = getStatusColorClass(item.status);
            const statusLabel = getStatusLabelTR(item.status);
            const suggestion = getSuggestionText(item.status, item.summaries);
            
            return `
                <div class="p-4 border-t border-surface-variant flex items-start justify-between cursor-pointer hover:bg-surface-container-low transition-colors" onclick="openProgressExHistory('${item.exId}')">
                    <div class="flex flex-col gap-1 max-w-[70%]">
                        <h4 class="font-body-lg text-body-lg font-medium text-on-surface">${item.exId}</h4>
                        <div class="flex items-center gap-1.5">
                            <div class="w-2 h-2 rounded-full bg-${statusClass}"></div>
                            <span class="font-label-sm text-label-sm text-${statusClass} uppercase tracking-wider">${statusLabel}</span>
                        </div>
                        ${suggestion ? `<p class="font-body-md text-body-md text-outline mt-1 leading-snug">${suggestion}</p>` : ''}
                    </div>
                    <div class="flex flex-col items-end gap-1 shrink-0">
                        <span class="font-headline-sm text-headline-sm text-on-surface">${item.currentE1RM} <span class="text-sm font-normal text-outline">kg</span></span>
                        ${drawSparkline(item.summaries, statusClass)}
                    </div>
                </div>
            `;
        }).join('');

        const sectionHtml = `
            <section class="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
                <!-- Header -->
                <button class="w-full flex items-center justify-between p-4 bg-surface hover:bg-surface-container transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface">${muscleNameTR}</h3>
                    <span class="material-symbols-outlined text-outline">expand_more</span>
                </button>
                <!-- Content -->
                <div class="flex flex-col">
                    ${itemsHtml}
                </div>
            </section>
        `;
        listContainer.insertAdjacentHTML('beforeend', sectionHtml);
    }
}

function setupFilters() {
    const buttons = document.querySelectorAll('.progress-filter-btn');
    buttons.forEach(btn => {
        // Avoid duplicate listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            // Reset all
            document.querySelectorAll('.progress-filter-btn').forEach(b => {
                b.className = 'progress-filter-btn px-4 py-2 rounded-full font-label-md text-label-md bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant active:scale-95 transition-transform';
            });
            // Set active
            e.target.className = 'progress-filter-btn px-4 py-2 rounded-full font-label-md text-label-md bg-primary-container text-on-primary-container active:scale-95 transition-transform';
            
            const filter = e.target.getAttribute('data-filter');
            renderProgressView(filter);
        });
    });
}

// Helper to open history and set back target
window.openProgressExHistory = function(exId) {
    document.getElementById('view-progress').classList.add('hidden');
    window._historyBackTarget = 'progress';
    if (window.openExerciseHistory) {
        window.openExerciseHistory(exId, exId);
    }
}
