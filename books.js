import { db } from "./firebase-config.js";
import { collection, onSnapshot, serverTimestamp, doc, updateDoc, writeBatch, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

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
const statusBtns = document.querySelectorAll(".book-add-status-btn");

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
    updateStatusBtns();

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

function updateStatusBtns() {
    statusBtns.forEach(btn => {
        if(btn.dataset.status === tempStatus) {
            btn.className = "book-add-status-btn flex-1 py-2 px-4 rounded-full font-label-md text-label-md transition-all bg-primary text-on-primary shadow-md";
        } else {
            btn.className = "book-add-status-btn flex-1 py-2 px-4 rounded-full font-label-md text-label-md transition-all bg-surface-dim text-on-surface-variant hover:bg-surface-container-high";
        }
    });
}

export function initBooks(uid, onChangeCallback) {
    onChangeCb = onChangeCallback;
    
    if (addBookBtn) addBookBtn.onclick = openAddModal;
    if (addCloseBtn) addCloseBtn.onclick = closeAddModal;
    if (addCancelBtn) addCancelBtn.onclick = closeAddModal;

    // Status selection
    statusBtns.forEach(btn => {
        btn.onclick = () => {
            tempStatus = btn.dataset.status;
            updateStatusBtns();
        };
    });

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
                status: tempStatus,
                coverUrl: tempCoverBase64 || defaultCover,
                createdAt: serverTimestamp()
            };

            const originalText = addSaveBtn.textContent;
            try {
                addSaveBtn.textContent = "...";
                const booksRef = collection(db, "users", uid, "books");
                await addDoc(booksRef, newBook);
                closeAddModal();
            } catch(err) {
                console.error("Kitap eklerken hata (Test Modu olabilir):", err);
                
                // Hata alsa bile (misafir girişi kısıtlaması vb.) test edebilmek için lokal listeye ekleyip arayüzü güncelleyelim.
                newBook.id = "temp-" + Date.now();
                currentBooks.unshift(newBook);
                renderBooks(uid);
                if (onChangeCb) onChangeCb(currentBooks);
                closeAddModal();
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
                await updateDoc(docRef, updateData);
                closeEditModal();
            } catch(err) {
                console.error("Kitap güncellerken hata (Test Modu olabilir):", err);
                // Test Modu Fallback
                const bIndex = currentBooks.findIndex(b => b.id === currentEditId);
                if(bIndex !== -1) {
                    currentBooks[bIndex] = { ...currentBooks[bIndex], ...updateData };
                }
                renderBooks(uid);
                if(onChangeCb) onChangeCb(currentBooks);
                closeEditModal();
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
                await deleteDoc(docRef);
                closeEditModal();
            } catch(err) {
                console.error("Kitap silerken hata (Test Modu olabilir):", err);
                // Test Modu Fallback
                currentBooks = currentBooks.filter(b => b.id !== currentEditId);
                renderBooks(uid);
                if(onChangeCb) onChangeCb(currentBooks);
                closeEditModal();
            } finally {
                editDeleteBtn.innerHTML = originalHTML;
            }
        };
    }

    const booksRef = collection(db, "users", uid, "books");
    
    booksUnsubscribe = onSnapshot(booksRef, async (snapshot) => {
        if (snapshot.empty) {
            // Veritabanı boşsa test için mock verileri ekleyelim
            console.log("Kitap verisi yok, örnek kitaplar ekleniyor...");
            await addMockBooks(uid);
            return; // Ekleme işlemi bitince onSnapshot tekrar tetiklenecektir.
        }

        currentBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBooks(uid);
        
        if (onChangeCb) {
            onChangeCb(currentBooks);
        }
    }, (error) => {
        console.error("Kitaplar dinlenirken hata oluştu:", error);
    });
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
            card.className = "bg-surface-container-lowest rounded-xl p-4 ambient-shadow flex flex-col gap-4 card-press";
            card.innerHTML = `
                <div class="flex gap-4 items-start">
                    <!-- Book Cover -->
                    <div class="w-20 h-28 flex-shrink-0 rounded shadow-sm overflow-hidden bg-surface-container cursor-pointer edit-book-trigger" data-id="${book.id}">
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
                                <span class="font-label-sm text-label-sm text-primary font-bold">%${percent}</span>
                            </div>
                            <div class="w-full h-2 bg-secondary-container rounded-full overflow-hidden">
                                <div class="h-full bg-primary rounded-full transition-all duration-500" style="width: ${percent}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="border-surface-variant">
                <!-- Update Page Area -->
                <div class="flex items-end gap-3 pt-1">
                    <div class="flex-grow flex flex-col gap-1">
                        <label class="font-label-sm text-label-sm text-on-surface-variant">Kaldığım Sayfa</label>
                        <div class="flex items-center gap-2 bg-surface-variant rounded-lg p-1">
                            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed transition-colors active:scale-90 decrease-page-btn" data-id="${book.id}">
                                <span class="material-symbols-outlined text-body-lg">remove</span>
                            </button>
                            <input class="w-full bg-transparent border-none focus:ring-0 text-center text-on-surface font-body-md text-body-md h-8 p-0 page-input" type="number" value="${book.readPages || 0}" data-id="${book.id}">
                            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed transition-colors active:scale-90 increase-page-btn" data-id="${book.id}">
                                <span class="material-symbols-outlined text-body-lg">add</span>
                            </button>
                        </div>
                    </div>
                    <button class="bg-primary text-on-primary rounded-lg h-10 px-5 font-label-md text-label-md flex items-center justify-center hover:bg-surface-tint active:scale-95 transition-all shadow-sm update-page-btn" data-id="${book.id}">Güncelle</button>
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
                        await updateDoc(doc(db, "users", uid, "books", id), { readPages: newPages });
                        // Update status to finished if completed
                        const book = readingBooks.find(b => b.id === id);
                        if (book && newPages >= book.totalPages) {
                            await updateDoc(doc(db, "users", uid, "books", id), { status: "finished" });
                        }
                    } catch(err) {
                        console.error(err);
                        
                        // Test Modu Fallback
                        const bIndex = currentBooks.findIndex(b => b.id === id);
                        if(bIndex !== -1) {
                            currentBooks[bIndex].readPages = newPages;
                            if (newPages >= currentBooks[bIndex].totalPages) {
                                currentBooks[bIndex].status = "finished";
                            }
                        }
                        renderBooks(uid);
                        if(onChangeCb) onChangeCb(currentBooks);
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
                statusBadge = `<div class="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-on-surface shadow-sm">Bitti</div>`;
            } else if (book.status === "to_read") {
                statusBadge = `<div class="absolute top-2 right-2 bg-secondary-container/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-on-secondary-container shadow-sm">Okunacak</div>`;
            }

            const card = document.createElement("div");
            card.className = "bg-surface-container-lowest rounded-xl p-3 ambient-shadow flex flex-col gap-3 card-press cursor-pointer edit-book-trigger";
            card.dataset.id = book.id;
            card.innerHTML = `
                <div class="relative w-full aspect-[2/3] rounded overflow-hidden shadow-sm bg-surface-container">
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

export function clearBooks() {
    if (booksUnsubscribe) {
        booksUnsubscribe();
        booksUnsubscribe = null;
    }
    currentBooks = [];
    if(readingListEl) readingListEl.innerHTML = "";
    if(allGridEl) allGridEl.innerHTML = "";
}

async function addMockBooks(uid) {
    try {
        const batch = writeBatch(db);
        const booksRef = collection(db, "users", uid, "books");
        
        const mocks = [
            {
                title: "Atomic Habits",
                author: "James Clear",
                coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1bZKu1qwvo2l2EXyx6q9LWqrXWsi__DediqeIvqkOKcD4CvBaI39C0ijIvl3AbkbbwhrR_cs_WU_fEd_JGsN06uRP2wEzlxJ54-OKAHx-uyJOe4RiQ9K5ub6ly4GYxMRgxu-gZYoRsx3oJXy3sxQHQNiQamGU01MBX_qMq4Bi-XPY6d2pyyi098NEOD0HZL_Kq9y-xs1BCVRUB4zKDPgvk3y1QcPssW5UwAWCBdiIHQk9mF9saQ9l",
                status: "reading",
                totalPages: 320,
                readPages: 156,
                createdAt: serverTimestamp()
            },
            {
                title: "Deep Work",
                author: "Cal Newport",
                coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMEjVeorDK8S501P9IMtm_ISG2Hi4HzrPlgGpMA1ryI6opGOnDQ2qZKtDMCz9O_QL-7_wxewypJAPudsHOW4Rn_LiEq8-ki8oL5-RPV3CmljmMYiQWofNff3rdIxPTRXJl9justgl1DJeD2iDWifm2pulaOZmPx7DX4HYvFdUXBh6NPdI0O6BTcZ_JdhR8fI-1-UGeebBj76J9QhnD4IYwgOty0w6AXu4Slag8HcptrNmfa4Ri_LtR",
                status: "finished",
                totalPages: 300,
                readPages: 300,
                createdAt: serverTimestamp()
            },
            {
                title: "Essentialism",
                author: "Greg McKeown",
                coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB6h1dAGqleftlnXN-fbLQJUq5RotW7XiCCcBLDdxavUALSPKMVZsDo6HoLB7tU-G1V3SFx4de4JdflIEv2VAP7-Yrz7ZfOL5ZJveJB3FsEvFJeXHR83tST6ccMQBROGjcj04oS6jewuLenpuMAMM7TakIAoOC0ujrxfF2NdouzDeBU7BUF2WERNws82yVdqM0rLQgnvKFxH1b-1HXA-8zcutfVn86tTELNgnz-S9WEy4SUNF5VCZP0",
                status: "to_read",
                totalPages: 270,
                readPages: 0,
                createdAt: serverTimestamp()
            },
            {
                title: "Dune",
                author: "Frank Herbert",
                coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuABEdTKl-e0YUrxnqN91ZMVDK9pFvhVZYPnnJ_l2WbGqkbOcH7HaD3w_wBXBV8tPLth46VL4be3q7T_TLs4PChRIKbpUATjIfDXVqRuOqhu_2eHmbqONcFb-KQ7oPT7WMVxBHje2vhc3PAnJFPYx0IKfQVjtKxYhkD5D7wthxGLGlt_Vpb50PlGUUV7TAaIvgzicUYO7QgVOsYnk_2GDhLhpBo8rmUxKmylxrdabsJc418mtF2fcuXt",
                status: "to_read",
                totalPages: 412,
                readPages: 0,
                createdAt: serverTimestamp()
            },
            {
                title: "Meditations",
                author: "Marcus Aurelius",
                coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBjQTH5Nxt1BRyE2bBXQsta34zgpdnapfSdxZXv53_JgKLIHuganq86FJWbibm9w9fNCfs6djq9EZtfNoD-aQ-6_9fCWJIpASzaFxTeqs2LY6MSEJqr5u8Ta5Rp2buh6g_U3KzPgD-t8F1dRQH1BANrvkkStUQqqnRieecN1b6twf527tinqEvYatLiWqnA9P-l3JpMpxbd9F99mExoZw2UL35M1vscz7vMZLRxoAswP4CGOMsJgyYy",
                status: "finished",
                totalPages: 200,
                readPages: 200,
                createdAt: serverTimestamp()
            }
        ];

        mocks.forEach(m => {
            const newDoc = doc(booksRef);
            batch.set(newDoc, m);
        });

        await batch.commit();
        console.log("Örnek kitaplar başarıyla eklendi.");
    } catch(err) {
        console.error("Mock kitap ekleme hatası:", err);
    }
}
