import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_header = """            <header class="w-full top-0 sticky z-50 bg-white/70 backdrop-blur-xl border-t border-white/40 px-6 py-4 flex items-center justify-between">
                <button onclick="document.getElementById('view-exercise-library').classList.add('hidden'); document.getElementById('view-workout').classList.remove('hidden');" class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button">
                    <span class="material-symbols-outlined text-on-surface">arrow_back</span>
                </button>
                <h1 class="text-lg font-bold text-on-surface tracking-tight">Egzersiz Kütüphanesi</h1>
                <button class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button" onclick="openAddExerciseSheet()">
                    <span class="material-symbols-outlined text-on-surface">add</span>
                </button>
            </header>"""

new_header = """            <header class="w-full top-0 sticky z-40 max-w-md mx-auto px-container-padding py-4">
                <div class="flex items-center justify-between w-full">
                    <button onclick="document.getElementById('view-exercise-library').classList.add('hidden'); document.getElementById('view-workout').classList.remove('hidden');" class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F7F9FF] active:scale-95 transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                        <span class="material-symbols-rounded text-[#1E293B]">arrow_back</span>
                    </button>
                    <h1 class="text-h1 font-bold text-[#1E293B]">Egzersiz Kütüphanesi</h1>
                    <button onclick="openAddExerciseSheet()" class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F7F9FF] active:scale-95 transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                        <span class="material-symbols-rounded text-[#1E293B]">add</span>
                    </button>
                </div>
            </header>"""

html = html.replace(old_header, new_header)

old_search = """                <!-- Search Box -->
                <section class="bg-surface-bright pt-2">
                    <div class="neo-inset p-4 flex items-center gap-3">
                        <span class="material-symbols-outlined text-on-surface-variant">search</span>
                        <input id="exercise-search-input" oninput="handleExerciseSearch(this.value)" class="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-on-surface" placeholder="Egzersiz Ara..." type="text"/>
                    </div>
                </section>"""

new_search = """                <!-- Search Box -->
                <section class="pt-2">
                    <div class="neo-inset p-4 flex items-center gap-3" style="border-radius: 1.5rem;">
                        <span class="material-symbols-outlined text-on-surface-variant">search</span>
                        <input id="exercise-search-input" oninput="handleExerciseSearch(this.value)" class="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-on-surface" placeholder="Egzersiz Ara..." type="text"/>
                    </div>
                </section>"""

html = html.replace(old_search, new_search)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed header and search box artifacts!")
