import re

content = open('water.js').read()

# Add let currentUid = null;
content = content.replace('let callback = null;', 'let callback = null;\nlet currentUid = null;')

# Add currentUid = uid; to initWater
content = content.replace('export function initWater(uid, onChangeCallback) {\n    callback = onChangeCallback;', 'export function initWater(uid, onChangeCallback) {\n    callback = onChangeCallback;\n    currentUid = uid;')

# clearWater
old_clear = """export function clearWater() {
    if(unsubscribeSettings) unsubscribeSettings();
    if(unsubscribeLogs) unsubscribeLogs();
    waterLogs = [];
    dailyGoal = 2000;
}"""

new_clear = """export function clearWater() {
    if(unsubscribeSettings) unsubscribeSettings();
    if(unsubscribeLogs) unsubscribeLogs();
    waterLogs = [];
    dailyGoal = 2000;
    currentUid = null;
}"""

content = content.replace(old_clear, new_clear)

open('water.js', 'w').write(content)
