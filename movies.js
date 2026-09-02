import { db } from "./firebase-config.js";
import { collection, onSnapshot, serverTimestamp, doc, updateDoc, writeBatch, addDoc, deleteDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, getTodayString } from "./utils.js";
import { registerFirestoreListener, unregisterFirestoreListener } from "./listenerManager.js";
import { setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let currentMovies = [];
let currentUid = null;
let activeMovie = null;
let onChangeCb = null;

let currentEditingId = null; // for edit modal

// DOM Elements - Main Screen
const activeSeasonEl = document.getElementById("movie-active-season");
const activeEpisodeEl = document.getElementById("movie-active-episode");
const activeMinusBtn = document.getElementById("movie-active-minus");
const activePlusBtn = document.getElementById("movie-active-plus");
const progressCircle = document.getElementById("movie-progress-circle");
const activeTitleEl = document.getElementById("movie-active-title");

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

    // Bind Type Toggles
    if(addType) {
        addType.onchange = () => {
            if(addType.value === 'series') addSeriesFields.style.display = 'flex';
            else addSeriesFields.style.display = 'none';
        };
    }
    if(editType) {
        editType.onchange = () => {
            if(editType.value === 'series') editSeriesFields.style.display = 'flex';
            else editSeriesFields.style.display = 'none';
        };
    }

    // Bind Saves
    if(addSaveBtn) addSaveBtn.onclick = saveAddMovie;
    if(editSaveBtn) editSaveBtn.onclick = saveEditMovie;
    if(editDeleteBtn) editDeleteBtn.onclick = deleteMovie;

    // Bind Active Controls
    if(activeMinusBtn) activeMinusBtn.onclick = handleActiveMinus;
    if(activePlusBtn) activePlusBtn.onclick = handleActivePlus;

    // Load active movie from local storage
    const storedActive = localStorage.getItem(`activeMovie_${uid}`);
    if (storedActive) {
        activeMovie = JSON.parse(storedActive);
    }

    const moviesRef = query(collection(db, "users", uid, "movies"), orderBy("updatedAt", "desc"), limit(50));

    const setupMoviesListener = () => {
        return onSnapshot(moviesRef, (snapshot) => {
            currentMovies = [];
            snapshot.forEach(docSnap => {
                currentMovies.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Sort: activeMovie always first, then by updatedAt descending
            currentMovies.sort((a, b) => {
                if (activeMovie && a.id === activeMovie.id) return -1;
                if (activeMovie && b.id === activeMovie.id) return 1;

                const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
                const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
                return timeB - timeA;
            });

            // Ensure activeMovie is valid
            if (currentMovies.length > 0) {
                const foundActive = activeMovie ? currentMovies.find(m => m.id === activeMovie.id) : null;
                if (foundActive) {
                    activeMovie = foundActive;
                } else {
                    activeMovie = currentMovies[0];
                    localStorage.setItem(`activeMovie_${currentUid}`, JSON.stringify(activeMovie));
                }
            } else {
                activeMovie = null;
                localStorage.removeItem(`activeMovie_${currentUid}`);
            }

            renderMoviesView();

            if (onChangeCb) onChangeCb(currentMovies);
        }, (error) => {
            console.error("Filmler çekilemedi:", error);
        });
    };

    registerFirestoreListener("view-movies", setupMoviesListener);
}

function updateActiveMovieUI() {
    if (!activeMovie) {
        if(activeTitleEl) activeTitleEl.textContent = "İçerik Seçin";
        if(activeSeasonEl) activeSeasonEl.textContent = "FİLM / DİZİ";
        if(activeEpisodeEl) activeEpisodeEl.textContent = "--";
        if(progressCircle) progressCircle.style.strokeDashoffset = 314.159;
        return;
    }

    if(activeTitleEl) activeTitleEl.textContent = activeMovie.title || "İsimsiz";

    let percentage = 0;
    if (activeMovie.type === 'movie') {
        if(activeSeasonEl) activeSeasonEl.textContent = "FİLM";
        if(activeMovie.status === 'completed') {
            if(activeEpisodeEl) activeEpisodeEl.textContent = "BİTTİ";
            percentage = 100;
        } else if (activeMovie.status === 'watchlist') {
            if(activeEpisodeEl) activeEpisodeEl.textContent = "BEKLİYOR";
            percentage = 0;
        } else {
            if(activeEpisodeEl) activeEpisodeEl.textContent = "İZLİYOR";
            percentage = 50;
        }
    } else {
        // Series
        const season = activeMovie.season || 1;
        const episode = activeMovie.episode || 1;
        const totalSeason = activeMovie.totalSeason || 1;
        const totalEpisode = activeMovie.totalEpisode || 1;

        if(activeSeasonEl) activeSeasonEl.textContent = `SEZON ${season.toString().padStart(2, '0')}`;
        if(activeEpisodeEl) activeEpisodeEl.textContent = `B${episode.toString().padStart(2, '0')}`;

        // Use total episode for progress if available, otherwise just use a small calculation
        if (totalEpisode > 1) {
            percentage = Math.min((episode / totalEpisode) * 100, 100);
        } else {
            percentage = Math.min((episode % 20) * 5, 100);
            if(episode > 0 && percentage === 0) percentage = 100;
        }
    }

    if(progressCircle) {
        const circumference = 314.159; // 2 * pi * 50
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }
    
    updateMovieSummary(percentage);
}

async function handleActiveMinus() {
    if(!activeMovie || !currentUid) return;

    let updates = {};
    if (activeMovie.type === 'series') {
        let ep = (activeMovie.episode || 1) - 1;
        if (ep < 0) ep = 0;
        updates = { episode: ep, updatedAt: serverTimestamp() };
    } else {
        // Movie: cycle status down
        let newStatus = 'watchlist';
        if (activeMovie.status === 'completed') newStatus = 'watching';
        else if (activeMovie.status === 'watching') newStatus = 'watchlist';
        updates = { status: newStatus, updatedAt: serverTimestamp() };
    }

    // Optimistic UI update
    activeMovie = { ...activeMovie, ...updates };
    if(activeMovie.updatedAt) delete activeMovie.updatedAt; // Don't break sync logic if missing
    updateActiveMovieUI();

    try {
        await updateDoc(doc(db, "users", currentUid, "movies", activeMovie.id), updates);
    } catch(e) {
        console.error(e);
    }
}

async function handleActivePlus() {
    if(!activeMovie || !currentUid) return;

    let updates = {};
    if (activeMovie.type === 'series') {
        let ep = (activeMovie.episode || 0) + 1;
        updates = { episode: ep, updatedAt: serverTimestamp() };
    } else {
        // Movie: cycle status up
        let newStatus = 'completed';
        if (activeMovie.status === 'watchlist') newStatus = 'watching';
        else if (activeMovie.status === 'watching') newStatus = 'completed';
        updates = { status: newStatus, updatedAt: serverTimestamp() };
    }

    // Optimistic UI update
    activeMovie = { ...activeMovie, ...updates };
    if(activeMovie.updatedAt) delete activeMovie.updatedAt;
    updateActiveMovieUI();

    try {
        await updateDoc(doc(db, "users", currentUid, "movies", activeMovie.id), updates);
    } catch(e) {
        console.error(e);
    }
}


function renderMoviesView() {
    updateActiveMovieUI();
    if (!allListEl) return;

    allListEl.innerHTML = '';

    if (currentMovies.length === 0) {
        allListEl.innerHTML = `<p class="text-center text-[#64748B] py-8 text-sm">Henüz eklenmiş bir içerik yok.</p>`;
        return;
    }

    currentMovies.forEach(movie => {
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
        const isActive = activeMovie && activeMovie.id === movie.id;

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
            <div class="card-content relative z-10 bg-[#F7F9FF] rounded-2xl p-4 flex gap-4 items-center cursor-pointer transition-transform ${isActive ? 'border-2 border-silk-blue' : ''}" style="touch-action: pan-y; box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;" data-swiped="false">
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

        // Set as active on click (if not swiped)
        cardContent.addEventListener('click', (e) => {
            if (Math.abs(currentX - startX) < 5 && !isSwiped) {
                activeMovie = movie;
                localStorage.setItem(`activeMovie_${currentUid}`, JSON.stringify(activeMovie));

                // Re-sort and re-render
                currentMovies.sort((a, b) => {
                    if (a.id === activeMovie.id) return -1;
                    if (b.id === activeMovie.id) return 1;
                    const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
                    const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
                    return timeB - timeA;
                });
                renderMoviesView();

                // Notify dashboard right away
                if (onChangeCb) onChangeCb(currentMovies);
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
    addType.value = 'series';
    addTitle.value = '';
    addTotalSeason.value = 1;
    addTotalEpisode.value = 10;
    addSeason.value = 1;
    addEpisode.value = 1;
    addSeriesFields.style.display = 'flex';
    document.querySelector('input[name="movie-add-status"][value="watching"]').checked = true;

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
    const status = document.querySelector('input[name="movie-add-status"]:checked').value;

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
        alert("Eklenirken hata oluştu.");
    }
}

// --- EDIT MODAL ---
function openEditModal(movie) {
    if(!editModal) return;
    currentEditingId = movie.id;

    editType.value = movie.type || 'series';
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

    const s = movie.status || 'watching';
    const rb = document.querySelector(`input[name="movie-edit-status"][value="${s}"]`);
    if(rb) rb.checked = true;

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
    const status = document.querySelector('input[name="movie-edit-status"]:checked').value;

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
    unregisterFirestoreListener("view-movies");
    currentUid = null;
    currentMovies = [];
    activeMovie = null;
    currentEditingId = null;
    onChangeCb = null;
}

async function updateMovieSummary(percentage) {
    if (!currentUid) return;
    try {
        const summaryRef = doc(db, "users", currentUid, "summary", `daily-${getTodayString()}`);
        if (activeMovie) {
            let detail = "";
            if (activeMovie.type === 'movie') {
                detail = activeMovie.status === 'completed' ? 'BİTTİ' : (activeMovie.status === 'watchlist' ? 'BEKLİYOR' : 'İZLİYOR');
            } else {
                detail = `S${(activeMovie.season || 1).toString().padStart(2, '0')} B${(activeMovie.episode || 1).toString().padStart(2, '0')}`;
            }
            await setDoc(summaryRef, {
                movies: {
                    activeTitle: activeMovie.title || "İsimsiz",
                    detail: detail,
                    percentage: percentage || 0
                }
            }, { merge: true });
        } else {
            await setDoc(summaryRef, {
                movies: { activeTitle: "İçerik Seçin", detail: "--", percentage: 0 }
            }, { merge: true });
        }
    } catch (e) {
        console.error("Movie summary update error", e);
    }
}

