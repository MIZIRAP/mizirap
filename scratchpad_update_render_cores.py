import re

with open('/Users/boratektas/Desktop/mizirap/workout.js', 'r') as f:
    content = f.read()

# Replace the existing renderCores function
render_cores_new = """function renderCores() {
    const container = document.getElementById('core-list-container');
    if (!container) return;
    
    if (cores.length === 0) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz hareket eklenmedi.</p>`;
        return;
    }
    
    // Group cores by category
    const categories = ['Alt Karın', 'Üst Karın', 'Yan Karın', 'Bel/Sırt', 'Tüm Karın', 'Diğer'];
    const groupedCores = {};
    categories.forEach(cat => groupedCores[cat] = []);
    
    cores.forEach(core => {
        let cat = core.category || 'Diğer';
        if (!groupedCores[cat]) {
            groupedCores[cat] = [];
        }
        groupedCores[cat].push(core);
    });

    let html = '';
    for (const [catName, items] of Object.entries(groupedCores)) {
        if (items.length === 0) continue;
        
        html += `
        <div class="mb-4 core-category" data-category="${catName}">
            <div class="flex items-center justify-between mb-2 py-1">
                <h2 class="font-title-lg text-on-surface">${catName}</h2>
            </div>
            <div class="flex flex-col gap-2">
        `;
        
        items.forEach(core => {
            let imageHtml = '';
            if (core.imageBase64) {
                imageHtml = `<img alt="${escapeHtml(core.name)}" class="w-full h-full object-cover" src="${core.imageBase64}"/>`;
            } else {
                imageHtml = `<div class="w-full h-full flex items-center justify-center font-bold text-lg">${core.name.charAt(0)}</div>`;
            }
            
            const isFavClass = core.isFav ? 'text-amber-500' : 'text-on-surface-variant';
            const iconFill = core.isFav ? "'FILL' 1" : "'FILL' 0";

            // Note: openCoreSheet needs the core object or ID, we will pass ID.
            html += `
            <div onclick="openCoreSheet(this, '${core.id}')" class="neo-surface p-5 flex items-center justify-between neo-button transition-all core-item mb-4 cursor-pointer" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full neo-inset flex items-center justify-center bg-surface-light text-on-surface overflow-hidden">
                        ${imageHtml}
                    </div>
                    <div>
                        <h4 class="font-semibold text-body-md text-on-surface tracking-tight">${escapeHtml(core.name)}</h4>
                        <p class="text-xs text-on-surface-variant capitalize">Süre: ${core.duration}s</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="p-2 transition-colors core-fav-btn flex items-center justify-center ${isFavClass}" onclick="toggleCoreFav(event, this, '${core.id}')">
                        <span class="material-symbols-outlined text-xl" style="font-variation-settings: ${iconFill}">star</span>
                    </button>
                    <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </div>
            </div>
            `;
        });
        
        html += `
            </div>
        </div>
        `;
    }
    
    container.innerHTML = html;
    if(typeof applyCoreFilters === 'function') {
        applyCoreFilters();
    }
}"""

content = re.sub(r'function renderCores\(\) \{[\s\S]*?(?=function openAddCoreModal|function deleteCore|function handleCoreImageSelect|function filterCores|function renderSessionMovementPicker)', render_cores_new + "\n\n", content)

# I should append the rest of the missing logic to the end of workout.js
append_logic = """
let currentCoreCategory = 'Tümü';
let currentCoreSearchTerm = '';
let currentCoreElement = null;
let currentCoreId = null;

function handleCoreSearch(value) {
    currentCoreSearchTerm = value.toLowerCase().trim();
    applyCoreFilters();
}

function filterCores(category, btnElement) {
    currentCoreCategory = category;
    
    // Update active styling on chips
    const allChips = document.querySelectorAll('#view-core-library .filter-chip');
    allChips.forEach(chip => {
        chip.className = 'neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip';
    });
    
    // Set clicked chip to active
    btnElement.className = 'neo-inset px-5 py-2 rounded-full text-sm font-semibold text-on-surface whitespace-nowrap filter-chip active';

    applyCoreFilters();
}

function applyCoreFilters() {
    const categories = document.querySelectorAll('.core-category');
    
    categories.forEach(catGroup => {
        const catName = catGroup.getAttribute('data-category');
        const items = catGroup.querySelectorAll('.core-item');
        let hasVisibleItems = false;
        
        items.forEach(item => {
            let shouldShow = false;
            
            // 1. Tab Filter
            if (currentCoreCategory === 'Tümü') {
                shouldShow = true;
            } else if (currentCoreCategory === 'Favoriler') {
                const isFav = item.querySelector('.core-fav-btn').classList.contains('text-amber-500');
                shouldShow = isFav;
            } else {
                shouldShow = (catName === currentCoreCategory);
            }
            
            // 2. Search Filter
            if (shouldShow && currentCoreSearchTerm !== '') {
                const name = item.querySelector('h4').innerText.toLowerCase();
                if (!name.includes(currentCoreSearchTerm)) {
                    shouldShow = false;
                }
            }
            
            if (shouldShow) {
                item.classList.remove('hidden');
                hasVisibleItems = true;
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Hide the whole category group if no items are visible
        if (hasVisibleItems) {
            catGroup.classList.remove('hidden');
        } else {
            catGroup.classList.add('hidden');
        }
    });
}

function openCoreSheet(element, id) {
    const ev = window.event;
    if (ev && ev.target.closest('.core-fav-btn')) return;
    currentCoreElement = element;
    currentCoreId = id;
    
    const core = cores.find(c => c.id === id);
    if (!core) return;
    
    // Sync sheet star state with list item star state
    const listFavBtn = element.querySelector('.core-fav-btn');
    const isFav = listFavBtn.classList.contains('text-amber-500');
    const sheetFavBtn = document.getElementById('sheet-core-fav-btn');
    const sheetIcon = sheetFavBtn.querySelector('span');
    
    if (isFav) {
        sheetFavBtn.classList.add('text-amber-500');
        sheetFavBtn.classList.remove('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 1";
    } else {
        sheetFavBtn.classList.remove('text-amber-500');
        sheetFavBtn.classList.add('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 0";
    }

    document.getElementById('sheet-core-name').innerText = core.name;
    
    // Render the interactive SVG instead of static image
    // For core exercises, if renderMuscleMap exists we can use it.
    if (typeof renderMuscleMap === 'function') {
        renderMuscleMap(core.name);
        
        // Initialize Panzoom
        const mapElement = document.getElementById('sheet-core-interactive-map');
        
        // Destroy previous instance if exists to prevent memory leaks
        if (window.currentCorePanzoom) {
            window.currentCorePanzoom.destroy();
        }
        
        window.currentCorePanzoom = Panzoom(mapElement, {
            maxScale: 4,
            minScale: 0.8,
            contain: 'outside',
            step: 0.2
        });
        
        // Bind buttons
        document.getElementById('core-zoom-in').onclick = () => window.currentCorePanzoom.zoomIn();
        document.getElementById('core-zoom-out').onclick = () => window.currentCorePanzoom.zoomOut();
        document.getElementById('core-zoom-reset').onclick = () => window.currentCorePanzoom.reset();
        
        // Add wheel support
        mapElement.parentElement.addEventListener('wheel', window.currentCorePanzoom.zoomWithWheel);
    }

    
    let legendHtml = `
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: #7ea18d;"></div>
            <span class="text-body-md text-on-surface-variant">Ana Kaslar</span>
        </div>
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: #c6ebd5;"></div>
            <span class="text-body-md text-on-surface-variant">Yardımcı Kaslar</span>
        </div>
    `;
    document.getElementById('sheet-core-legend').innerHTML = legendHtml;
    
    const sheet = document.getElementById('core-bottom-sheet');
    const sheetContent = document.getElementById('core-bottom-sheet-content');
    
    sheet.classList.remove('pointer-events-none');
    sheet.classList.add('opacity-100');
    sheet.classList.remove('opacity-0');
    
    setTimeout(() => {
        sheetContent.classList.remove('translate-y-full');
        sheetContent.classList.add('translate-y-0');
    }, 10);
}

function closeCoreSheet() {
    const sheet = document.getElementById('core-bottom-sheet');
    const sheetContent = document.getElementById('core-bottom-sheet-content');
    
    sheetContent.classList.remove('translate-y-0');
    sheetContent.classList.add('translate-y-full');
    
    setTimeout(() => {
        sheet.classList.add('opacity-0');
        sheet.classList.remove('opacity-100');
        sheet.classList.add('pointer-events-none');
    }, 300);
}

function closeCoreSheetOnOutsideClick(event) {
    if (event.target.id === 'core-bottom-sheet') {
        closeCoreSheet();
    }
}

async function toggleCoreFav(event, btn, coreId) {
    if(event) event.stopPropagation();
    
    const core = cores.find(c => c.id === coreId);
    if(!core) return;

    const isFav = !core.isFav; // Toggle state
    core.isFav = isFav; // Optimistic update

    const icon = btn.querySelector('span');
    if (isFav) {
        btn.classList.add('text-amber-500');
        btn.classList.remove('text-on-surface-variant');
        icon.style.fontVariationSettings = "'FILL' 1";
    } else {
        btn.classList.remove('text-amber-500');
        btn.classList.add('text-on-surface-variant');
        icon.style.fontVariationSettings = "'FILL' 0";
    }

    if(currentCoreCategory === 'Favoriler') {
        applyCoreFilters();
    }
    
    // Save to Firebase
    try {
        const coreRef = doc(db, "users", auth.currentUser.uid, "cores", coreId);
        await updateDoc(coreRef, { isFav: isFav });
    } catch(err) {
        console.error("Error updating fav:", err);
    }
}

function toggleCoreSheetFav() {
    if (!currentCoreElement || !currentCoreId) return;
    const listFavBtn = currentCoreElement.querySelector('.core-fav-btn');
    const sheetFavBtn = document.getElementById('sheet-core-fav-btn');
    const sheetIcon = sheetFavBtn.querySelector('span');
    
    // Toggle the list item star
    toggleCoreFav(null, listFavBtn, currentCoreId);
    
    // Update sheet star visually
    const isFav = listFavBtn.classList.contains('text-amber-500');
    if (isFav) {
        sheetFavBtn.classList.add('text-amber-500');
        sheetFavBtn.classList.remove('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 1";
    } else {
        sheetFavBtn.classList.remove('text-amber-500');
        sheetFavBtn.classList.add('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 0";
    }
}

// category grid logic for Add Core Sheet
document.addEventListener('DOMContentLoaded', () => {
    const catBtns = document.querySelectorAll('#coreCategoryGrid .category-select-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            catBtns.forEach(b => {
                b.classList.remove('border-primary', 'text-primary', 'bg-primary/5');
            });
            // Add to clicked
            btn.classList.add('border-primary', 'text-primary', 'bg-primary/5');
            document.getElementById('newCoreCategory').value = btn.getAttribute('data-cat');
        });
    });
});

function openAddCoreSheet() {
    editingCoreId = null;
    editingCoreIsDefault = false;
    currentCoreImageBase64 = null;
    
    document.getElementById('newCoreName').value = '';
    document.getElementById('newCoreDuration').value = '';
    document.getElementById('newCoreCategory').value = '';
    
    const catBtns = document.querySelectorAll('#coreCategoryGrid .category-select-btn');
    catBtns.forEach(b => b.classList.remove('border-primary', 'text-primary', 'bg-primary/5'));
    
    const previewContainer = document.getElementById('coreImagePreviewContainer');
    const uploadBtn = document.getElementById('coreImageUploadBtn');
    previewContainer.classList.add('hidden');
    uploadBtn.classList.remove('hidden');
    
    const sheet = document.getElementById('add-core-bottom-sheet');
    const sheetContent = document.getElementById('add-core-bottom-sheet-content');
    
    sheet.classList.remove('pointer-events-none');
    sheet.classList.add('opacity-100');
    sheet.classList.remove('opacity-0');
    
    setTimeout(() => {
        sheetContent.classList.remove('translate-y-full');
        sheetContent.classList.add('translate-y-0');
    }, 10);
}

function closeAddCoreSheet() {
    const sheet = document.getElementById('add-core-bottom-sheet');
    const sheetContent = document.getElementById('add-core-bottom-sheet-content');
    
    sheetContent.classList.remove('translate-y-0');
    sheetContent.classList.add('translate-y-full');
    
    setTimeout(() => {
        sheet.classList.add('opacity-0');
        sheet.classList.remove('opacity-100');
        sheet.classList.add('pointer-events-none');
    }, 300);
}

function closeAddCoreSheetOnOutsideClick(event) {
    if (event.target.id === 'add-core-bottom-sheet') {
        closeAddCoreSheet();
    }
}

async function deleteCurrentCore() {
    if (!currentCoreId) return;
    
    const core = cores.find(c => c.id === currentCoreId);
    if (!core) return;
    
    const confirmDelete = confirm(`${core.name} adlı hareketi silmek istediğinize emin misiniz?`);
    if (!confirmDelete) return;

    try {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "cores", currentCoreId));
        closeCoreSheet();
    } catch (error) {
        console.error("Error removing document: ", error);
        alert("Hareket silinirken bir hata oluştu.");
    }
}

async function saveCoreExercise() {
    const name = document.getElementById('newCoreName').value.trim();
    const duration = document.getElementById('newCoreDuration').value.trim();
    const category = document.getElementById('newCoreCategory').value.trim();
    
    if (!name || !duration || !category) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }
    
    const coreData = {
        name,
        duration,
        category,
        isDefault: false
    };
    if (currentCoreImageBase64) {
        coreData.imageBase64 = currentCoreImageBase64;
    }
    
    try {
        if (editingCoreId) {
            const coreRef = doc(db, "users", auth.currentUser.uid, "cores", editingCoreId);
            await updateDoc(coreRef, coreData);
        } else {
            const coresRef = collection(db, "users", auth.currentUser.uid, "cores");
            await addDoc(coresRef, coreData);
        }
        closeAddCoreSheet();
    } catch(err) {
        console.error("Error saving core:", err);
        alert("Kaydedilirken hata oluştu.");
    }
}

"""

with open('/Users/boratektas/Desktop/mizirap/workout.js', 'w') as f:
    f.write(content + "\n" + append_logic)

