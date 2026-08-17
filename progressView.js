/**
 * progressView.js — İlerleme Sayfası
 * 
 * Önce exercise_progress/{exId} dokümanlarından okur (hızlı özet).
 * Her egzersiz için lastWeight, lastReps, recentSessionSummaries gösterir.
 * Eğer summaries >= 2 ise trend/status hesaplar, yoksa salt "son bilgiler" kartı gösterir.
 */
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
let allExerciseData = [];

export async function openProgressView() {
    // Show view
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-progress').classList.remove('hidden');

    const uid = window.currentUid || localStorage.getItem('uid');

    const summaryText = document.getElementById('progress-summary-text');
    const listContainer = document.getElementById('progress-list-container');
    const filtersContainer = document.getElementById('progress-filters-container');

    if (!uid) {
        summaryText.innerText = "Oturum bilgisi bulunamadı. Lütfen çıkıp tekrar giriş yapın.";
        listContainer.innerHTML = '';
        if (filtersContainer) filtersContainer.style.display = "none";
        return;
    }

    summaryText.innerText = "Yükleniyor...";
    listContainer.innerHTML = "";
    if (filtersContainer) filtersContainer.style.display = "none";

    try {
        const progressRef = collection(db, 'users', uid, 'exercise_progress');
        const snap = await getDocs(progressRef);

        console.log('[progressView] exercise_progress doc count:', snap.size);

        allExerciseData = [];

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const exId = docSnap.id;
            const summaries = data.recentSessionSummaries || [];

            console.log(`[progressView] ${exId}: summaries.length=${summaries.length}, lastWeight=${data.lastWeight}`);

            const exName = data.exName || exId;
            const muscleData = window.EXERCISE_MUSCLE_MAPPING?.[exName] || {};
            const primaryMuscle = (muscleData.primary && muscleData.primary[0]) ? muscleData.primary[0] : "diğer";

            // Determine status — needs >= 2 sessions
            const status = summaries.length >= 2 ? detectProgressStatus(summaries) : null;
            const currentE1RM = data.currentE1RM || (summaries.length > 0 ? summaries[summaries.length - 1].e1rm : 0) || 0;

            allExerciseData.push({
                exId,
                exName,
                status,         // null if not enough data
                summaries,
                primaryMuscle,
                currentE1RM,
                lastWeight: data.lastWeight,
                lastReps: data.lastReps,
                personalRecordE1RM: data.personalRecordE1RM || null,
            });
        });

        console.log('[progressView] allExerciseData.length:', allExerciseData.length);

        if (allExerciseData.length === 0) {
            _renderEmptyState(listContainer, summaryText);
            return;
        }

        _renderAll(listContainer, summaryText, filtersContainer);
        _setupFilters();

    } catch (e) {
        console.error("[progressView] Error loading progress data:", e);
        summaryText.innerText = "Veri yüklenirken hata oluştu: " + e.message;
    }
}

function _renderEmptyState(listContainer, summaryText) {
    summaryText.innerText = "Henüz antrenman verisi yok.";
    document.getElementById('progress-count-progressing').innerText = "0";
    document.getElementById('progress-count-plateaued').innerText = "0";
    document.getElementById('progress-count-attention').innerText = "0";

    listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 gap-6 text-center px-6">
            <div class="w-20 h-20 rounded-full bg-primary-container/30 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary" style="font-size: 40px; font-variation-settings: 'FILL' 1;">fitness_center</span>
            </div>
            <div class="flex flex-col gap-2">
                <h3 class="font-headline-sm text-headline-sm text-on-surface">İlk Antrenmanını Bekliyor</h3>
                <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Aktif antrenman sayfasında en az bir seti tamamladıktan sonra burada ilerleme kartlarını göreceksin.
                </p>
            </div>
        </div>
    `;
}

function _renderAll(listContainer, summaryText, filtersContainer, filterStatus = 'all') {
    // Stats only from items with enough data
    const withStatus = allExerciseData.filter(d => d.status !== null);
    const progressing = withStatus.filter(d => d.status === 'progressing').length;
    const plateaued = withStatus.filter(d => d.status === 'plateaued').length;
    const attention = withStatus.filter(d => d.status === 'attention').length;

    document.getElementById('progress-count-progressing').innerText = progressing;
    document.getElementById('progress-count-plateaued').innerText = plateaued;
    document.getElementById('progress-count-attention').innerText = attention;

    const totalTracked = allExerciseData.length;
    if (withStatus.length === 0) {
        summaryText.innerText = `${totalTracked} egzersiz takip ediliyor. Trend analizi için en az 2 antrenman gerekiyor.`;
    } else {
        summaryText.innerText = `${progressing} egzersizde ilerliyorsun, ${plateaued} platoda, ${attention} dikkat gerektiriyor`;
    }

    if (filtersContainer) filtersContainer.style.display = withStatus.length > 0 ? "block" : "none";

    // Apply filter
    let filtered = allExerciseData;
    if (filterStatus !== 'all') {
        filtered = allExerciseData.filter(d => d.status === filterStatus);
    }

    listContainer.innerHTML = "";

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
                <span class="material-symbols-outlined text-outline" style="font-size: 36px;">filter_list_off</span>
                <p class="font-body-md text-body-md text-on-surface-variant">Bu filtre için sonuç yok.</p>
            </div>
        `;
        return;
    }

    // Group by muscle
    const grouped = {};
    filtered.forEach(item => {
        const m = item.primaryMuscle;
        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(item);
    });

    for (const [muscle, items] of Object.entries(grouped)) {
        const muscleNameTR = MUSCLE_NAMES_TR[muscle] || muscle.toUpperCase();
        const itemsHtml = items.map(item => _renderExCard(item)).join('');

        const sectionHtml = `
            <section class="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
                <div class="flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-variant/20">
                    <h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">${muscleNameTR}</h3>
                </div>
                <div class="flex flex-col divide-y divide-surface-variant/30">
                    ${itemsHtml}
                </div>
            </section>
        `;
        listContainer.insertAdjacentHTML('beforeend', sectionHtml);
    }
}

function _renderExCard(item) {
    const hasStatus = item.status !== null;

    const statusColorMap = {
        progressing: { bg: 'bg-tertiary/10', dot: 'bg-tertiary', text: 'text-tertiary', label: '↑ İLERLİYOR' },
        plateaued:   { bg: 'bg-outline/10',  dot: 'bg-outline',  text: 'text-outline',  label: '— PLATODA' },
        attention:   { bg: 'bg-error/10',    dot: 'bg-error',    text: 'text-error',    label: '↓ DİKKAT' },
    };
    const sc = hasStatus ? (statusColorMap[item.status] || statusColorMap.plateaued) : null;

    const lastInfo = item.lastWeight != null
        ? `${item.lastWeight} kg × ${item.lastReps} tekrar`
        : 'Henüz veri yok';

    const prInfo = item.personalRecordE1RM
        ? `PR: ${item.personalRecordE1RM} kg e1RM`
        : '';

    const sparkline = hasStatus && item.summaries.length >= 2 ? _drawSparkline(item.summaries, item.status) : '';

    const statusBadge = hasStatus
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${sc.bg}">
               <span class="w-1.5 h-1.5 rounded-full ${sc.dot}"></span>
               <span class="font-label-sm text-label-sm ${sc.text} tracking-wider">${sc.label}</span>
           </span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container/20">
               <span class="font-label-sm text-label-sm text-primary tracking-wider">YENİ</span>
           </span>`;

    const suggestion = hasStatus ? getSuggestionText(item.status, item.summaries) : null;

    return `
        <div class="p-4 flex items-start justify-between cursor-pointer hover:bg-surface-container-low transition-colors active:bg-surface-container"
             onclick="openProgressExHistory('${item.exId}', '${_escHtml(item.exName)}')">
            <div class="flex flex-col gap-1.5 max-w-[65%]">
                <h4 class="font-body-lg text-body-lg font-semibold text-on-surface leading-tight">${_escHtml(item.exName)}</h4>
                ${statusBadge}
                <span class="font-body-md text-body-md text-on-surface-variant">${lastInfo}</span>
                ${suggestion ? `<p class="font-body-md text-body-md text-outline leading-snug">${suggestion}</p>` : ''}
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
                ${item.currentE1RM ? `<span class="font-headline-sm text-headline-sm text-on-surface">${item.currentE1RM}<span class="text-xs font-normal text-outline ml-0.5">kg</span></span>` : ''}
                ${prInfo ? `<span class="font-label-sm text-label-sm text-on-surface-variant">${prInfo}</span>` : ''}
                ${sparkline}
            </div>
        </div>
    `;
}

function _drawSparkline(summaries, status) {
    const vals = summaries.slice(-5).map(s => s.e1rm).filter(v => v != null && v > 0);
    if (vals.length < 2) return '';

    const min = Math.min(...vals) * 0.97;
    const max = Math.max(...vals) * 1.03;
    const range = max - min || 1;
    const W = 48, H = 18;

    const points = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / range) * H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' L ');

    const colorMap = { progressing: '#4d6357', plateaued: '#727973', attention: '#ba1a1a' };
    const color = colorMap[status] || colorMap.plateaued;

    return `
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="opacity-80">
            <path d="M ${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${parseFloat(vals.length > 0 ? (W).toFixed(1) : '0')}" cy="${(H - ((vals[vals.length-1] - min) / range) * H).toFixed(1)}" r="2.5" fill="${color}"/>
        </svg>
    `;
}

function _escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function _setupFilters() {
    const buttons = document.querySelectorAll('.progress-filter-btn');
    buttons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            document.querySelectorAll('.progress-filter-btn').forEach(b => {
                b.className = 'progress-filter-btn px-4 py-2 rounded-full font-label-md text-label-md bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant active:scale-95 transition-transform';
            });
            e.currentTarget.className = 'progress-filter-btn px-4 py-2 rounded-full font-label-md text-label-md bg-primary-container text-on-primary-container active:scale-95 transition-transform';
            const filter = e.currentTarget.getAttribute('data-filter');
            const summaryText = document.getElementById('progress-summary-text');
            const listContainer = document.getElementById('progress-list-container');
            const filtersContainer = document.getElementById('progress-filters-container');
            _renderAll(listContainer, summaryText, filtersContainer, filter);
        });
    });
}

// Global helper to open exercise history from progress page
window.openProgressExHistory = function(exId, exName) {
    document.getElementById('view-progress').classList.add('hidden');
    window._historyBackTarget = 'progress';
    if (window.openExerciseHistory) {
        window.openExerciseHistory(exId, exName || exId);
    }
};
