import re

with open('/Users/boratektas/Desktop/mizirap/workout.js', 'r') as f:
    content = f.read()

# Add renderCoreMuscleMap function at the end
render_core_muscle_map = """
function renderCoreMuscleMap(category) {
    const container = document.getElementById('sheet-core-interactive-map');
    if (!container || typeof COMBINED_SVG === 'undefined') return;
    
    container.innerHTML = COMBINED_SVG;
    
    const svgEl = container.querySelector('svg');
    const primaryColor = '#7ea18d'; // Sage green
    
    let targetMuscles = [];
    if (category === 'Alt Karın' || category === 'Üst Karın' || category === 'Tüm Karın' || category === 'Karın') {
        targetMuscles = ['abs'];
    } else if (category === 'Yan Karın') {
        targetMuscles = ['obliques'];
    } else if (category === 'Bel/Sırt' || category === 'Sırt') {
        targetMuscles = ['lower-back', 'upper-back'];
    } else if (category === 'Kalça') {
        targetMuscles = ['glutes'];
    }
    
    targetMuscles.forEach(muscle => {
        const paths = svgEl.querySelectorAll(`path[data-muscle="${muscle}"]`);
        paths.forEach(p => p.setAttribute('fill', primaryColor));
    });
}
"""

content += "\n" + render_core_muscle_map

# Replace renderMuscleMap call in openCoreSheet
old_call = """    // Render the interactive SVG instead of static image
    // For core exercises, if renderMuscleMap exists we can use it.
    if (typeof renderMuscleMap === 'function') {
        renderMuscleMap(core.name);"""

new_call = """    // Render the interactive SVG instead of static image
    if (typeof renderCoreMuscleMap === 'function') {
        renderCoreMuscleMap(core.category);"""

content = content.replace(old_call, new_call)

with open('/Users/boratektas/Desktop/mizirap/workout.js', 'w') as f:
    f.write(content)
