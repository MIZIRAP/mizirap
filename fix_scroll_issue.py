with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Revert position:fixed on stretch player
old_stretch = '<section id="view-stretch-player" class="view hidden flex flex-col select-none" style="position:fixed; top:0; left:0; right:0; bottom:0; z-index:9999; background: linear-gradient(135deg, rgba(113,42,226,0.18) 0%, rgba(59,130,246,0.18) 50%, rgba(34,197,94,0.18) 100%); background-color: #eef0ff; overflow-y: auto;">'
new_stretch = '<section id="view-stretch-player" class="view hidden min-h-[100dvh] flex flex-col select-none" style="background: linear-gradient(135deg, rgba(113,42,226,0.18) 0%, rgba(59,130,246,0.18) 50%, rgba(34,197,94,0.18) 100%); background-color: #eef0ff;">'
content = content.replace(old_stretch, new_stretch)

# Revert position:fixed on core player
old_core = '<section id="view-core-player" class="view hidden flex flex-col select-none" style="position:fixed; top:0; left:0; right:0; bottom:0; z-index:9999; background: linear-gradient(135deg, rgba(113,42,226,0.18) 0%, rgba(59,130,246,0.18) 50%, rgba(34,197,94,0.18) 100%); background-color: #eef0ff; overflow-y: auto;">'
new_core = '<section id="view-core-player" class="view hidden min-h-[100dvh] flex flex-col select-none" style="background: linear-gradient(135deg, rgba(113,42,226,0.18) 0%, rgba(59,130,246,0.18) 50%, rgba(34,197,94,0.18) 100%); background-color: #eef0ff;">'
content = content.replace(old_core, new_core)

# Update cache buster
content = content.replace('app.js?v=151', 'app.js?v=152')
content = content.replace('workout.js?v=147', 'workout.js?v=152')

with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
