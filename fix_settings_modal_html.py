import re

with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the finance-settings-modal block
# It starts at <!-- Finance Settings Modal --> and ends right before <!-- Icon Selection --> or similar.
settings_modal_regex = r'(<!-- Finance Settings Modal -->.*?</div>\s*</div>\s*</div>)'
match = re.search(settings_modal_regex, content, re.DOTALL)
if match:
    settings_modal_content = match.group(1)
    
    # 2. Remove it from its current location
    content = content[:match.start()] + content[match.end():]
    
    # 3. Insert it right before </body>
    body_end_idx = content.rfind('</body>')
    if body_end_idx != -1:
        content = content[:body_end_idx] + settings_modal_content + '\n' + content[body_end_idx:]
    else:
        print("Could not find </body>")

    with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("Could not find Finance Settings Modal block")
