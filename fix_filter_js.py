import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the active styling update logic in filterExercises
old_logic = """            // Update active styling on chips
            const allChips = document.querySelectorAll('.filter-chip');
            allChips.forEach(chip => {
                chip.classList.remove('bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue-container', 'text-white-container');
                chip.classList.add('border', 'border-outline-variant', 'text-on-surface-variant', 'bg-surface-container-lowest');
            });
            
            // Set clicked chip to active
            btnElement.classList.add('bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue-container', 'text-white-container');
            btnElement.classList.remove('border', 'border-outline-variant', 'text-on-surface-variant', 'bg-surface-container-lowest');"""

# Wait, the exact strings in the HTML for filterExercises were:
# chip.classList.remove('bg-gradient-to-r from-neon-purple to-neon-blue-container', 'text-white-container');
# Actually, classList.remove takes individual arguments, but in the original HTML they passed them as a single string sometimes (which is a bug if space-separated).

# Let's just use a regex to replace the content of filterExercises up to applyExerciseFilters()

pattern = r'(function filterExercises\(category, btnElement\) \{[\s\S]*?)(applyExerciseFilters\(\);\s*\})'

def replacer(m):
    return """function filterExercises(category, btnElement) {
            currentExerciseCategory = category;
            
            // Update active styling on chips
            const allChips = document.querySelectorAll('.filter-chip');
            allChips.forEach(chip => {
                chip.className = 'neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant bg-secondary-container whitespace-nowrap neo-button filter-chip';
            });
            
            // Set clicked chip to active
            btnElement.className = 'neo-inset px-5 py-2 rounded-full text-sm font-semibold text-primary whitespace-nowrap filter-chip active';

            applyExerciseFilters();
        }"""

new_html = re.sub(r'function filterExercises\(category, btnElement\) \{.*?applyExerciseFilters\(\);\s*\}', replacer, html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
print("Done fixing JS!")
