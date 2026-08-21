import re

with open('/Users/boratektas/Desktop/mizirap/index.html', 'r') as f:
    content = f.read()

view_core_library_html = """
    <section id="view-core-library" class="view hidden bg-surface-light min-h-[100dvh] text-on-surface antialiased font-body-lg pb-[100px]">
        <div class="max-w-md mx-auto relative h-full flex flex-col">
            <!-- Header -->
            <header class="w-full top-0 sticky z-40 max-w-md mx-auto px-container-padding py-4">
                <div class="flex items-center justify-between w-full">
                    <button onclick="document.getElementById('view-core-library').classList.add('hidden'); document.getElementById('view-workout').classList.remove('hidden');" class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F0F2F8] active:scale-95 transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
                        <span class="material-symbols-rounded text-[#1E293B]">arrow_back</span>
                    </button>
                    <h1 class="text-h1 font-bold text-[#1E293B]">Core Hareketleri</h1>
                    <button onclick="openAddCoreSheet()" class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F0F2F8] active:scale-95 transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
                        <span class="material-symbols-rounded text-[#1E293B]">add</span>
                    </button>
                </div>
            </header>

            <main class="flex-1 px-6 flex flex-col pt-4 gap-6 pb-24">
                <!-- Search Box -->
                <section class="pt-2">
                    <div class="neo-inset p-4 flex items-center gap-3" style="">
                        <span class="material-symbols-outlined text-on-surface-variant">search</span>
                        <input id="core-search-input" oninput="handleCoreSearch(this.value)" class="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-on-surface" placeholder="Core Hareketi Ara..." type="text"/>
                    </div>
                </section>

                <!-- Filter Chips -->
                <section class="overflow-x-auto pb-2">
                    <div class="flex gap-4 px-1">
                        <button onclick="filterCores('Tümü', this)" class="neo-inset px-5 py-2 rounded-full text-sm font-semibold text-on-surface whitespace-nowrap filter-chip active">Tümü</button>
                        <button onclick="filterCores('Favoriler', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip">Favoriler</button>
                        <button onclick="filterCores('Alt Karın', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip">Alt Karın</button>
                        <button onclick="filterCores('Üst Karın', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip">Üst Karın</button>
                        <button onclick="filterCores('Yan Karın', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip">Yan Karın</button>
                        <button onclick="filterCores('Bel/Sırt', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip">Bel/Sırt</button>
                        <button onclick="filterCores('Tüm Karın', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip">Tüm Karın</button>
                    </div>
                </section>

                <!-- Core List Container -->
                <div id="core-list-container" class="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar pb-32">
                </div>
                
                <button onclick="document.getElementById('view-core-library').classList.add('hidden'); openCorePlayer();" class="w-full bg-[#F0F2F8] p-4 rounded-2xl flex items-center justify-center active:scale-[0.99] transition-transform text-center font-bold text-[#1E293B] mt-4 mb-4" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
                    Seansa Başla
                </button>
            </main>
        </div>

        <!-- Bottom Sheet Demonstration Overlay -->
        <div id="core-bottom-sheet" class="fixed inset-0 bg-black/30 z-[100] flex items-end opacity-0 pointer-events-none transition-opacity duration-300" onclick="closeCoreSheetOnOutsideClick(event)">
            <div class="bg-background shadow-neo rounded-t-[24px] w-full max-w-md mx-auto shadow-2xl transform transition-transform translate-y-full duration-300 relative max-h-[90vh] flex flex-col" id="core-bottom-sheet-content">
                <!-- Drag Handle -->
                <div class="w-full flex justify-center pt-4 pb-2 cursor-pointer" onclick="closeCoreSheet()">
                    <div class="w-12 h-1.5 bg-outline-variant rounded-full"></div>
                </div>
                <!-- Sheet Header -->
                <div class="px-6 pb-4 flex items-center justify-between flex-shrink-0 pt-2">
                    <h2 id="sheet-core-name" class="font-headline-lg-mobile text-on-surface truncate">Hareket Adı</h2>
                    <div class="flex items-center gap-1">
                        <button class="p-2 hover:bg-error-container rounded-full transition-colors flex-shrink-0 text-error/80 hover:text-error" onclick="deleteCurrentCore()" title="Hareketi Sil">
                            <span class="material-symbols-outlined text-2xl">delete</span>
                        </button>
                        <button id="sheet-core-fav-btn" class="p-2 hover:bg-surface-container-low rounded-full transition-colors flex-shrink-0 text-on-surface-variant" onclick="toggleCoreSheetFav()">
                            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 0;">star</span>
                        </button>
                    </div>
                </div>
                <!-- Sheet Content -->
                <div class="px-6 pb-6 overflow-y-auto flex-grow flex flex-col gap-4">
                    <!-- Muscle Diagram Area -->
                    <div class="bg-background shadow-neo rounded-[32px] p-4 flex flex-col items-center justify-center shadow-sm border border-surface-container-low">
                        
                    <!-- Dynamic Interactive SVG Map Container -->
                    <div id="sheet-core-interactive-map-wrapper" class="relative w-full h-[350px] mb-6 flex justify-center items-center overflow-hidden bg-background shadow-neo rounded-[32px] border border-surface-container-low shadow-inner">
                        <div id="sheet-core-interactive-map" class="w-full h-full cursor-move"></div>
                        
                        <!-- Zoom Controls -->
                        <div class="absolute bottom-2 right-2 flex flex-col gap-1 bg-surface-container-high/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                            <button id="core-zoom-in" class="p-1 text-on-surface hover:text-neon-blue active:scale-95 transition-transform"><span class="material-symbols-outlined text-sm">add</span></button>
                            <button id="core-zoom-out" class="p-1 text-on-surface hover:text-neon-blue active:scale-95 transition-transform"><span class="material-symbols-outlined text-sm">remove</span></button>
                            <button id="core-zoom-reset" class="p-1 text-on-surface hover:text-neon-blue active:scale-95 transition-transform"><span class="material-symbols-outlined text-sm">restart_alt</span></button>
                        </div>
                    </div>

                        <div class="flex flex-col gap-2 items-center" id="sheet-core-legend">
                            <!-- Eklenecek -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
"""

content = content.replace('<section id="view-edit-workout-template"', view_core_library_html + '\n    <section id="view-edit-workout-template"')

# Find where add-exercise-bottom-sheet is, and insert add-core-bottom-sheet before it
add_core_bottom_sheet_html = """
    <!-- Add Core Bottom Sheet -->
    <div id="add-core-bottom-sheet" class="fixed inset-0 bg-black/30 z-[100] flex items-end opacity-0 pointer-events-none transition-opacity duration-300" onclick="closeAddCoreSheetOnOutsideClick(event)">
        <div class="bg-background shadow-neo rounded-t-[24px] w-full max-w-md mx-auto shadow-2xl transform transition-transform translate-y-full duration-300 relative max-h-[90vh] flex flex-col" id="add-core-bottom-sheet-content">
            <!-- Drag Handle -->
            <div class="w-full flex justify-center pt-4 pb-2 cursor-pointer" onclick="closeAddCoreSheet()">
                <div class="w-12 h-1.5 bg-outline-variant rounded-full opacity-60"></div>
            </div>
            
            <!-- Sheet Header -->
            <div class="px-6 pb-4 flex items-center justify-between flex-shrink-0 pt-2 border-b border-surface-container-low">
                <h2 class="font-headline-sm-mobile text-on-surface font-semibold tracking-tight">Yeni Core Hareketi Ekle</h2>
                <button class="p-2 -mr-2 bg-surface-container-low hover:bg-surface-container transition-colors rounded-full text-on-surface-variant hover:text-on-surface" onclick="closeAddCoreSheet()">
                    <span class="material-symbols-outlined text-xl">close</span>
                </button>
            </div>
            
            <!-- Sheet Content -->
            <div class="px-6 py-6 overflow-y-auto flex-grow flex flex-col gap-6">
                <!-- Fotoğraf Ekleme Alanı -->
                <div class="flex flex-col gap-3">
                    <label class="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">image</span>
                        Kapak Fotoğrafı
                    </label>
                    <div id="coreImagePreviewContainer" class="hidden relative w-full h-48 rounded-2xl overflow-hidden shadow-sm group">
                        <img id="coreImagePreview" src="" alt="Preview" class="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onclick="document.getElementById('coreImageInput').click()" class="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full transition-colors shadow-lg border border-white/20">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                        </div>
                    </div>
                    <button type="button" id="coreImageUploadBtn" onclick="document.getElementById('coreImageInput').click()" class="neo-surface p-6 rounded-2xl neo-button transition-all border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:text-primary hover:border-primary/50 group">
                        <div class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <span class="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">add_a_photo</span>
                        </div>
                        <span class="text-sm font-medium">Fotoğraf Seç veya Çek</span>
                    </button>
                    <input type="file" id="coreImageInput" accept="image/*" class="hidden" onchange="handleCoreImageSelect(event)">
                </div>

                <!-- Hareket Adı -->
                <div class="flex flex-col gap-3">
                    <label class="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">edit_note</span>
                        Hareket Adı
                    </label>
                    <div class="relative">
                        <input type="text" id="newCoreName" class="neo-inset w-full p-4 rounded-2xl bg-transparent border-none text-on-surface focus:ring-2 focus:ring-primary/20 transition-shadow text-base placeholder:text-on-surface-variant/50" placeholder="Örn: Plank, Crunch...">
                    </div>
                </div>

                <!-- Süre -->
                <div class="flex flex-col gap-3">
                    <label class="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">timer</span>
                        Süre (Saniye)
                    </label>
                    <div class="relative">
                        <input type="number" id="newCoreDuration" class="neo-inset w-full p-4 rounded-2xl bg-transparent border-none text-on-surface focus:ring-2 focus:ring-primary/20 transition-shadow text-base placeholder:text-on-surface-variant/50" placeholder="Örn: 30, 45, 60...">
                    </div>
                </div>
                
                <!-- Bölge Seçimi -->
                <div class="flex flex-col gap-3">
                    <label class="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">fitness_center</span>
                        Bölge (Kategori)
                    </label>
                    <div class="grid grid-cols-2 gap-3" id="coreCategoryGrid">
                        <button type="button" class="neo-surface p-3 rounded-xl neo-button transition-all text-sm font-medium text-on-surface hover:text-primary category-select-btn border-2 border-transparent focus:outline-none" data-cat="Alt Karın">Alt Karın</button>
                        <button type="button" class="neo-surface p-3 rounded-xl neo-button transition-all text-sm font-medium text-on-surface hover:text-primary category-select-btn border-2 border-transparent focus:outline-none" data-cat="Üst Karın">Üst Karın</button>
                        <button type="button" class="neo-surface p-3 rounded-xl neo-button transition-all text-sm font-medium text-on-surface hover:text-primary category-select-btn border-2 border-transparent focus:outline-none" data-cat="Yan Karın">Yan Karın</button>
                        <button type="button" class="neo-surface p-3 rounded-xl neo-button transition-all text-sm font-medium text-on-surface hover:text-primary category-select-btn border-2 border-transparent focus:outline-none" data-cat="Bel/Sırt">Bel/Sırt</button>
                        <button type="button" class="neo-surface p-3 rounded-xl neo-button transition-all text-sm font-medium text-on-surface hover:text-primary category-select-btn border-2 border-transparent focus:outline-none col-span-2" data-cat="Tüm Karın">Tüm Karın</button>
                    </div>
                    <input type="hidden" id="newCoreCategory" value="">
                </div>
            </div>
            
            <!-- Sticky Bottom Action -->
            <div class="p-6 border-t border-surface-container-low bg-background/80 backdrop-blur-md">
                <button onclick="saveCoreExercise()" class="w-full neo-button bg-primary text-on-primary py-4 rounded-2xl font-bold text-base shadow-neo-primary hover:shadow-neo-primary-hover active:shadow-neo-primary-active transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-lg">save</span>
                    Kaydet
                </button>
            </div>
        </div>
    </div>
"""

content = content.replace('<!-- Add Exercise Bottom Sheet -->', add_core_bottom_sheet_html + '\n    <!-- Add Exercise Bottom Sheet -->')

with open('/Users/boratektas/Desktop/mizirap/index.html', 'w') as f:
    f.write(content)
