import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

let currentUid = null;
let currentStatusTab = 'watching'; // watching, watchlist, completed
let movies = [];
let unsubMovies = null;
let dashboardCallback = null;

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
            alert('Ekleme paneli yapım aşamasında. (Tasarım bekleniyor)');
        });
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
        <article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex flex-col cursor-pointer" onclick="alert('Düzenleme paneli yapım aşamasında')">
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
