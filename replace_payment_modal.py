import re

with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new modal HTML
new_modal = """<!-- Add Payment Method Modal -->
<div id="finance-add-payment-modal" class="fixed inset-0 z-[100] hidden flex-col justify-end items-center md:p-4">
    <div class="absolute inset-0 bg-black/10 backdrop-blur-sm opacity-0 transition-opacity duration-300 cursor-pointer" data-action="closeAddPaymentMethodModal" id="finance-add-payment-backdrop"></div>
    <div class="bg-[#F7F9FF] w-full max-w-sm mx-auto rounded-t-[32px] md:rounded-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] md:shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-6 flex flex-col items-center transform transition-transform duration-300 translate-y-full z-10 pb-8 md:pb-6" id="finance-add-payment-content">
        <!-- Drag Handle (Mobile) -->
        <div class="w-12 h-1.5 bg-gray-300 rounded-full mb-6 md:hidden cursor-pointer" data-action="closeAddPaymentMethodModal"></div>
        <div class="w-full text-center mb-6">
            <h2 class="text-xl font-bold text-[#1E293B] mb-2">Ödeme Yöntemi Ekle</h2>
        </div>
        <!-- Input Area -->
        <div class="w-full flex flex-col gap-4 mb-6">
            <!-- Name Input -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">AD</label>
                <div class="flex items-center rounded-2xl p-4 bg-[#F7F9FF]" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;">
                    <input id="method-name" class="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-[#1E293B] p-0 appearance-none outline-none" placeholder="Yöntem adı girin" type="text"/>
                </div>
            </div>
            <!-- Type Selection (Pill Style) -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">TÜRÜ</label>
                <div class="grid grid-cols-2 gap-2 p-1 bg-[#F7F9FF] rounded-2xl" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;">
                    <label class="cursor-pointer">
                        <input type="radio" name="payment-type" value="Banka Kartı" class="peer sr-only" checked>
                        <div class="py-2 text-center rounded-xl text-xs font-semibold text-[#64748B] transition-all peer-checked:text-[#22c55e] peer-checked:bg-[#F7F9FF]" style="box-shadow: none;">Banka Kartı</div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="payment-type" value="Kredi Kartı" class="peer sr-only">
                        <div class="py-2 text-center rounded-xl text-xs font-semibold text-[#64748B] transition-all peer-checked:text-[#22c55e] peer-checked:bg-[#F7F9FF]">Kredi Kartı</div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="payment-type" value="Nakit" class="peer sr-only">
                        <div class="py-2 text-center rounded-xl text-xs font-semibold text-[#64748B] transition-all peer-checked:text-[#22c55e] peer-checked:bg-[#F7F9FF]">Nakit</div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="payment-type" value="Cüzdan" class="peer sr-only">
                        <div class="py-2 text-center rounded-xl text-xs font-semibold text-[#64748B] transition-all peer-checked:text-[#22c55e] peer-checked:bg-[#F7F9FF]">Cüzdan</div>
                    </label>
                </div>
                <!-- Inline style script for peer-checked box-shadow since tailwind arbitrary peer variants can be tricky in this setup -->
                <style>
                    input[name="payment-type"]:checked + div {
                        box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff !important;
                    }
                </style>
            </div>
            <!-- Icon Selection -->
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[#3B82F6] uppercase px-2">İKON SEÇİMİ</label>
                <div class="flex justify-around p-4" id="payment-icon-container">
                    <button class="payment-icon-option w-12 h-12 rounded-full flex items-center justify-center bg-[#F7F9FF] text-[#3B82F6] selected" style="box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff;" data-icon="credit_card">
                        <span class="material-symbols-rounded">credit_card</span>
                    </button>
                    <button class="payment-icon-option w-12 h-12 rounded-full flex items-center justify-center bg-[#F7F9FF] text-[#64748B]" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;" data-icon="account_balance_wallet">
                        <span class="material-symbols-rounded">account_balance_wallet</span>
                    </button>
                    <button class="payment-icon-option w-12 h-12 rounded-full flex items-center justify-center bg-[#F7F9FF] text-[#64748B]" style="box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;" data-icon="payments">
                        <span class="material-symbols-rounded">payments</span>
                    </button>
                </div>
            </div>
        </div>
        <!-- CTA Button -->
        <button id="finance-save-payment-btn" class="w-full py-4 px-6 rounded-full font-bold text-lg text-[#1E293B] shadow-md focus:outline-none active:scale-[0.98] transition-transform flex items-center justify-center gap-2" style="box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff; border: 2px solid transparent; background: linear-gradient(#F7F9FF, #F7F9FF) padding-box, linear-gradient(to right, #4A90E2, #50E3C2) border-box;">
            Kaydet 
            <span class="material-symbols-rounded text-[#3B82F6]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
        </button>
    </div>
</div>
"""

# Try to find the old modal block to replace
match = re.search(r'<!-- Add Payment Method Modal -->\s*<div id="finance-add-payment-modal".*?</div>\s*</div>\s*</div>', content, re.DOTALL)
if match:
    content = content[:match.start()] + new_modal + content[match.end():]
    with open('/Users/boratektas/Desktop/mizirap/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("COULD NOT FIND MODAL TO REPLACE")

