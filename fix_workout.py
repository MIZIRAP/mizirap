import re

with open('workout.js', 'r') as f:
    content = f.read()

# 1. Add window.updateSplitDayName
update_func = """
window.updateSplitDayName = function(splitId, dayIdx, newName) {
    const split = splits.find(s => s.id === splitId);
    if(split && split.days[dayIdx]) {
        split.days[dayIdx].name = newName;
        persistSplitEdit(split);
    }
};
"""
if "window.updateSplitDayName" not in content:
    content += "\n" + update_func

# 2. Fix onEnd to call persistSplitEdit
content = content.replace("day.exercises.splice(evt.newIndex, 0, moved);", "day.exercises.splice(evt.newIndex, 0, moved);\n            persistSplitEdit(split);")

# 3. Fix the gradient border to ALWAYS be on
old_header_wrapper_logic = """        let splitHeaderWrapperClass = 'accordion-header w-[342px] h-[72px] rounded-[24px] relative z-40 transition-all cursor-pointer';
        
        // Gradient border magic
        if (isSplitOpen) {
            splitHeaderWrapperClass += ' p-[2px] bg-gradient-to-r from-[#4648D4] to-[#20E0B0]';
        } else {
            splitHeaderWrapperClass += ' bg-[#E8EAF0]';
        }"""
new_header_wrapper_logic = """        let splitHeaderWrapperClass = 'accordion-header w-[342px] h-[72px] rounded-[24px] relative z-40 transition-all cursor-pointer p-[2px] bg-gradient-to-r from-[#4648D4] to-[#20E0B0]';"""
content = content.replace(old_header_wrapper_logic, new_header_wrapper_logic)

# 4. Make day name editable (change <h3>${day.name}</h3> to input)
old_day_name = """<h3 class="font-medium text-[#181C20] text-[16px] leading-[24px] truncate select-none">${day.name}</h3>"""
new_day_name = """<input type="text" value="${day.name}" class="font-medium text-[#181C20] text-[16px] leading-[24px] bg-transparent outline-none w-[110px] truncate" onclick="event.stopPropagation()" onchange="updateSplitDayName('${split.id}', ${dayIdx}, this.value)" />"""
content = content.replace(old_day_name, new_day_name)

# 5. Add swipe to delete logic to the splitCard in renderSplitEditView
# We find where mainContainer.appendChild(splitCard); is.
old_append = "mainContainer.appendChild(splitCard);"
new_append = """
        const headerEl = splitCard.querySelector('.accordion-header');
        if(headerEl) {
            let startX=0, startY=0;
            headerEl.addEventListener('touchstart', e => {
                startX = e.changedTouches[0].screenX;
                startY = e.changedTouches[0].screenY;
            }, {passive: true});
            headerEl.addEventListener('touchend', e => {
                let endX = e.changedTouches[0].screenX;
                let endY = e.changedTouches[0].screenY;
                if (startX - endX > 60 && Math.abs(startY - endY) < 40) {
                    if(confirm("Bu programı silmek istediğinize emin misiniz?")) {
                        deleteSplit(split.id);
                    }
                }
            });
        }
        mainContainer.appendChild(splitCard);
"""
content = content.replace(old_append, new_append)

with open('workout.js', 'w') as f:
    f.write(content)

print("workout.js updated successfully")
