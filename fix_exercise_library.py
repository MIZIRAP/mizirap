import re
from bs4 import BeautifulSoup

def process_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # We need to manually parse or use BeautifulSoup. Since the file is 4000+ lines, BS4 might rewrite attributes differently.
    # A regex-based approach on the specific section is safer for preserving the rest of the file exactly!
    
    # Let's extract the view-exercise-library section
    start_str = '<section id="view-exercise-library"'
    end_str = '</section>'
    
    start_idx = html.find(start_str)
    # Find the corresponding closing section tag for view-exercise-library.
    # Since it might have nested sections, we count them.
    idx = start_idx
    depth = 0
    end_idx = -1
    
    while idx < len(html):
        if html[idx:].startswith('<section'):
            depth += 1
            idx += 8
        elif html[idx:].startswith('</section>'):
            depth -= 1
            if depth == 0:
                end_idx = idx + 10
                break
            idx += 10
        else:
            idx += 1
            
    if end_idx == -1:
        print("Could not find end of view-exercise-library")
        return
        
    section_html = html[start_idx:end_idx]
    
    # Now let's transform the header
    section_html = re.sub(
        r'<header.*?>.*?</header>',
        '''<header class="w-full top-0 sticky z-50 bg-surface-light/70 backdrop-blur-xl border-t border-white/40 px-6 py-4 flex items-center justify-between">
                <button onclick="document.getElementById(\'view-exercise-library\').classList.add(\'hidden\'); document.getElementById(\'view-workout\').classList.remove(\'hidden\');" class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button">
                    <span class="material-symbols-rounded text-on-surface">arrow_back</span>
                </button>
                <h1 class="text-lg font-bold text-primary tracking-tight">Egzersiz Kütüphanesi</h1>
                <button class="w-10 h-10 rounded-full neo-surface flex items-center justify-center neo-button">
                    <span class="material-symbols-rounded text-primary">add</span>
                </button>
            </header>''',
        section_html,
        flags=re.DOTALL,
        count=1
    )
    
    # Transform Search Box
    section_html = re.sub(
        r'<!-- Search Bar -->\s*<div>\s*<div class="relative[^>]*>.*?</div>\s*</div>',
        '''<!-- Search Box -->
                <section class="bg-surface-bright pt-2">
                    <div class="neo-inset p-4 flex items-center gap-3">
                        <span class="material-symbols-rounded text-on-surface-variant">search</span>
                        <input id="exercise-search-input" oninput="handleExerciseSearch(this.value)" class="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-on-surface" placeholder="Egzersiz Ara..." type="text"/>
                    </div>
                </section>''',
        section_html,
        flags=re.DOTALL
    )
    
    # Transform Filter Chips
    section_html = re.sub(
        r'<!-- Filter Chips -->\s*<div class="flex overflow-x-auto[^>]*>.*?</div>',
        '''<!-- Filter Chips -->
                <section class="overflow-x-auto pb-2">
                    <div class="flex gap-4 px-1">
                        <button onclick="filterExercises('Tümü', this)" class="neo-inset px-5 py-2 rounded-full text-sm font-semibold text-primary whitespace-nowrap filter-chip active">Tümü</button>
                        <button onclick="filterExercises('Favoriler', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Favoriler</button>
                        <button onclick="filterExercises('Göğüs', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Göğüs</button>
                        <button onclick="filterExercises('Sırt', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Sırt</button>
                        <button onclick="filterExercises('Omuz', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Omuz</button>
                        <button onclick="filterExercises('Biceps', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Biceps</button>
                        <button onclick="filterExercises('Triceps', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Triceps</button>
                        <button onclick="filterExercises('Bacak', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Bacak</button>
                        <button onclick="filterExercises('Karın', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Karın</button>
                        <button onclick="filterExercises('Kalça', this)" class="neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip">Kalça</button>
                    </div>
                </section>''',
        section_html,
        flags=re.DOTALL
    )
    
    # Update main class
    section_html = section_html.replace(
        '<main class="flex-1 px-margin-mobile flex flex-col pt-4 gap-6 pb-8 min-h-0 overflow-hidden">',
        '<main class="flex-1 px-6 flex flex-col pt-4 gap-6 pb-24">'
    )
    
    # Now for every exercise item in the section, rewrite it!
    # Pattern to match:
    # <div onclick="openExerciseSheet(this, 'XYZ')" class="... exercise-item">
    #   <div ...>L</div>
    #   <div class="flex-grow">
    #       <h3>XYZ</h3>
    #       <p>Ana Kas: ABC</p>
    #   </div>
    #   <div ...>
    #       <button ... data-action="toggleFav"> <span ...>star</span> </button>
    #       <span ...>chevron_right</span>
    #   </div>
    # </div>
    
    def replace_exercise_item(m):
        onclick = m.group(1)
        letter = m.group(2)
        title = m.group(3)
        subtitle = m.group(4)
        
        return f"""<div onclick="{onclick}" class="neo-surface p-5 flex items-center justify-between neo-button transition-all exercise-item mb-4 cursor-pointer">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full neo-inset flex items-center justify-center bg-surface-light text-primary font-bold">{letter}</div>
                        <div>
                            <h4 class="font-semibold text-body-md text-on-surface tracking-tight">{title}</h4>
                            <p class="text-xs text-on-surface-variant capitalize">{subtitle}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="p-2 text-on-surface-variant hover:text-primary transition-colors exercise-fav-btn flex items-center justify-center" data-action="toggleFav">
                            <span class="material-symbols-rounded text-xl">star</span>
                        </button>
                        <span class="material-symbols-rounded text-on-surface-variant">chevron_right</span>
                    </div>
                </div>"""

    # Regex to capture the exercise items
    pattern = r'<div onclick="([^"]+)" class="[^"]*?exercise-item[^"]*?">\s*<div[^>]*>([^<]+)</div>\s*<div class="flex-grow">\s*<h3[^>]*>([^<]+)</h3>\s*<p[^>]*>([^<]+)</p>\s*</div>\s*<div[^>]*>.*?</div>\s*</div>'
    
    section_html = re.sub(pattern, replace_exercise_item, section_html, flags=re.DOTALL)
    
    # Replace in original HTML
    new_html = html[:start_idx] + section_html + html[end_idx:]
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
        
    print("Done rewriting index.html!")

if __name__ == '__main__':
    process_html()
