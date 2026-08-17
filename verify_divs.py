with open('index.html', 'r') as f:
    lines = f.readlines()

app_container_start = -1
app_container_end = -1
for i, line in enumerate(lines):
    if 'id="app-container"' in line:
        app_container_start = i
    if '<!-- Kapanış: #app-container -->' in line:
        app_container_end = i

div_count = 0
for i in range(app_container_start, app_container_end):
    line = lines[i]
    div_count += line.count('<div')
    div_count -= line.count('</div')

print(f"div_count at the end of app-container: {div_count}")
