import re

with open('workout.js', 'r') as f:
    content = f.read()

# 1. Revert removeExerciseFromSplit button
old_ex_btn = """<button class="p-1 transition-colors" onclick="event.stopPropagation(); removeExerciseFromSplit('${split.id}', ${dayIdx}, ${exIdx})">"""
new_ex_btn = """<button class="p-1 transition-colors" data-action="removeExerciseFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}">"""
content = content.replace(old_ex_btn, new_ex_btn)

# 2. Revert removeDayFromSplit button
old_day_btn = """<button class="p-1 transition-colors" onclick="event.stopPropagation(); removeDayFromSplit('${split.id}', ${dayIdx})">"""
new_day_btn = """<button class="p-1 transition-colors" data-action="removeDayFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}">"""
content = content.replace(old_day_btn, new_day_btn)

# 3. Remove stroke from day input
old_input = """<input type="text" value="${day.name}" class="font-medium text-[#181C20] text-[16px] leading-[24px] bg-transparent outline-none w-[110px] truncate" onclick="event.stopPropagation()" onchange="updateSplitDayName('${split.id}', ${dayIdx}, this.value)" />"""
new_input = """<input type="text" value="${day.name}" class="font-medium text-[#181C20] text-[16px] leading-[24px] bg-transparent outline-none border-none focus:ring-0 shadow-none p-0 w-[110px] truncate" onclick="event.stopPropagation()" onchange="updateSplitDayName('${split.id}', ${dayIdx}, this.value)" />"""
content = content.replace(old_input, new_input)

# 4. Update toggleMizAccordion in HTML to pass event
old_toggle_ex = """onclick="toggleMizAccordion(this, '${exAccordionKey}', 'ex')\""""
new_toggle_ex = """onclick="toggleMizAccordion(this, '${exAccordionKey}', 'ex', event)\""""
content = content.replace(old_toggle_ex, new_toggle_ex)

old_toggle_day = """onclick="toggleMizAccordion(this, '${dayAccordionKey}', 'day')\""""
new_toggle_day = """onclick="toggleMizAccordion(this, '${dayAccordionKey}', 'day', event)\""""
content = content.replace(old_toggle_day, new_toggle_day)

old_toggle_split = """onclick="toggleMizAccordion(this, '${split.id}', 'split')\""""
new_toggle_split = """onclick="toggleMizAccordion(this, '${split.id}', 'split', event)\""""
content = content.replace(old_toggle_split, new_toggle_split)

# 5. Update toggleMizAccordion definition to check event
old_toggle_func = """window.toggleMizAccordion = function(headerElement, key, type) {
    const parent = headerElement.parentElement;"""
new_toggle_func = """window.toggleMizAccordion = function(headerElement, key, type, event) {
    if (event && event.target.closest('button')) {
        return;
    }
    const parent = headerElement.parentElement;"""
content = content.replace(old_toggle_func, new_toggle_func)

with open('workout.js', 'w') as f:
    f.write(content)

print("workout.js updated")
