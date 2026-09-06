import { db } from "./firebase-config.js";
import { collection, onSnapshot, serverTimestamp, doc, updateDoc, writeBatch, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let moviesUnsubscribe = null;
let currentMovies = [];
let currentUid = null;
let onChangeCb = null;

let currentEditingId = null; // for edit modal

let currentFilterCategory = 'Tümü';
let currentSearchTerm = '';
window.applyMovieFilters = (category, searchTerm) => {
    currentFilterCategory = category;
    currentSearchTerm = searchTerm;
    renderMoviesView();
};


// DOM Elements - Main Screen
const addMovieBtn = document.getElementById("add-movie-btn-new");
const allListEl = document.getElementById("movies-all-list-new");

// DOM Elements - Add Modal
const addModal = document.getElementById("movie-add-modal");
const addBackdrop = document.getElementById("movie-add-backdrop");
const addContent = document.getElementById("movie-add-modal-content");
const addCloseHandle = document.getElementById("close-movie-add-handle");
const addType = document.getElementById("movie-add-type");
const addTitle = document.getElementById("movie-add-title");
const addTotalSeason = document.getElementById("movie-add-total-season");
const addTotalEpisode = document.getElementById("movie-add-total-episode");
const addSeason = document.getElementById("movie-add-season");
const addEpisode = document.getElementById("movie-add-episode");
const addSeriesFields = document.getElementById("movie-add-series-fields");
const addSaveBtn = document.getElementById("movie-add-save");

// DOM Elements - Edit Modal
const editModal = document.getElementById("movie-edit-modal");
const editBackdrop = document.getElementById("movie-edit-backdrop");
const editContent = document.getElementById("movie-edit-modal-content");
const editCloseHandle = document.getElementById("close-movie-edit-handle");
const editType = document.getElementById("movie-edit-type");
const editTitle = document.getElementById("movie-edit-title");
const editTotalSeason = document.getElementById("movie-edit-total-season");
const editTotalEpisode = document.getElementById("movie-edit-total-episode");
const editSeason = document.getElementById("movie-edit-season");
const editEpisode = document.getElementById("movie-edit-episode");
const editSeriesFields = document.getElementById("movie-edit-series-fields");
const editSaveBtn = document.getElementById("movie-edit-save");
const editDeleteBtn = document.getElementById("movie-edit-delete");


export function initMovies(uid, onChangeCallback) {
    currentUid = uid;
    onChangeCb = onChangeCallback;

    // Bind Add Quick Button
    if(addMovieBtn) addMovieBtn.onclick = openAddModal;

    // Bind Modal Closers
    if(addBackdrop) addBackdrop.onclick = closeAddModal;
    if(addCloseHandle) addCloseHandle.onclick = closeAddModal;
    if(editBackdrop) editBackdrop.onclick = closeEditModal;
    if(editCloseHandle) editCloseHandle.onclick = closeEditModal;

        function updateAddSeriesFieldsVisibility() {
        const type = addType ? addType.value : 'series';
        const statusEl = document.querySelector('input[name="movie-add-status"]:checked');
        const status = statusEl ? statusEl.value : 'watching';
        if (type === 'series' && status === 'watching') {
            if(addSeriesFields) if(typeof updateAddSeriesFieldsVisibility === 'function') updateAddSeriesFieldsVisibility();
        } else {
            if(addSeriesFields) addSeriesFields.style.display = 'none';
        }
    }

    function updateEditSeriesFieldsVisibility() {
        const type = editType ? editType.value : 'series';
        const statusEl = document.querySelector('input[name="movie-edit-status"]:checked');
        const status = statusEl ? statusEl.value : 'watching';
        if (type === 'series' && status === 'watching') {
            if(editSeriesFields) editSeriesFields.style.display = 'flex';
        } else {
            if(editSeriesFields) editSeriesFields.style.display = 'none';
        }
    }

    if(addType) addType.onchange = updateAddSeriesFieldsVisibility;
    const addStatusRadios = document.querySelectorAll('input[name="movie-add-status"]');
    addStatusRadios.forEach(radio => radio.addEventListener('change', updateAddSeriesFieldsVisibility));

    if(editType) editType.onchange = updateEditSeriesFieldsVisibility;
    const editStatusRadios = document.querySelectorAll('input[name="movie-edit-status"]');
    editStatusRadios.forEach(radio => radio.addEventListener('change', updateEditSeriesFieldsVisibility));

    // Bind Saves
    if(addSaveBtn) addSaveBtn.onclick = saveAddMovie;
    if(editSaveBtn) editSaveBtn.onclick = saveEditMovie;
    if(editDeleteBtn) editDeleteBtn.onclick = deleteMovie;

    const moviesRef = collection(db, "users", uid, "movies");

    moviesUnsubscribe = onSnapshot(moviesRef, (snapshot) => {
        currentMovies = [];
        snapshot.forEach(docSnap => {
            currentMovies.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort: by updatedAt descending
        currentMovies.sort((a, b) => {
            const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
            const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
            return timeB - timeA;
        });

        renderMoviesView();

        if (onChangeCb) onChangeCb(currentMovies);
    }, (error) => {
        console.error("Filmler çekilemedi:", error);
    });

    registerListener(moviesUnsubscribe);
}

function renderMoviesView() {
    if (!allListEl) return;

    allListEl.innerHTML = '';

    let displayedMovies = currentMovies.filter(movie => {
        let shouldShow = true;
        const type = movie.type;
        const status = movie.status;

        // Missing type or status means it's an old legacy entry
        const isLegacy = (!type || !status);

        if (currentFilterCategory === 'Tümü') {
            shouldShow = true; // All show here, including legacy
        } else if (currentFilterCategory === 'Film') {
            shouldShow = (type === 'movie');
        } else if (currentFilterCategory === 'Dizi') {
            shouldShow = (type === 'series');
        } else if (currentFilterCategory === 'İzlenenler') {
            shouldShow = (status === 'completed');
        } else if (currentFilterCategory === 'İzlenecekler') {
            shouldShow = (status === 'watchlist');
        } else if (currentFilterCategory === 'Devam Edenler') {
            shouldShow = (status === 'watching');
        }

        if (shouldShow && currentSearchTerm !== '') {
            const movieName = (movie.title || 'İsimsiz').toLowerCase();
            if (!movieName.includes(currentSearchTerm)) {
                shouldShow = false;
            }
        }
        return shouldShow;
    });

    if (displayedMovies.length === 0) {
        allListEl.innerHTML = `<p class="text-center text-[#64748B] py-8 text-sm">Hiçbir içerik bulunamadı.</p>`;
        return;
    }

    displayedMovies.forEach(movie => {
        const type = movie.type || 'series';
        const title = escapeHtml(movie.title || 'İsimsiz');

        let subtitleText = '';
        if (type === 'series') {
            const tEp = movie.totalEpisode ? ` / ${movie.totalEpisode}` : '';
            subtitleText = `Sezon ${movie.season || 1} • Bölüm ${movie.episode || 1}${tEp}`;
        } else {
            subtitleText = `Film`;
        }

        let statusText = "";
        let statusColor = "text-[#64748B]";
        if (movie.status === 'watchlist') {
            statusText = "İstek Listesi";
            statusColor = "text-[#F59E0B]";
        } else if (movie.status === 'completed') {
            statusText = "Bitti";
            statusColor = "text-[#22C55E]";
        } else {
            statusText = "İzliyorum";
            statusColor = "text-[#3B82F6]";
        }

        const iconStr = type === 'movie' ? 'movie' : 'live_tv';

        const wrapper = document.createElement("div");
        wrapper.className = "relative w-full overflow-hidden rounded-2xl mb-4";

        // Background Actions (Edit)
        const actionsHtml = `
            <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-0">
                <button class="edit-movie-btn w-12 h-12 rounded-2xl bg-silk-blue text-white flex items-center justify-center active:bg-blue-600 transition-colors" data-id="${movie.id}">
                    <span class="material-symbols-rounded text-xl">edit</span>
                </button>
            </div>
        `;

        // Foreground Card
        const cardHtml = `
            <div class="card-content relative z-10 bg-[#F7F9FF] rounded-2xl p-4 flex gap-4 items-center cursor-pointer transition-transform" style="touch-action: pan-y; box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;" data-swiped="false">
                <div class="w-12 h-12 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <span class="material-symbols-rounded text-[#3B82F6] text-2xl">${iconStr}</span>
                </div>
                <div class="flex flex-col flex-1 min-w-0">
                    <span class="text-sm font-bold text-[#1E293B] truncate">${title}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-[#64748B] truncate">${subtitleText}</span>
                        <span class="text-[10px] ${statusColor} font-bold ml-auto">${statusText}</span>
                    </div>
                </div>
            </div>
        `;

        wrapper.innerHTML = actionsHtml + cardHtml;

        const cardContent = wrapper.querySelector('.card-content');
        const editBtn = wrapper.querySelector('.edit-movie-btn');

        // --- Swipe Logic ---
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        const threshold = -80; // One button of 48px + gap
        let isSwiped = false;

        cardContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
            isDragging = true;
            cardContent.style.transition = 'none';
        }, {passive: true});

        cardContent.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diffX = currentX - startX;

            if (isSwiped) diffX += threshold;
            if (diffX > 0) diffX = 0;
            if (diffX < threshold - 20) diffX = threshold - 20;

            cardContent.style.transform = `translateX(${diffX}px)`;
        }, {passive: true});

        cardContent.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            cardContent.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

            let diffX = currentX - startX;
            if (!isSwiped && diffX < -40) {
                isSwiped = true;
                cardContent.style.transform = `translateX(${threshold}px)`;
            } else if (isSwiped && diffX > 40) {
                isSwiped = false;
                cardContent.style.transform = 'translateX(0px)';
            } else {
                cardContent.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
            }
        });

        // Mouse Fallbacks
        cardContent.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isDragging = true;
            cardContent.style.transition = 'none';
        });

        cardContent.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            currentX = e.clientX;
            let diffX = currentX - startX;
            if (isSwiped) diffX += threshold;
            if (diffX > 0) diffX = 0;
            if (diffX < threshold - 20) diffX = threshold - 20;
            cardContent.style.transform = `translateX(${diffX}px)`;
        });

        cardContent.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            cardContent.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            let diffX = currentX - startX;
            if (!isSwiped && diffX < -40) {
                isSwiped = true;
                cardContent.style.transform = `translateX(${threshold}px)`;
            } else if (isSwiped && diffX > 40) {
                isSwiped = false;
                cardContent.style.transform = 'translateX(0px)';
            } else {
                cardContent.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
            }
        });

        cardContent.addEventListener('mouseleave', () => {
             if(isDragging) {
                isDragging = false;
                cardContent.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                cardContent.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
             }
        });

        // Actions
        editBtn.onclick = () => {
            openEditModal(movie);
            cardContent.style.transform = 'translateX(0px)';
            isSwiped = false;
        };

        allListEl.appendChild(wrapper);
    });
}

// --- ADD MODAL ---
function openAddModal() {
    if(!addModal) return;
    addType.value = '';
    addTitle.value = '';
    addTotalSeason.value = 1;
    addTotalEpisode.value = 10;
    addSeason.value = 1;
    addEpisode.value = 1;
    if(typeof updateAddSeriesFieldsVisibility === 'function') updateAddSeriesFieldsVisibility();
    document.querySelectorAll('input[name="movie-add-status"]').forEach(rb => rb.checked = false);

    addModal.classList.remove('hidden');
    addModal.classList.add('flex');
    requestAnimationFrame(() => {
        if(addBackdrop) addBackdrop.classList.remove('opacity-0');
        if(addContent) {
            addContent.classList.remove('scale-95', 'opacity-0');
            addContent.classList.add('scale-100', 'opacity-100');
        }
    });
}

function closeAddModal() {
    if(addBackdrop) addBackdrop.classList.add('opacity-0');
    if(addContent) {
        addContent.classList.remove('scale-100', 'opacity-100');
        addContent.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
        if(addModal) {
            addModal.classList.remove('flex');
            addModal.classList.add('hidden');
        }
    }, 300);
}

async function saveAddMovie() {
    if(!currentUid) return;
    const title = addTitle.value.trim();
    if(!title) return alert("Lütfen içerik adını giriniz.");

    const type = addType.value;
    const statusEl = document.querySelector('input[name="movie-add-status"]:checked');
    if (!type || !statusEl) return alert("Lütfen tür ve durum seçiniz.");
    const status = statusEl.value;

    const data = {
        title,
        type,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (type === 'series') {
        data.totalSeason = Math.max(1, parseInt(addTotalSeason.value) || 1);
        data.totalEpisode = Math.max(1, parseInt(addTotalEpisode.value) || 1);
        data.season = Math.max(1, parseInt(addSeason.value) || 1);
        data.episode = Math.max(1, parseInt(addEpisode.value) || 1);
    }

    try {
        await addDoc(collection(db, "users", currentUid, "movies"), data);
        closeAddModal();
    } catch(e) {
        console.error(e);
        alert("Eklenirken hata oluÅŸtu.");
    }
}

// --- EDIT MODAL ---
function openEditModal(movie) {
    if(!editModal) return;
    currentEditingId = movie.id;

    editType.value = movie.type || '';
    editTitle.value = movie.title || '';
    if (editType.value === 'series') {
        editSeriesFields.style.display = 'flex';
        editTotalSeason.value = movie.totalSeason || 1;
        editTotalEpisode.value = movie.totalEpisode || 1;
        editSeason.value = movie.season || 1;
        editEpisode.value = movie.episode || 1;
    } else {
        editSeriesFields.style.display = 'none';
        editTotalSeason.value = 1;
        editTotalEpisode.value = 1;
        editSeason.value = 1;
        editEpisode.value = 1;
    }

    document.querySelectorAll('input[name="movie-edit-status"]').forEach(r => r.checked = false);
    const s = movie.status || '';
    if (s) {
        const rb = document.querySelector(`input[name="movie-edit-status"][value="${s}"]`);
        if(rb) rb.checked = true;
    }
    if(typeof updateEditSeriesFieldsVisibility === 'function') updateEditSeriesFieldsVisibility();

    editModal.classList.remove('hidden');
    editModal.classList.add('flex');
    requestAnimationFrame(() => {
        if(editBackdrop) editBackdrop.classList.remove('opacity-0');
        if(editContent) {
            editContent.classList.remove('scale-95', 'opacity-0');
            editContent.classList.add('scale-100', 'opacity-100');
        }
    });
}

function closeEditModal() {
    if(editBackdrop) editBackdrop.classList.add('opacity-0');
    if(editContent) {
        editContent.classList.remove('scale-100', 'opacity-100');
        editContent.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
        if(editModal) {
            editModal.classList.remove('flex');
            editModal.classList.add('hidden');
        }
        currentEditingId = null;
    }, 300);
}

async function saveEditMovie() {
    if(!currentUid || !currentEditingId) return;
    const title = editTitle.value.trim();
    if(!title) return alert("Lütfen içerik adını giriniz.");

    const type = editType.value;
    const statusEl = document.querySelector('input[name="movie-edit-status"]:checked');
    if (!type || !statusEl) return alert("Lütfen tür ve durum seçiniz.");
    const status = statusEl.value;

    const data = {
        title,
        type,
        status,
        updatedAt: serverTimestamp()
    };

    if (type === 'series') {
        data.totalSeason = Math.max(1, parseInt(editTotalSeason.value) || 1);
        data.totalEpisode = Math.max(1, parseInt(editTotalEpisode.value) || 1);
        data.season = Math.max(1, parseInt(editSeason.value) || 1);
        data.episode = Math.max(1, parseInt(editEpisode.value) || 1);
    }

    try {
        await updateDoc(doc(db, "users", currentUid, "movies", currentEditingId), data);
        closeEditModal();
    } catch(e) {
        console.error(e);
        alert("Güncellenirken hata oluştu.");
    }
}

async function deleteMovie() {
    if(!currentUid || !currentEditingId) return;
    if(!confirm("Bu içeriği silmek istediğinize emin misiniz?")) return;

    try {
        await deleteDoc(doc(db, "users", currentUid, "movies", currentEditingId));
        closeEditModal();
    } catch(e) {
        console.error(e);
        alert("Silinirken hata oluştu.");
    }
}

export function clearMovies() {
    if(moviesUnsubscribe) moviesUnsubscribe();
    currentUid = null;
    currentMovies = [];
    currentEditingId = null;
    onChangeCb = null;
}
