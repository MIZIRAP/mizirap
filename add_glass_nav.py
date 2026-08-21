with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

styles_to_add = """
        .glass-nav {
            background: rgba(247, 249, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
"""

if "glass-nav" not in content[:content.find("</head>")]:
    target = ".neo-surface {"
    content = content.replace(target, styles_to_add + "\n" + target)

    with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("glass-nav added")
else:
    print("glass-nav already present")
