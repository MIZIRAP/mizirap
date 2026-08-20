import re

with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the header button in view-finance
old_header_btn = '<button class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F7F9FF] text-red-500" style="box-shadow: rgb(209, 217, 230) 4px 4px 8px, rgb(255, 255, 255) -4px -4px 8px;" data-action="resetFinanceData" title="Finans Verilerini Sıfırla"><span class="material-symbols-rounded">delete_sweep</span></button>'
new_header_btn = '<button class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F7F9FF] active:scale-[0.98] transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;" data-action="openFinanceSettingsModal" title="Ayarlar"><span class="material-symbols-rounded text-[#1E293B]">settings</span></button>'

# Ensure we only replace the one in view-finance
finance_section_match = re.search(r'<section id="view-finance".*?</header>', content, re.DOTALL)
if finance_section_match:
    section_str = finance_section_match.group(0)
    section_str = section_str.replace(old_header_btn, new_header_btn)
    content = content[:finance_section_match.start()] + section_str + content[finance_section_match.end():]

# 2. Remove the "Ödeme Yöntemi Ekle" and "Harcama Türü Ekle" buttons from the grid
old_grid = """<div class="grid grid-cols-2 gap-6"><button class="flex flex-col items-center justify-center gap-3 py-6 rounded-2xl bg-[#F7F9FF] active:scale-[0.98] transition-transform" style="box-shadow: rgb(209, 217, 230) 6px 6px 12px, rgb(255, 255, 255) -6px -6px 12px;" data-action="openAddPaymentMethodModal"><span class="material-symbols-rounded text-[#3B82F6] text-3xl">credit_card</span><span class="text-xs font-bold text-[#1E293B] text-center">Ödeme Yöntemi<br/>Ekle</span></button><button class="flex flex-col items-center justify-center gap-3 py-6 rounded-2xl bg-[#F7F9FF] active:scale-[0.98] transition-transform" style="box-shadow: rgb(209, 217, 230) 6px 6px 12px, rgb(255, 255, 255) -6px -6px 12px;" data-action="openAddCategoryModal"><span class="material-symbols-rounded text-[#22C55E] text-3xl">category</span><span class="text-xs font-bold text-[#1E293B] text-center">Harcama Türü<br/>Ekle</span></button>"""
new_grid = """<div class="grid grid-cols-2 gap-6">"""
content = content.replace(old_grid, new_grid)

# 3. Create the Finance Settings Modal
settings_modal = """
<!-- Finance Settings Modal -->
<div id="finance-settings-modal" class="fixed inset-0 z-[100] hidden flex-col justify-end items-center md:p-4">
    <div class="absolute inset-0 bg-black/10 backdrop-blur-sm opacity-0 transition-opacity duration-300 cursor-pointer" data-action="closeFinanceSettingsModal" id="finance-settings-backdrop"></div>
    <div class="bg-[#F7F9FF] w-full max-w-sm mx-auto rounded-t-[32px] md:rounded-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] md:shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-6 flex flex-col items-center transform transition-transform duration-300 translate-y-full z-10 pb-8 md:pb-6" id="finance-settings-content" style="max-height: 90vh;">
        <!-- Drag Handle (Mobile) -->
        <div class="w-12 h-1.5 bg-gray-300 rounded-full mb-6 md:hidden cursor-pointer" data-action="closeFinanceSettingsModal"></div>
        <div class="w-full flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-[#1E293B]">Finans Ayarları</h2>
            <button class="w-10 h-10 flex items-center justify-center rounded-full bg-[#F7F9FF] active:scale-[0.98] transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;" data-action="closeFinanceSettingsModal">
                <span class="material-symbols-rounded text-[#1E293B]">close</span>
            </button>
        </div>
        
        <div class="w-full flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-8 pb-4">
            
            <!-- Payment Methods Section -->
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between px-2">
                    <h3 class="text-xs font-bold text-[#3B82F6] uppercase">Ödeme Yöntemleri</h3>
                    <button class="flex items-center gap-1 text-[#3B82F6] active:scale-95 transition-transform" data-action="openAddPaymentMethodModal">
                        <span class="material-symbols-rounded text-lg">add_circle</span>
                        <span class="text-xs font-bold">Ekle</span>
                    </button>
                </div>
                <!-- Payment Methods List -->
                <div class="flex flex-col gap-3" id="settings-payment-list">
                    <!-- Dynamic List with swipe-to-delete -->
                </div>
            </div>

            <!-- Categories Section -->
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between px-2">
                    <h3 class="text-xs font-bold text-[#3B82F6] uppercase">Harcama Türleri</h3>
                    <button class="flex items-center gap-1 text-[#22C55E] active:scale-95 transition-transform" data-action="openAddCategoryModal">
                        <span class="material-symbols-rounded text-lg">add_circle</span>
                        <span class="text-xs font-bold">Ekle</span>
                    </button>
                </div>
                <!-- Categories List -->
                <div class="flex flex-col gap-3" id="settings-category-list">
                    <!-- Dynamic List with swipe-to-delete -->
                </div>
            </div>

        </div>
    </div>
</div>
"""

# Insert the settings modal right after finance-add-category-modal
cat_modal_regex = r'(<div id="finance-add-category-modal".*?</div>\s*</div>)'
match = re.search(cat_modal_regex, content, re.DOTALL)
if match:
    content = content[:match.end()] + settings_modal + content[match.end():]
else:
    print("Could not find finance-add-category-modal")

with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
