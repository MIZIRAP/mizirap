import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # 1. Colors
    content = content.replace('text-ink/60', 'text-on-surface-variant')
    content = content.replace('text-ink/80', 'text-on-surface')
    content = content.replace('text-ink', 'text-on-surface')
    content = content.replace('text-green', 'text-primary')
    content = content.replace('text-[var(--ink)]', 'text-on-surface')
    content = content.replace('text-[var(--green)]', 'text-primary')
    content = content.replace('border-[var(--ink)]/10', 'border-outline-variant')
    
    # 2. Typography
    content = content.replace('text-[10px]', 'text-label-sm')
    content = content.replace('text-[11px]', 'text-label-sm')
    content = content.replace('text-[12px]', 'text-label-md')
    content = content.replace('text-[14px]', 'text-body-md')
    content = content.replace('text-[16px]', 'text-body-lg')
    # Icons have text-[xx] too, but we will fix icons separately. 
    # Let's target text-[xxpx] inside spans that are not material-symbols-outlined?
    # Wait, material-symbols-outlined uses text-[xxpx]. If we change all, icons will get text-label-sm which doesn't set width/height for icon.
    # It's better to do the Iconography replacement FIRST!
    
    return original != content, content

print("Refactor script created.")
