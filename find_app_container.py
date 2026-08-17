with open('index.html', 'r') as f:
    lines = f.readlines()

app_container_start = -1
for i, line in enumerate(lines):
    if 'id="app-container"' in line:
        app_container_start = i
        break

if app_container_start == -1:
    print("Could not find app-container")
    exit()

div_count = 0
for i in range(app_container_start, len(lines)):
    line = lines[i]
    div_count += line.count('<div')
    div_count -= line.count('</div')
    if div_count == 0:
        print(f"app-container closes at line {i+1}: {line.strip()}")
        break
