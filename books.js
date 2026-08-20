import { db } from "./firebase-config.js";
import { collection, onSnapshot, serverTimestamp, doc, updateDoc, writeBatch, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let booksUnsubscribe = null;
let currentBooks = [];
let currentUid = null;
let activeBook = null;

// DOM Elements - Main Screen
const activePagesEl = document.getElementById("book-active-pages");
const activeTotalEl = document.getElementById("book-active-total");
const activeMinusBtn = document.getElementById("book-active-minus");
const activePlusBtn = document.getElementById("book-active-plus");
const progressCircle = document.getElementById("book-progress-circle");
const activeTitleEl = document.getElementById("book-active-title");

const addBookBtn = document.getElementById("add-book-btn-new");
const allListEl = document.getElementById("books-all-list-new");

// DOM Elements - Add Modal
const addModal = document.getElementById("book-add-modal");
const addModalBackdrop = document.getElementById("book-add-backdrop");
const addModalContent = document.getElementById("book-add-modal-content");
const addSaveBtn = document.getElementById("book-add-save");
const titleInput = document.getElementById("book-add-title");
const authorInput = document.getElementById("book-add-author");
const pagesInput = document.getElementById("book-add-pages");
const addStatusRadios = document.querySelectorAll(".book-add-status-radio");
const closeAddHandle = document.getElementById("close-book-add-handle");

// DOM Elements - Edit Modal
const editModal = document.getElementById("book-edit-modal");
const editModalBackdrop = document.getElementById("book-edit-backdrop");
const editModalContent = document.getElementById("book-edit-modal-content");
const editSaveBtn = document.getElementById("book-edit-save");
const editDeleteBtn = document.getElementById("book-edit-delete");
const editTitleInput = document.getElementById("book-edit-title");
const editAuthorInput = document.getElementById("book-edit-author");
const editPagesInput = document.getElementById("book-edit-pages");
const editStatusRadios = document.querySelectorAll(".book-edit-status-radio");
const closeEditHandle = document.getElementById("close-book-edit-handle");

let currentEditId = null;

// Helper function to open modal
function openModal(modal, backdrop, content) {
    if(!modal) return;
    modal.classList.remove("hidden");
    setTimeout(() => {
        if(backdrop) backdrop.classList.remove("opacity-0");
        if(content) content.classList.remove("translate-y-full");
    }, 10);
}

// Helper function to close modal
function closeModal(modal, backdrop, content) {
    if(!modal) return;
    if(backdrop) backdrop.classList.add("opacity-0");
    if(content) content.classList.add("translate-y-full");
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 300);
}

function openAddModal() {
    titleInput.value = "";
    authorInput.value = "";
    pagesInput.value = "";
    addStatusRadios.forEach(radio => {
        if(radio.value === "to_read") radio.checked = true;
    });
    openModal(addModal, addModalBackdrop, addModalContent);
}

function openEditModal(book) {
    currentEditId = book.id;
    editTitleInput.value = book.title || "";
    editAuthorInput.value = book.author || "";
    editPagesInput.value = book.totalPages || "";
    
    editStatusRadios.forEach(radio => {
        if(radio.value === book.status) radio.checked = true;
    });
    openModal(editModal, editModalBackdrop, editModalContent);
}

export function initBooks(uid, onChangeCallback) {
    currentUid = uid;
    
    // Bind Add Quick Button
    if(addBookBtn) addBookBtn.onclick = openAddModal;
    
    // Close handles
    if(closeAddHandle) closeAddHandle.onclick = () => closeModal(addModal, addModalBackdrop, addModalContent);
    if(closeEditHandle) closeEditHandle.onclick = () => closeModal(editModal, editModalBackdrop, editModalContent);

    // Close on backdrop click
    if(addModalBackdrop) {
        addModalBackdrop.onclick = () => closeModal(addModal, addModalBackdrop, addModalContent);
    }
    if(editModalBackdrop) {
        editModalBackdrop.onclick = () => closeModal(editModal, editModalBackdrop, editModalContent);
    }

    // Add Book Save
    if(addSaveBtn) {
        addSaveBtn.onclick = async () => {
            const title = titleInput.value.trim();
            const author = authorInput.value.trim();
            const totalPages = parseInt(pagesInput.value) || 0;
            
            let status = "to_read";
            addStatusRadios.forEach(radio => { if(radio.checked) status = radio.value; });

            if(!title || !author || totalPages <= 0) {
                alert("Lütfen tüm alanları geçerli şekilde doldurun.");
                return;
            }

            try {
                addSaveBtn.textContent = "...";
                const booksRef = collection(db, "users", currentUid, "books");
                await addDoc(booksRef, {
                    title,
                    author,
                    totalPages,
                    readPages: 0,
                    status,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                closeModal(addModal, addModalBackdrop, addModalContent);
            } catch(e) {
                console.error(e);
                alert("Eklenirken hata oluştu!");
            } finally {
                addSaveBtn.textContent = "Ekle";
            }
        };
    }

    // Edit Book Save
    if(editSaveBtn) {
        editSaveBtn.onclick = async () => {
            if(!currentEditId) return;
            const title = editTitleInput.value.trim();
            const author = editAuthorInput.value.trim();
            const totalPages = parseInt(editPagesInput.value) || 0;
            
            let status = "to_read";
            editStatusRadios.forEach(radio => { if(radio.checked) status = radio.value; });

            if(!title || !author || totalPages <= 0) {
                alert("Lütfen tüm alanları geçerli şekilde doldurun.");
                return;
            }
            
            // Validate readPages vs new totalPages
            const currentBook = currentBooks.find(b => b.id === currentEditId);
            let safeReadPages = currentBook ? currentBook.readPages : 0;
            if(safeReadPages > totalPages) safeReadPages = totalPages;

            try {
                editSaveBtn.textContent = "...";
                const docRef = doc(db, "users", currentUid, "books", currentEditId);
                await updateDoc(docRef, {
                    title,
                    author,
                    totalPages,
                    readPages: safeReadPages,
                    status,
                    updatedAt: serverTimestamp()
                });
                closeModal(editModal, editModalBackdrop, editModalContent);
            } catch(e) {
                console.error(e);
                alert("Güncellenirken hata oluştu!");
            } finally {
                editSaveBtn.textContent = "Güncelle";
            }
        };
    }

    // Delete Book
    if(editDeleteBtn) {
        editDeleteBtn.onclick = async () => {
            if(!currentEditId) return;
            if(!confirm("Bu kitabı silmek istediğinize emin misiniz?")) return;
            try {
                editDeleteBtn.innerHTML = "...";
                const docRef = doc(db, "users", currentUid, "books", currentEditId);
                await deleteDoc(docRef);
                closeModal(editModal, editModalBackdrop, editModalContent);
            } catch(e) {
                console.error(e);
                alert("Silinirken hata oluştu!");
            } finally {
                editDeleteBtn.innerHTML = `<span class="material-symbols-rounded text-lg">delete</span> Sil`;
            }
        };
    }

    // Active Book Controls (+ / -)
    if(activeMinusBtn) {
        activeMinusBtn.onclick = async () => {
            if(!activeBook) return;
            if(activeBook.readPages <= 0) return;
            const newPages = activeBook.readPages - 1;
            await updateActiveBookPages(newPages);
        };
    }

    if(activePlusBtn) {
        activePlusBtn.onclick = async () => {
            if(!activeBook) return;
            if(activeBook.readPages >= activeBook.totalPages) return;
            const newPages = activeBook.readPages + 1;
            await updateActiveBookPages(newPages);
        };
    }

    // Setup listener
    if (booksUnsubscribe) {
        booksUnsubscribe();
    }
    
    const booksRef = collection(db, "users", uid, "books");
    booksUnsubscribe = onSnapshot(booksRef, (snapshot) => {
        currentBooks = [];
        snapshot.forEach(docSnap => {
            currentBooks.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Sort by updatedAt descending
        currentBooks.sort((a, b) => {
            const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
            const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
            return timeB - timeA;
        });
        
        renderBooksView();
        
        if (onChangeCb) onChangeCb();
    }, (error) => {
        console.error("Books Snapshot Error:", error);
    });
    
    registerListener("books", booksUnsubscribe);
}

async function updateActiveBookPages(newPages) {
    if(!activeBook) return;
    try {
        const docRef = doc(db, "users", currentUid, "books", activeBook.id);
        
        // Also auto-update status if completed
        let newStatus = activeBook.status;
        if(newPages >= activeBook.totalPages && activeBook.status !== "finished") {
            newStatus = "finished";
        } else if (newPages > 0 && activeBook.status === "to_read") {
            newStatus = "reading";
        }

        await updateDoc(docRef, {
            readPages: newPages,
            status: newStatus,
            updatedAt: serverTimestamp()
        });
    } catch(e) {
        console.error(e);
    }
}

function renderBooksView() {
    // 1. Determine active book
    // Priorities: 
    // - Most recently updated book with status 'reading'
    // - If none, most recently updated book overall that isn't 'finished'
    
    let candidates = currentBooks.filter(b => b.status === "reading");
    if(candidates.length === 0) {
        candidates = currentBooks.filter(b => b.status === "to_read");
    }
    
    activeBook = candidates.length > 0 ? candidates[0] : null;
    
    updateActiveBookUI();
    renderAllBooksList();
}

function updateActiveBookUI() {
    if(!activePagesEl || !activeTotalEl || !progressCircle || !activeTitleEl) return;
    
    if(!activeBook) {
        activePagesEl.textContent = "0";
        activeTotalEl.textContent = "of 0 sayfa";
        activeTitleEl.textContent = "Aktif Kitap Yok";
        progressCircle.style.strokeDashoffset = "314.159"; // Empty
        activeMinusBtn.style.opacity = "0.5";
        activePlusBtn.style.opacity = "0.5";
        return;
    }
    
    const read = activeBook.readPages || 0;
    const total = activeBook.totalPages || 1;
    activePagesEl.textContent = read;
    activeTotalEl.textContent = `of ${total} sayfa`;
    activeTitleEl.textContent = activeBook.title || "İsimsiz";
    
    // Calculate stroke dashoffset for circumference 314.159 (radius 50)
    // Formula: circumference - (percentage * circumference)
    const percentage = Math.min(1, Math.max(0, read / total));
    const circumference = 314.159;
    const offset = circumference - (percentage * circumference);
    progressCircle.style.strokeDashoffset = offset;
    
    activeMinusBtn.style.opacity = read <= 0 ? "0.5" : "1";
    activePlusBtn.style.opacity = read >= total ? "0.5" : "1";
}


function renderAllBooksList() {
    if(!allListEl) return;
    
    allListEl.innerHTML = "";
    
    if(currentBooks.length === 0) {
        allListEl.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">Henüz kitap eklemedin.</p>`;
        return;
    }
    
    currentBooks.forEach(book => {
        const safeTitle = escapeHtml(book.title || "İsimsiz");
        const safeAuthor = escapeHtml(book.author || "Yazar Yok");
        
        let statusColor = "text-[#64748B]";
        let statusText = "Okunacak";
        
        if(book.status === "reading") {
            statusColor = "text-[#3B82F6]";
            statusText = "Okuyorum";
        } else if (book.status === "finished") {
            statusColor = "text-[#22C55E]";
            statusText = "Bitti";
        }
        
        const wrapper = document.createElement("div");
        wrapper.className = "relative w-full overflow-hidden rounded-2xl mb-4";
        wrapper.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        
        // Background Actions (Edit & Delete)
        const actionsHtml = `
            <div class="absolute inset-y-0 right-0 flex items-center justify-end px-3 gap-3 bg-gray-100 w-full z-0">
                <button class="edit-book-btn w-10 h-10 rounded-full bg-silk-blue text-white flex items-center justify-center shadow-md active:scale-95 transition-transform" data-id="${book.id}">
                    <span class="material-symbols-rounded text-lg">edit</span>
                </button>
                <button class="delete-book-btn w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform" data-id="${book.id}">
                    <span class="material-symbols-rounded text-lg">delete</span>
                </button>
            </div>
        `;
        
        // Foreground Card
        const cardHtml = `
            <div class="card-content relative z-10 bg-[#F7F9FF] rounded-2xl p-4 flex gap-4 items-center cursor-pointer transition-transform duration-300" style="touch-action: pan-y;">
                <div class="w-12 h-12 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <span class="material-symbols-rounded text-[#3B82F6] text-2xl">menu_book</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-[#1E293B] truncate">${safeTitle}</h4>
                    <p class="text-xs text-[#64748B] truncate">${safeAuthor}</p>
                </div>
                <div class="shrink-0 flex flex-col items-end gap-1">
                    <span class="text-xs font-bold ${statusColor}">${statusText}</span>
                    <span class="text-xs font-semibold text-[#1E293B]">${book.readPages || 0} / ${book.totalPages || 0}</span>
                </div>
            </div>
        `;
        
        wrapper.innerHTML = actionsHtml + cardHtml;
        
        const cardContent = wrapper.querySelector('.card-content');
        const editBtn = wrapper.querySelector('.edit-book-btn');
        const deleteBtn = wrapper.querySelector('.delete-book-btn');
        
        // --- Swipe Logic ---
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        const threshold = -80; // Slide left by 80px to show buttons
        let isSwiped = false;
        
        cardContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            cardContent.style.transition = 'none';
        }, { passive: true });
        
        cardContent.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diffX = currentX - startX;
            
            // Allow swiping left (negative diff) and right (if already swiped)
            if (!isSwiped && diffX < 0) {
                // Dragging left from neutral
                const moveX = Math.max(diffX, -100); 
                cardContent.style.transform = `translateX(${moveX}px)`;
            } else if (isSwiped && diffX > 0) {
                // Dragging right from swiped
                const moveX = Math.min(threshold + diffX, 0);
                cardContent.style.transform = `translateX(${moveX}px)`;
            }
        }, { passive: true });
        
        cardContent.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            cardContent.style.transition = 'transform 0.3s ease-out';
            
            let diffX = currentX - startX;
            if (!isSwiped && diffX < -30) {
                // Trigger swipe open
                isSwiped = true;
                cardContent.style.transform = `translateX(${threshold}px)`;
            } else if (isSwiped && diffX > 30) {
                // Trigger swipe close
                isSwiped = false;
                cardContent.style.transform = 'translateX(0px)';
            } else {
                // Snap back to current state
                cardContent.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
                
                // If it was a tap (very small movement), trigger click
                if (Math.abs(diffX) < 10) {
                    // Set as active book
                    activeBook = book;
                    updateActiveBookUI();
                    
                    // Close any open swipes
                    document.querySelectorAll('.card-content').forEach(el => {
                        el.style.transform = 'translateX(0px)';
                    });
                    isSwiped = false;
                }
            }
        });
        
        // Desktop click fallback (if touch is not used)
        cardContent.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isDragging = true;
            cardContent.style.transition = 'none';
        });
        cardContent.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            currentX = e.clientX;
            let diffX = currentX - startX;
            if (!isSwiped && diffX < 0) {
                cardContent.style.transform = `translateX(${Math.max(diffX, -100)}px)`;
            } else if (isSwiped && diffX > 0) {
                cardContent.style.transform = `translateX(${Math.min(threshold + diffX, 0)}px)`;
            }
        });
        cardContent.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            cardContent.style.transition = 'transform 0.3s ease-out';
            let diffX = currentX - startX;
            if (!isSwiped && diffX < -30) {
                isSwiped = true;
                cardContent.style.transform = `translateX(${threshold}px)`;
            } else if (isSwiped && diffX > 30) {
                isSwiped = false;
                cardContent.style.transform = 'translateX(0px)';
            } else {
                cardContent.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
                if (Math.abs(diffX) < 10) {
                    activeBook = book;
                    updateActiveBookUI();
                    document.querySelectorAll('.card-content').forEach(el => {
                        el.style.transform = 'translateX(0px)';
                    });
                    isSwiped = false;
                }
            }
        });
        cardContent.addEventListener('mouseleave', () => {
             if(isDragging) {
                isDragging = false;
                cardContent.style.transition = 'transform 0.3s ease-out';
                cardContent.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
             }
        });
        
        // Actions
        editBtn.onclick = () => {
            openEditModal(book);
            cardContent.style.transform = 'translateX(0px)';
            isSwiped = false;
        };
        
        deleteBtn.onclick = async () => {
            if(!confirm("Bu kitabı silmek istediğinize emin misiniz?")) return;
            try {
                const docRef = doc(db, "users", currentUid, "books", book.id);
                await deleteDoc(docRef);
            } catch (e) {
                console.error(e);
            }
        };
        
        allListEl.appendChild(wrapper);
    });
}

export function clearBooks() {
    if (booksUnsubscribe) {
        booksUnsubscribe();
        booksUnsubscribe = null;
    }
    currentBooks = [];
    if(allListEl) allListEl.innerHTML = "";
}
