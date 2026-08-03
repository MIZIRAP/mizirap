import { db } from "./firebase-config.js";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

let currentUid = null;
let currentStatusTab = 'watching'; // watching, watchlist, completed
let movies = [];
let unsubMovies = null;
let dashboardCallback = null;

let currentEditingId = null; // null for add, string for edit

export function initMovies(uid, callback) {
    currentUid = uid;
    dashboardCallback = callback;

    setupUI();
    listenToMovies();
}

function setupUI() {
    // Tabs
    const tabs = document.querySelectorAll('.movies-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const status = e.currentTarget.getAttribute('data-status');
            currentStatusTab = status;
            updateTabsUI();
            renderMovies();
        });
    });

    // Add Button
    const addBtn = document.getElementById('movies-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.openMoviesModal(null);
        });
    }

    // Modal Title Input updates Cover Letter
    const titleInput = document.getElementById('movies-modal-input-title');
    if (titleInput) {
        titleInput.addEventListener('input', (e) => {
            const letterEl = document.getElementById('movies-modal-cover-letter');
            if (letterEl) {
                const val = e.target.value.trim();
                letterEl.textContent = val.length > 0 ? val.charAt(0).toUpperCase() : 'D';
            }
        });
    }

    // Save Button
    const saveBtn = document.getElementById('movies-modal-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMovie);
    }

    // Delete Button
    const deleteBtn = document.getElementById('movies-modal-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteMovie);
    }
}

window.openMoviesModal = function(movieId) {
    currentEditingId = movieId || null;
    const modal = document.getElementById('movies-modal');
    
    // UI Elements
    const titleInput = document.getElementById('movies-modal-input-title');
    const typeMovie = document.querySelector('input[name="movies-type"][value="movie"]');
    const typeSeries = document.querySelector('input[name="movies-type"][value="series"]');
    const statusWatching = document.querySelector('input[name="movies-status"][value="watching"]');
    const statusWishlist = document.querySelector('input[name="movies-status"][value="watchlist"]');
    const statusCompleted = document.querySelector('input[name="movies-status"][value="completed"]');
    const seasonInput = document.getElementById('movies-modal-season');
    const episodeInput = document.getElementById('movies-modal-episode');
    const subtitle = document.getElementById('movies-modal-subtitle');
    const saveText = document.getElementById('movies-modal-save-text');
    const deleteBtn = document.getElementById('movies-modal-delete-btn');
    const coverLetter = document.getElementById('movies-modal-cover-letter');
    const searchInput = document.getElementById('movies-search-input'); // quick add input

    if (currentEditingId) {
        // Edit Mode
        const item = movies.find(m => m.id === currentEditingId);
        if (item) {
            titleInput.value = item.title || '';
            coverLetter.textContent = item.coverLetter || (item.title ? item.title.charAt(0).toUpperCase() : 'D');
            
            if (item.type === 'movie') typeMovie.checked = true;
            else typeSeries.checked = true;

            if (item.status === 'watchlist') statusWishlist.checked = true;
            else if (item.status === 'completed') statusCompleted.checked = true;
            else statusWatching.checked = true;

            seasonInput.value = item.season || 1;
            episodeInput.value = item.episode || 1;

            subtitle.textContent = "Düzenleniyor";
            saveText.textContent = "Güncelle";
            deleteBtn.style.display = 'flex';
        }
    } else {
        // Add Mode
        let defaultTitle = searchInput && searchInput.value ? searchInput.value : '';
        titleInput.value = defaultTitle;
        coverLetter.textContent = defaultTitle ? defaultTitle.charAt(0).toUpperCase() : 'D';
        typeSeries.checked = true; // default
        statusWatching.checked = true;
        seasonInput.value = 1;
        episodeInput.value = 1;

        subtitle.textContent = "Yeni İçerik Ekle";
        saveText.textContent = "Kaydet";
        deleteBtn.style.display = 'none';
        
        // Clear search input for convenience
        if (searchInput) searchInput.value = '';
    }

    window.toggleMovieType();

    modal.classList.remove('hidden');
    // slight delay for animation if needed, handled by css classes already
};

window.closeMoviesModal = function() {
    const modal = document.getElementById('movies-modal');
    modal.classList.add('hidden');
};

window.toggleMovieType = function() {
    const isSeries = document.querySelector('input[name="movies-type"][value="series"]').checked;
    const seriesInputs = document.getElementById('movies-series-inputs');
    if (isSeries) {
        seriesInputs.classList.remove('hidden');
        seriesInputs.classList.add('flex');
    } else {
        seriesInputs.classList.remove('flex');
        seriesInputs.classList.add('hidden');
    }
};

async function saveMovie() {
    if (!currentUid) return;

    const title = document.getElementById('movies-modal-input-title').value.trim();
    if (!title) {
        alert("Lütfen bir ad girin.");
        return;
    }

    const type = document.querySelector('input[name="movies-type"]:checked').value;
    const status = document.querySelector('input[name="movies-status"]:checked').value;
    const season = document.getElementById('movies-modal-season').value;
    const episode = document.getElementById('movies-modal-episode').value;

    const saveBtn = document.getElementById('movies-modal-save-btn');
    saveBtn.disabled = true;

    try {
        const data = {
            title: title,
            type: type,
            status: status,
            coverLetter: title.charAt(0).toUpperCase()
        };

        if (type === 'series') {
            data.season = parseInt(season) || 1;
            data.episode = parseInt(episode) || 1;
        }

        if (currentEditingId) {
            await updateDoc(doc(db, "users", currentUid, "movies", currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "movies"), data);
        }

        window.closeMoviesModal();
    } catch (e) {
        console.error("Dizi/Film kaydedilemedi:", e);
        alert("Kaydetme işlemi başarısız oldu.");
    } finally {
        saveBtn.disabled = false;
    }
}

async function deleteMovie() {
    if (!currentUid || !currentEditingId) return;
    
    if (confirm("Bu içeriği silmek istediğinize emin misiniz?")) {
        try {
            await deleteDoc(doc(db, "users", currentUid, "movies", currentEditingId));
            window.closeMoviesModal();
        } catch (e) {
            console.error("Dizi/Film silinemedi:", e);
            alert("Silme işlemi başarısız oldu.");
        }
    }
}

function updateTabsUI() {
    const tabs = document.querySelectorAll('.movies-tab');
    tabs.forEach(tab => {
        const status = tab.getAttribute('data-status');
        if (status === currentStatusTab) {
            tab.classList.remove('text-on-surface-variant', 'hover:text-primary');
            tab.classList.add('bg-primary', 'text-on-primary');
        } else {
            tab.classList.remove('bg-primary', 'text-on-primary');
            tab.classList.add('text-on-surface-variant', 'hover:text-primary');
        }
    });
}

function listenToMovies() {
    if (!currentUid) return;

    const moviesRef = collection(db, "users", currentUid, "movies");
    
    if (unsubMovies) unsubMovies();

    unsubMovies = onSnapshot(moviesRef, (snapshot) => {
        movies = [];
        snapshot.forEach(doc => {
            movies.push({ id: doc.id, ...doc.data() });
        });
        
        // Notify dashboard
        if (dashboardCallback) {
            dashboardCallback(movies);
        }

        renderMovies();
    }, (error) => {
        console.error("Dizi/Film verisi çekilemedi:", error);
    });
}

function renderMovies() {
    const container = document.getElementById('movies-list-container');
    if (!container) return;

    container.innerHTML = '';

    const filtered = movies.filter(m => (m.status || 'watching') === currentStatusTab);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-on-surface-variant/60 py-10">Bu listede henüz içerik yok.</div>`;
        return;
    }

    filtered.forEach(item => {
        const type = item.type || 'series'; // 'movie' or 'series'
        const title = escapeHtml(item.title || 'İsimsiz');
        const coverLetter = item.coverLetter ? escapeHtml(item.coverLetter) : title.charAt(0).toUpperCase();
        const imageUrl = item.imageUrl || null;
        
        let subtitleHtml = '';
        if (type === 'series') {
            if (item.season) {
                subtitleHtml = `<p class="text-caption text-primary">Sezon ${item.season}${item.episode ? ' • ' + item.episode + ' Bölüm' : ''}</p>`;
            } else if (item.episode) {
                subtitleHtml = `<p class="text-caption text-primary">Bölüm ${item.episode}</p>`;
            }
        } else {
            subtitleHtml = `<p class="text-caption text-primary">Film</p>`;
        }

        let coverHtml = '';
        if (imageUrl) {
            coverHtml = `<img alt="${title}" class="w-full h-full object-cover" src="${escapeHtml(imageUrl)}"/>`;
        } else {
            // Determine random color based on letter code for variety if desired, or use default from design.
            const isDark = coverLetter.charCodeAt(0) % 2 === 0;
            const bgClass = isDark ? 'bg-primary/10' : 'bg-tertiary-container/20';
            const textClass = isDark ? 'text-primary' : 'text-tertiary-container';
            coverHtml = `
            <div class="w-full h-full ${bgClass} flex items-center justify-center">
                <span class="text-3xl font-bold ${textClass} opacity-40 italic">${coverLetter}</span>
            </div>`;
        }

        const html = `
        <article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex flex-col cursor-pointer" onclick="window.openMoviesModal('${item.id}')">
            <div class="relative aspect-[3/4]">
                ${coverHtml}
            </div>
            <div class="p-3">
                <h3 class="text-body font-semibold text-on-background line-clamp-1 mb-0.5">${title}</h3>
                ${subtitleHtml}
            </div>
        </article>`;
        
        container.insertAdjacentHTML('beforeend', html);
    });
}
