import re

with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_tx_modal = """<!-- Add Transaction Modal -->
<div id="finance-add-tx-modal" class="fixed inset-0 z-[100] hidden flex-col justify-end items-center md:p-4">
    <div class="absolute inset-0 bg-black/10 backdrop-blur-sm opacity-0 transition-opacity duration-300 cursor-pointer" data-action="closeAddTransactionModal" id="finance-add-tx-backdrop"></div>
    <div class="bg-[#F7F9FF] w-full max-w-sm mx-auto rounded-t-[32px] md:rounded-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] md:shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-6 flex flex-col items-center transform transition-transform duration-300 translate-y-full z-10 pb-8 md:pb-6" id="finance-add-tx-content">
        <!-- Drag Handle (Mobile) -->
        <div class="w-12 h-1.5 bg-gray-300 rounded-full mb-6 md:hidden cursor-pointer" data-action="closeAddTransactionModal"></div>
        <div class="w-full text-center mb-6">
            <h2 class="text-xl font-bold text-[#1E293B] mb-2">İşlem Gir</h2>
        </div>
        
        <!-- Type Selection -->
        <div class="flex w-full mb-6 bg-[#F7F9FF] p-1 rounded-full" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;">
            <label class="flex-1 cursor-pointer">
                <input type="radio" name="tx-type" value="expense" class="peer sr-only" checked>
                <div class="py-2 text-center rounded-full text-sm font-semibold text-[#64748B] transition-all peer-checked:text-[#EF4444] peer-checked:bg-[#F7F9FF]" style="box-shadow: none;">Gider</div>
            </label>
            <label class="flex-1 cursor-pointer">
                <input type="radio" name="tx-type" value="income" class="peer sr-only">
                <div class="py-2 text-center rounded-full text-sm font-semibold text-[#64748B] transition-all peer-checked:text-[#22c55e] peer-checked:bg-[#F7F9FF]" style="box-shadow: none;">Gelir</div>
            </label>
            <style>
                input[name="tx-type"]:checked + div {
                    box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff !important;
                }
            </style>
        </div>

        <!-- Input Area -->
        <div class="w-full flex flex-col gap-4 mb-6">
            
            <!-- Amount -->
            <div class="flex flex-col items-center gap-4 mb-2">
                <div class="flex items-center justify-between w-full px-6 py-4 rounded-full bg-[#F7F9FF]" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;">
                    <button id="tx-amount-minus" class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center active:scale-[0.98] transition-transform" style="box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff;">
                        <span class="material-symbols-rounded text-[#3B82F6] font-bold">remove</span>
                    </button>
                    <div class="flex flex-col items-center justify-center -space-y-1">
                        <input id="tx-amount" class="w-24 bg-transparent border-none outline-none font-bold text-2xl text-center text-[#1E293B] focus:ring-0 p-0" placeholder="0" type="number" min="0" step="0.01">
                        <span class="text-[10px] font-bold text-[#64748B] uppercase">Tutar (₺)</span>
                    </div>
                    <button id="tx-amount-plus" class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center active:scale-[0.98] transition-transform" style="box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff;">
                        <span class="material-symbols-rounded text-[#3B82F6] font-bold">add</span>
                    </button>
                </div>
            </div>

            <!-- Transaction Title -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">AÇIKLAMA</label>
                <div class="flex items-center rounded-2xl p-4 bg-[#F7F9FF]" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;">
                    <input id="tx-title" class="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-[#1E293B] p-0 appearance-none outline-none" placeholder="Örn: Market, Kahve" type="text">
                </div>
            </div>

            <!-- Spending Type (Category) -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">KATEGORİ</label>
                <div class="flex gap-4 py-2 overflow-x-auto no-scrollbar snap-x px-2 -mx-2" id="tx-category-container">
                    <!-- Dynamic Categories will be injected here -->
                    <div class="text-sm text-[#64748B] italic w-full text-center py-2">Kategori yükleniyor...</div>
                </div>
            </div>

            <!-- Payment Method -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">ÖDEME YÖNTEMİ</label>
                <div class="flex gap-4 py-2 overflow-x-auto no-scrollbar snap-x px-2 -mx-2" id="tx-payment-container">
                    <!-- Dynamic Payment Methods will be injected here -->
                    <div class="text-sm text-[#64748B] italic w-full text-center py-2">Ödeme yöntemleri yükleniyor...</div>
                </div>
            </div>

            <!-- Date -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">TARİH</label>
                <div class="flex items-center rounded-2xl p-4 bg-[#F7F9FF]" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;">
                    <input id="tx-date" class="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-[#1E293B] p-0 appearance-none outline-none" type="date"/>
                </div>
            </div>
        </div>

        <!-- CTA Button -->
        <button id="finance-save-tx-btn" class="w-full py-4 px-6 rounded-full font-bold text-lg text-[#1E293B] shadow-md focus:outline-none active:scale-[0.98] transition-transform flex items-center justify-center gap-2" style="box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff; border: 2px solid transparent; background: linear-gradient(#F7F9FF, #F7F9FF) padding-box, linear-gradient(to right, #4A90E2, #50E3C2) border-box;">
            Kaydet 
            <span class="material-symbols-rounded text-[#3B82F6]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
        </button>
    </div>
</div>"""

match = re.search(r'<div id="finance-add-tx-modal" class="fixed inset-0.*?<!-- Date Selection -->.*?</div>\s*</div>\s*</div>', content, re.DOTALL)
if match:
    content = content[:match.start()] + new_tx_modal + content[match.end():]
else:
    print("COULD NOT FIND TX MODAL TO REPLACE")

with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
