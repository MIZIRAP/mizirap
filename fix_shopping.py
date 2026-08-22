import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the view-shopping HTML
old_shopping = re.search(r'<section id="view-shopping".*?</section>', html, re.DOTALL).group(0)

new_shopping = """<section id="view-shopping" class="view hidden bg-[#F7F9FF] text-[#1E293B] min-h-[100dvh] pb-[128px]">
<!-- Top App Bar -->
<header class="w-full top-0 sticky z-40 max-w-md mx-auto px-[20px] py-4 bg-[#F7F9FF]">
    <div class="flex items-center justify-between w-full gap-[53px]">
        <button class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#F7F9FF] active:scale-95 transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;" onclick="document.getElementById('view-dashboard').classList.remove('hidden'); document.getElementById('view-shopping').classList.add('hidden');">
            <span class="material-symbols-rounded text-[#1E293B] text-[16px]">arrow_back</span>
        </button>
        <h1 class="font-[700] text-[24px] leading-[32px] text-[#1E293B] tracking-[-0.24px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Alışveriş Listesi</h1>
        <button class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#F7F9FF] active:scale-95 transition-transform" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;" id="clear-shopping-btn">
            <span class="material-symbols-rounded text-[#1E293B] text-[20px]">delete</span>
        </button>
    </div>
</header>
<!-- Main Content Container -->
<main class="w-full max-w-md mx-auto px-[20px] flex flex-col gap-8 pt-8">

    <!-- Quick Add Section -->
    <section class="flex flex-col gap-4">
        <form id="shopping-form" class="flex items-center gap-3 p-4 rounded-[24px] bg-[#F7F9FF] w-full h-[72px]" style="box-shadow: 6px 6px 12px #D1D9E6, -6px -6px 12px #FFFFFF;">
            <button type="submit" class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-[#F7F9FF] active:scale-95 transition-transform" style="box-shadow: 6px 6px 12px #E3E6EE, -6px -6px 12px #FFFFFF;">
                <span class="material-symbols-rounded text-[#50E3C2] text-[16px]">add</span>
            </button>
            <input id="shopping-input" type="text" placeholder="Ürün Ekle" class="bg-transparent border-none outline-none font-[400] text-[14px] leading-[18px] text-[#1E293B] w-full placeholder-[#64748B] focus:ring-0 px-3 h-[36px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">
        </form>
    </section>

    <!-- History Log -->
    <section class="flex flex-col gap-4">
        <h3 class="font-[700] text-[20px] leading-[28px] text-[#1E293B]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Alınacaklar</h3>
        <div class="flex flex-col gap-4 w-full" id="active-shopping-list">
            <!-- Dynamic -->
            <div class="flex justify-center items-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        </div>
    </section>

    <!-- Tamamlananlar -->
    <section class="flex flex-col gap-4 mt-4">
        <h3 class="font-[700] text-[20px] leading-[28px] text-[#1E293B]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Tamamlananlar</h3>
        <div class="flex flex-col gap-4 w-full" id="completed-shopping-list">
            <!-- Dynamic -->
        </div>
    </section>
</main>
</section>"""

html = html.replace(old_shopping, new_shopping)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
