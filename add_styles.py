with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

styles_to_add = """
        .neo-surface-interactive:active {
            box-shadow: inset 4px 4px 8px rgba(0,0,0,0.08), inset -4px -4px 8px rgba(255,255,255,0.6);
            transform: scale(0.98);
        }

        .neo-inset {
            background: #f7f9ff;
            box-shadow: inset 4px 4px 8px rgba(0,0,0,0.08), inset -4px -4px 8px rgba(255,255,255,0.6);
            border-radius: 24px;
        }
        
        .neo-inset-pill {
            background: #f7f9ff;
            box-shadow: inset 3px 3px 6px rgba(0,0,0,0.06), inset -3px -3px 6px rgba(255,255,255,0.8);
            border-radius: 9999px;
        }

        .neo-inset-circle {
            background: #f7f9ff;
            box-shadow: inset 4px 4px 8px rgba(0,0,0,0.08), inset -4px -4px 8px rgba(255,255,255,0.6);
            border-radius: 50%;
        }

        /* Smooth expansion for accordion */
        .expandable-content {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.3s ease-out;
        }
        .expandable-content.expanded {
            grid-template-rows: 1fr;
        }
        .expandable-inner {
            overflow: hidden;
        }
"""

if "neo-inset-pill" not in content:
    target = ".neo-surface {\n            background-color: #F7F9FF;\n            box-shadow: 8px 8px 16px #D1D9E6, -8px -8px 16px #FFFFFF;\n        }"
    content = content.replace(target, target + "\n" + styles_to_add)

    with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Styles added")
else:
    print("Styles already present")

