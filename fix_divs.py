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
    
    closing_divs = line.count('</div')
    
    # Check if this closing div would drop count to 0 (meaning it closes app-container)
    while closing_divs > 0:
        if div_count - 1 == 0:
            print(f"Removing extra </div> at line {i+1}: {line.strip()}")
            lines[i] = line.replace('</div>', '', 1)
            closing_divs -= 1
        else:
            div_count -= 1
            closing_divs -= 1

with open('index.html', 'w') as f:
    f.writelines(lines)
