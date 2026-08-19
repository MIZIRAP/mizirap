import { db } from "./firebase-config.js";
import { collection, onSnapshot, serverTimestamp, doc, updateDoc, writeBatch, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let booksUnsubscribe = null;
let currentBooks = [];
let onChangeCb = null;

const readingListEl = document.getElementById("books-reading-list");
const allGridEl = document.getElementById("books-all-grid");
const addBookBtn = document.getElementById("add-book-btn");

// Modal Elements
const addModal = document.getElementById("book-add-modal");
const addModalContent = document.getElementById("book-add-modal-content");
const addCloseBtn = document.getElementById("book-add-close");
const addCancelBtn = document.getElementById("book-add-cancel");
const addSaveBtn = document.getElementById("book-add-save");
const coverInput = document.getElementById("book-add-cover-input");
const coverPreview = document.getElementById("book-add-cover-preview");
const coverIcon = document.getElementById("book-add-cover-icon");
const coverText = document.getElementById("book-add-cover-text");
const titleInput = document.getElementById("book-add-title");
const authorInput = document.getElementById("book-add-author");
const pagesInput = document.getElementById("book-add-pages");
const addStatusRadios = document.querySelectorAll(".book-add-status-radio");

// View All Modal Elements
const viewAllBtn = document.getElementById("books-view-all-btn");
const viewAllModal = document.getElementById("books-all-modal");
const viewAllClose = document.getElementById("books-all-close");
const viewAllSearch = document.getElementById("books-all-search");
const viewAllTabs = document.querySelectorAll(".books-all-tab");
const viewAllList = document.getElementById("books-all-list");

let viewAllFilter = "all";
let viewAllQuery = "";
let currentUid = null;

// Edit Modal Elements
const editModal = document.getElementById("book-edit-modal");
const editModalContent = document.getElementById("book-edit-modal-content");
const editCloseBtn = document.getElementById("book-edit-close");
const editSaveBtn = document.getElementById("book-edit-save");
const editDeleteBtn = document.getElementById("book-edit-delete");
const editCoverInput = document.getElementById("book-edit-cover-input");
const editCoverPreview = document.getElementById("book-edit-cover-preview");
const editTitleInput = document.getElementById("book-edit-title");
const editAuthorInput = document.getElementById("book-edit-author");
const editPagesInput = document.getElementById("book-edit-pages");
const editStatusRadios = document.querySelectorAll(".book-edit-status-radio");

let currentEditId = null;
let editCoverBase64 = null;

let tempCoverBase64 = null;
let tempStatus = "to_read";

function openAddModal() {
    if(!addModal) return;
    // Reset form
    tempCoverBase64 = null;
    tempStatus = "to_read";
    titleInput.value = "";
    authorInput.value = "";
    pagesInput.value = "";
    coverInput.value = "";
    coverPreview.classList.add("hidden");
    coverIcon.classList.remove("hidden");
    coverText.classList.remove("hidden");
    
    addStatusRadios.forEach(radio => {
        if(radio.value === "to_read") {
            radio.checked = true;
        }
    });

    addModal.classList.remove("hidden");
    void addModal.offsetWidth;
    addModalContent.classList.remove("opacity-0", "scale-95");
    addModalContent.classList.add("opacity-100", "scale-100");
}

function closeAddModal() {
    if(!addModal) return;
    addModalContent.classList.remove("opacity-100", "scale-100");
    addModalContent.classList.add("opacity-0", "scale-95");
    setTimeout(() => {
        addModal.classList.add("hidden");
    }, 200);
}

function openEditModal(book) {
    if(!editModal) return;
    currentEditId = book.id;
    editCoverBase64 = null;
    
    editTitleInput.value = book.title || "";
    editAuthorInput.value = book.author || "";
    editPagesInput.value = book.totalPages || "";
    editCoverPreview.src = book.coverUrl || "";
    
    editStatusRadios.forEach(radio => {
        if(radio.value === book.status) {
            radio.checked = true;
        }
    });

    editModal.classList.remove("hidden");
    void editModal.offsetWidth;
    editModalContent.classList.remove("opacity-0", "scale-95");
    editModalContent.classList.add("opacity-100", "scale-100");
}

function closeEditModal() {
    if(!editModal) return;
    editModalContent.classList.remove("opacity-100", "scale-100");
    editModalContent.classList.add("opacity-0", "scale-95");
    setTimeout(() => {
        editModal.classList.add("hidden");
    }, 200);
}

export function initBooks(uid, onChangeCallback) {
    currentUid = uid;
    onChangeCb = onChangeCallback;
    
    if (addBookBtn) addBookBtn.onclick = openAddModal;
    if (addCloseBtn) addCloseBtn.onclick = closeAddModal;
    if (addCancelBtn) addCancelBtn.onclick = closeAddModal;

    // Handle Image Selection (Resize on client to save space)
    if (coverInput) {
        coverInput.onchange = (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 300;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    tempCoverBase64 = canvas.toDataURL("image/jpeg", 0.7);
                    
                    coverPreview.src = tempCoverBase64;
                    coverPreview.classList.remove("hidden");
                    coverIcon.classList.add("hidden");
                    coverText.classList.add("hidden");
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    // Handle Save
    if (addSaveBtn) {
        addSaveBtn.onclick = async () => {
            const title = titleInput.value.trim();
            const author = authorInput.value.trim();
            const totalPages = parseInt(pagesInput.value) || 0;
            let status = "to_read";
            addStatusRadios.forEach(r => { if(r.checked) status = r.value; });
            
            if(!title || !author || totalPages <= 0) {
                alert("Lütfen kitap adı, yazar ve geçerli bir sayfa sayısı girin.");
                return;
            }

            const defaultCover = "https://lh3.googleusercontent.com/aida-public/AB6AXuB6h1dAGqleftlnXN-fbLQJUq5RotW7XiCCcBLDdxavUALSPKMVZsDo6HoLB7tU-G1V3SFx4de4JdflIEv2VAP7-Yrz7ZfOL5ZJveJB3FsEvFJeXHR83tST6ccMQBROGjcj04oS6jewuLenpuMAMM7TakIAoOC0ujrxfF2NdouzDeBU7BUF2WERNws82yVdqM0rLQgnvKFxH1b-1HXA-8zcutfVn86tTELNgnz-S9WEy4SUNF5VCZP0";
            
            const newBook = {
                title,
                author,
                totalPages,
                readPages: 0,
                status: status,
                coverUrl: tempCoverBase64 || defaultCover,
                createdAt: serverTimestamp()
            };

            const originalText = addSaveBtn.textContent;
            try {
                addSaveBtn.textContent = "...";
                const booksRef = collection(db, "users", uid, "books");
                await addDoc(booksRef, newBook).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                closeAddModal();
            } catch(err) {
                console.error(err);
                alert('Kaydedilirken hata oluştu: ' + err.message);
            } finally {
                addSaveBtn.textContent = originalText;
            }
        };
    }

    if (editCloseBtn) editCloseBtn.onclick = closeEditModal;

    // Handle Edit Image Selection
    if (editCoverInput) {
        editCoverInput.onchange = (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 300;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    editCoverBase64 = canvas.toDataURL("image/jpeg", 0.7);
                    editCoverPreview.src = editCoverBase64;
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    // Handle Edit Save
    if (editSaveBtn) {
        editSaveBtn.onclick = async () => {
            if(!currentEditId) return;
            const title = editTitleInput.value.trim();
            const author = editAuthorInput.value.trim();
            const totalPages = parseInt(editPagesInput.value) || 0;
            let status = "to_read";
            editStatusRadios.forEach(r => { if(r.checked) status = r.value; });
            
            if(!title || !author || totalPages <= 0) {
                alert("Lütfen kitap adı, yazar ve geçerli bir sayfa sayısı girin.");
                return;
            }

            const updateData = {
                title,
                author,
                totalPages,
                status
            };
            if(editCoverBase64) updateData.coverUrl = editCoverBase64;

            const originalText = editSaveBtn.textContent;
            try {
                editSaveBtn.textContent = "...";
                const docRef = doc(db, "users", uid, "books", currentEditId);
                await updateDoc(docRef, updateData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                closeEditModal();
            } catch(err) {
                console.error(err);
                alert('Kaydedilirken hata oluştu: ' + err.message);
            } finally {
                editSaveBtn.textContent = originalText;
            }
        };
    }

    // Handle Edit Delete
    if (editDeleteBtn) {
        editDeleteBtn.onclick = async () => {
            if(!currentEditId) return;
            if(!confirm("Bu kitabı silmek istediğinize emin misiniz?")) return;
            
            const originalHTML = editDeleteBtn.innerHTML;
            try {
                editDeleteBtn.innerHTML = "...";
                const docRef = doc(db, "users", uid, "books", currentEditId);
                await deleteDoc(docRef).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                closeEditModal();
            } catch(err) {
                console.error(err);
                alert('Silinirken hata oluştu: ' + err.message);
            } finally {
                editDeleteBtn.innerHTML = originalHTML;
            }
        };
    }

    // View All Modal Events
    if (viewAllBtn) {
        viewAllBtn.onclick = () => {
            if(!viewAllModal) return;
            renderViewAllList();
            viewAllModal.classList.remove("hidden");
            void viewAllModal.offsetWidth;
            viewAllModal.classList.remove("translate-y-full");
        };
    }

    if (viewAllClose) {
        viewAllClose.onclick = () => {
            if(!viewAllModal) return;
            viewAllModal.classList.add("translate-y-full");
            setTimeout(() => {
                viewAllModal.classList.add("hidden");
            }, 300);
        };
    }

    if (viewAllSearch) {
        viewAllSearch.oninput = (e) => {
            viewAllQuery = e.target.value;
            renderViewAllList();
        };
    }

    viewAllTabs.forEach(tab => {
        tab.onclick = () => {
            viewAllTabs.forEach(t => {
                t.classList.remove("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
                t.classList.add("bg-background shadow-neo-high", "text-on-surface-variant");
            });
            tab.classList.remove("bg-background shadow-neo-high", "text-on-surface-variant");
            tab.classList.add("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
            viewAllFilter = tab.dataset.filter;
            renderViewAllList();
        };
    });

    const booksRef = collection(db, "users", uid, "books");
    
    booksUnsubscribe = registerListener(onSnapshot(booksRef, async (snapshot) => {
        if (snapshot.empty) {
            currentBooks = [];
            renderBooks(uid);
            if (onChangeCb) onChangeCb(currentBooks);
            return;
        }

        currentBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBooks(uid);
        renderViewAllList();
        
        if (onChangeCb) {
            onChangeCb(currentBooks);
        }
    }, (error) => {
        console.error("Kitaplar dinlenirken hata oluştu:", error);
    }));
}

function renderBooks(uid) {
    if (!readingListEl || !allGridEl) return;

    readingListEl.innerHTML = "";
    allGridEl.innerHTML = "";

    const readingBooks = currentBooks.filter(b => b.status === "reading");
    const otherBooks = currentBooks.filter(b => b.status !== "reading"); // Bitenler ve Okunacaklar

    // Render "Şu An Okuyorum" (Reading)
    if (readingBooks.length === 0) {
        readingListEl.innerHTML = `<p class="text-on-surface-variant font-body-md text-sm p-4 text-center">Şu an okuduğun bir kitap yok.</p>`;
    } else {
        readingBooks.forEach(book => {
            const percent = Math.min(100, Math.round(((book.readPages || 0) / (book.totalPages || 1)) * 100));
            const safeTitle = escapeHtml(book.title || "İsimsiz");
            const safeAuthor = escapeHtml(book.author || "Yazar Yok");
            const safeCover = escapeHtml(book.coverUrl || "");

            const card = document.createElement("div");
            card.className = "bg-background shadow-neo-lowest rounded-[32px] p-4 ambient-shadow flex flex-col gap-4 card-press";
            card.innerHTML = `
                <div class="flex gap-4 items-start">
                    <!-- Book Cover -->
                    <div class="w-20 h-28 flex-shrink-0 rounded shadow-sm overflow-hidden bg-background shadow-neo cursor-pointer edit-book-trigger" data-id="${book.id}">
                        <img alt="${safeTitle}" class="object-cover w-full h-full" src="${safeCover}">
                    </div>
                    <!-- Book Info -->
                    <div class="flex flex-col justify-between h-28 flex-grow py-1 cursor-pointer edit-book-trigger" data-id="${book.id}">
                        <div>
                            <h3 class="font-body-lg text-body-lg font-bold text-on-surface line-clamp-2 leading-tight">${safeTitle}</h3>
                            <p class="font-body-md text-body-md text-on-surface-variant mt-1">${safeAuthor}</p>
                        </div>
                        <!-- Progress Area -->
                        <div class="flex flex-col gap-2 mt-auto">
                            <div class="flex justify-between items-end">
                                <span class="font-label-sm text-label-sm text-on-surface-variant">${book.readPages || 0} / ${book.totalPages} sayfa</span>
                                <span class="font-label-sm text-label-sm text-neon-blue font-bold">%${percent}</span>
                            </div>
                            <div class="w-full h-2 bg-gradient-to-r from-neon-blue to-neon-green rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-neon-purple to-neon-blue rounded-full transition-all duration-500" style="width: ${percent}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="border-surface-variant">
                <!-- Update Page Area -->
                <div class="flex items-end gap-3 pt-1">
                    <div class="flex-grow flex flex-col gap-1">
                        <label class="font-label-sm text-label-sm text-on-surface-variant">Kaldığım Sayfa</label>
                        <div class="flex items-center gap-2 bg-background shadow-neo-variant rounded-lg p-1">
                            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-neon-blue to-neon-green text-white hover:bg-secondary-fixed transition-colors active:scale-90 decrease-page-btn" data-id="${book.id}">
                                <span class="material-symbols-rounded text-body-lg">remove</span>
                            </button>
                            <input class="w-full bg-transparent border-none focus:ring-0 text-center text-on-surface font-body-md text-body-md h-8 p-0 page-input" type="number" value="${book.readPages || 0}" data-id="${book.id}">
                            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-neon-blue to-neon-green text-white hover:bg-secondary-fixed transition-colors active:scale-90 increase-page-btn" data-id="${book.id}">
                                <span class="material-symbols-rounded text-body-lg">add</span>
                            </button>
                        </div>
                    </div>
                    <button class="bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-lg h-10 px-5 font-label-md text-label-md flex items-center justify-center hover:bg-background shadow-neo-tint active:scale-95 transition-all shadow-sm update-page-btn" data-id="${book.id}">Güncelle</button>
                </div>
            `;
            readingListEl.appendChild(card);
        });

        // Add listeners for current reading books
        document.querySelectorAll(".decrease-page-btn").forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const input = document.querySelector(`.page-input[data-id="${id}"]`);
                if(input) {
                    let val = parseInt(input.value) || 0;
                    if(val > 0) input.value = val - 1;
                }
            };
        });

        document.querySelectorAll(".increase-page-btn").forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const input = document.querySelector(`.page-input[data-id="${id}"]`);
                if(input) {
                    let val = parseInt(input.value) || 0;
                    const book = readingBooks.find(b => b.id === id);
                    if(book && val < book.totalPages) {
                        input.value = val + 1;
                    }
                }
            };
        });

        document.querySelectorAll(".update-page-btn").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const input = document.querySelector(`.page-input[data-id="${id}"]`);
                if(input) {
                    const newPages = parseInt(input.value) || 0;
                    try {
                        const originalBtnText = btn.textContent;
                        btn.textContent = "...";
                        const book = readingBooks.find(b => b.id === id);
                        const oldPages = book ? (book.readPages || 0) : 0;
                        const diff = newPages - oldPages;
                        
                        // Update the book document
                        await updateDoc(doc(db, "users", uid, "books", id), { readPages: newPages }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                        
                        // Log the reading session if progress was made
                        if (diff > 0) {
                            await addDoc(collection(db, "users", uid, "book_logs"), {
                                pagesRead: diff,
                                bookId: id,
                                createdAt: serverTimestamp()
                            });
                        }
                        
                        // Update status to finished if completed
                        if (book && newPages >= book.totalPages) {
                            await updateDoc(doc(db, "users", uid, "books", id), { status: "finished" }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                        }
                    } catch(err) {
                        console.error(err);
                        alert('Güncellenirken hata oluştu: ' + err.message);
                    } finally {
                        btn.textContent = "Güncelle";
                    }
                }
            };
        });
    }

    // Render "Kitaplarım" (All Other Books)
    if (otherBooks.length === 0) {
        allGridEl.innerHTML = `<p class="col-span-2 text-on-surface-variant font-body-md text-sm p-4 text-center">Diğer kitaplar burada listelenecek.</p>`;
    } else {
        otherBooks.forEach(book => {
            const safeTitle = escapeHtml(book.title || "İsimsiz");
            const safeAuthor = escapeHtml(book.author || "Yazar Yok");
            const safeCover = escapeHtml(book.coverUrl || "");
            
            let statusBadge = "";
            if(book.status === "finished") {
                statusBadge = `<div class="absolute top-2 right-2 bg-background shadow-neo-lowest/90 backdrop-blur-sm px-2 py-1 rounded text-label-sm font-bold text-on-surface shadow-sm">Bitti</div>`;
            } else if (book.status === "to_read") {
                statusBadge = `<div class="absolute top-2 right-2 bg-gradient-to-r from-neon-blue to-neon-green/90 backdrop-blur-sm px-2 py-1 rounded text-label-sm font-bold text-white shadow-sm">Okunacak</div>`;
            }

            const card = document.createElement("div");
            card.className = "bg-background shadow-neo-lowest rounded-[32px] p-3 ambient-shadow flex flex-col gap-3 card-press cursor-pointer edit-book-trigger";
            card.dataset.id = book.id;
            card.innerHTML = `
                <div class="relative w-full aspect-[2/3] rounded overflow-hidden shadow-sm bg-background shadow-neo">
                    <img alt="Book Cover" class="object-cover w-full h-full" src="${safeCover}">
                    ${statusBadge}
                </div>
                <div>
                    <h4 class="font-label-md text-label-md text-on-surface line-clamp-1">${safeTitle}</h4>
                    <p class="font-label-sm text-label-sm text-on-surface-variant mt-0.5 line-clamp-1">${safeAuthor}</p>
                </div>
            `;
            allGridEl.appendChild(card);
        });
    }

    // Edit book triggers
    document.querySelectorAll(".edit-book-trigger").forEach(el => {
        el.onclick = () => {
            const id = el.dataset.id;
            const book = currentBooks.find(b => b.id === id);
            if(book) {
                openEditModal(book);
            }
        };
    });
}

function renderViewAllList() {
    if(!viewAllList) return;
    
    let filtered = currentBooks.filter(b => {
        if(viewAllFilter !== "all" && b.status !== viewAllFilter) return false;
        if(viewAllQuery) {
            const q = viewAllQuery.toLowerCase();
            const title = (b.title || "").toLowerCase();
            const author = (b.author || "").toLowerCase();
            if(!title.includes(q) && !author.includes(q)) return false;
        }
        return true;
    });
    
    viewAllList.innerHTML = "";
    if(filtered.length === 0) {
        viewAllList.innerHTML = `<p class="text-on-surface-variant text-center mt-8">Sonuç bulunamadı.</p>`;
        return;
    }
    
    filtered.forEach(book => {
        const safeTitle = escapeHtml(book.title || "İsimsiz");
        const safeAuthor = escapeHtml(book.author || "Yazar Yok");
        const safeCover = escapeHtml(book.coverUrl || "");
        
        let statusHtml = "";
        if(book.status === "reading") {
            const percent = Math.min(100, Math.round(((book.readPages || 0) / (book.totalPages || 1)) * 100));
            statusHtml = `
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-gradient-to-r from-neon-purple to-neon-blue/10 text-neon-blue">Okuyorum</span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant">%${percent}</span>
                    </div>
                    <div class="w-full h-1.5 bg-background shadow-neo-high rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-neon-purple to-neon-blue rounded-full" style="width: ${percent}%;"></div>
                    </div>
                </div>
            `;
        } else if (book.status === "finished") {
            statusHtml = `
                <div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-background shadow-neo-highest text-on-surface-variant">
                        <span class="material-symbols-rounded text-lg mr-1" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                        Bitti
                    </span>
                </div>
            `;
        } else {
            statusHtml = `
                <div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-tertiary/10 text-neon-green">Okunacak</span>
                </div>
            `;
        }
        
        const card = document.createElement("div");
        card.className = "bg-background shadow-neo-lowest rounded-[32px] p-4 flex gap-4 soft-shadow items-center transition-transform active:scale-[0.98] relative cursor-pointer edit-book-trigger";
        card.dataset.id = book.id;
        card.innerHTML = `
            <button class="absolute top-3 right-3 p-1.5 rounded-full text-on-surface-variant/40 hover:text-error hover:bg-error-container/20 transition-colors z-10 delete-book-btn" data-id="${book.id}">
                <span class="material-symbols-rounded text-lg">delete</span>
            </button>
            <div class="w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-background shadow-neo-high relative">
                <img class="w-full h-full object-cover" src="${safeCover}">
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <h3 class="font-body-lg text-body-lg font-semibold text-on-surface truncate mb-1">${safeTitle}</h3>
                <p class="font-body-md text-body-md text-on-surface-variant truncate mb-3">${safeAuthor}</p>
                ${statusHtml}
            </div>
        `;
        viewAllList.appendChild(card);
    });
    
    // Bind Edit Triggers inside modal
    viewAllList.querySelectorAll(".edit-book-trigger").forEach(el => {
        el.onclick = (e) => {
            if(e.target.closest('.delete-book-btn')) return;
            const id = el.dataset.id;
            const book = currentBooks.find(b => b.id === id);
            if(book) openEditModal(book);
        };
    });
    
    // Bind Delete inside modal
    viewAllList.querySelectorAll(".delete-book-btn").forEach(el => {
        el.onclick = async (e) => {
            e.stopPropagation();
            const id = el.dataset.id;
            if(!confirm("Bu kitabı silmek istediğinize emin misiniz?")) return;
            const originalHTML = el.innerHTML;
            try {
                el.innerHTML = "...";
                const docRef = doc(db, "users", currentUid, "books", id);
                await deleteDoc(docRef).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
            } catch(err) {
                console.error(err);
                alert('Silinirken hata oluştu: ' + err.message);
            } finally {
                el.innerHTML = originalHTML;
            }
        };
    });
    
    // End of list spacing
    const spacing = document.createElement("div");
    spacing.className = "h-8";
    viewAllList.appendChild(spacing);
}

export function clearBooks() {
    if (booksUnsubscribe) {
        booksUnsubscribe();
        booksUnsubscribe = null;
    }
    currentBooks = [];
    if(readingListEl) readingListEl.innerHTML = "";
    if(allGridEl) allGridEl.innerHTML = "";
}
