import { db } from "./firebase-config.js";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let currentUid = null;
let currentStatusTab = 'watching'; // watching, watchlist, completed
let movies = [];
let unsubMovies = null;
let dashboardCallback = null;
let currentSelectedImageFile = null;

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

    // Image Input
    const imgInput = document.getElementById('movies-modal-image-input');
    if (imgInput) {
        imgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                currentSelectedImageFile = file;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const cover = document.getElementById('movies-modal-cover');
                    cover.style.backgroundImage = `url('${e.target.result}')`;
                    cover.style.backgroundSize = 'cover';
                    cover.style.backgroundPosition = 'center';
                    const letter = document.getElementById('movies-modal-cover-letter');
                    if(letter) letter.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
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
            
            const coverEl = document.getElementById('movies-modal-cover');
            if (item.imageUrl) {
                coverEl.style.backgroundImage = `url('${item.imageUrl}')`;
                coverEl.style.backgroundSize = 'cover';
                coverEl.style.backgroundPosition = 'center';
                coverLetter.style.display = 'none';
            } else {
                coverEl.style.backgroundImage = 'none';
                coverLetter.style.display = 'block';
            }
            
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
        coverLetter.style.display = 'block';
        
        const coverEl = document.getElementById('movies-modal-cover');
        coverEl.style.backgroundImage = 'none';
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

    currentSelectedImageFile = null;
    const imgInput = document.getElementById('movies-modal-image-input');
    if(imgInput) imgInput.value = '';

    window.toggleMovieType();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    requestAnimationFrame(() => {
        modal.classList.remove("opacity-0");
        const panel = modal.querySelector("div[role='dialog']");
        if(panel) panel.classList.remove("translate-y-full");
    });
};

window.closeMoviesModal = function() {
    const modal = document.getElementById('movies-modal');
    if (!modal) return;
    modal.classList.add("opacity-0");
    const panel = modal.querySelector("div[role='dialog']");
    if(panel) panel.classList.add("translate-y-full");
    setTimeout(() => {
        modal.classList.remove("flex");
        modal.classList.add("hidden");
    }, 300);
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

    const titleInput = document.getElementById('movies-modal-input-title');
    const type = document.querySelector('input[name="movies-type"]:checked').value;
    const status = document.querySelector('input[name="movies-status"]:checked').value;
    const seasonInput = document.getElementById('movies-modal-season');
    const episodeInput = document.getElementById('movies-modal-episode');
    const saveBtn = document.getElementById('movies-modal-save-btn');

    const inputsToValidate = [{ el: titleInput, type: 'text', required: true }];
    if (type === 'series') {
        inputsToValidate.push({ el: seasonInput, type: 'number', required: true, min: 0 });
        inputsToValidate.push({ el: episodeInput, type: 'number', required: true, min: 0 });
    }

    await handleFormSubmit(saveBtn, inputsToValidate, async () => {
        const title = titleInput.value.trim();
        const season = seasonInput.value;
        const episode = episodeInput.value;

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

        // Upload image if selected (Resize and save as Base64 Data URL)
        if (currentSelectedImageFile) {
            saveBtn.innerHTML = "Görsel İşleniyor...";
            
            // Resize image using Canvas
            const base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 400;
                        const MAX_HEIGHT = 600;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.8)); // compress to 80% quality JPEG
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(currentSelectedImageFile);
            });
            
            data.imageUrl = base64Image;
        }

        if (currentEditingId) {
            await updateDoc(doc(db, "users", currentUid, "movies", currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "movies"), data);
        }

        window.closeMoviesModal();
    });
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

    unsubMovies = registerListener(onSnapshot(moviesRef, (snapshot) => {
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
    }));
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

export function clearMovies() {
    if(unsubMovies) unsubMovies();
    currentUid = null;
    movies = [];
    currentStatusTab = 'watching';
    currentEditingId = null;
    currentSelectedImageFile = null;
}
