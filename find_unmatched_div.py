with open('index.html', 'r') as f:
    content = f.read()

div_count = 0
for i, line in enumerate(content.split('\n')):
    div_count += line.count('<div')
    div_count -= line.count('</div')
    if div_count < 0:
        print(f"Negative div count at line {i+1}: {line}")
        break
