with open('index.html', 'r') as f:
    lines = f.readlines()

for start_line in range(3200, 3290):
    if '<div ' in lines[start_line] and 'id=' in lines[start_line]:
        print(f"Checking div at {start_line+1}: {lines[start_line].strip()}")
