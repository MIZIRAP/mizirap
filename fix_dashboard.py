import re

with open('index.html', 'r') as f:
    content = f.read()

# We need to replace the <main class="px-6 py-4 max-w-md mx-auto flex flex-col gap-6"> 
# until the end of that main tag inside view-dashboard.

new_main = """        <main class="px-6 py-4 max-w-md mx-auto flex flex-col gap-6">
            <!-- Featured Workout Card -->
            <div class="cursor-pointer nav-tab w-full rounded-[24px] p-[2px] bg-gradient-to-br from-[#A855F7] via-[#3B82F6] to-[#22C55E]" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-workout">
                <div class="bg-[#F0F2F8] rounded-[22px] p-6 flex justify-between items-start w-full">
                    <div class="flex flex-col gap-1">
                        <h2 class="text-[#181C20] font-[600] text-[14px] leading-[20px] tracking-[0.7px] uppercase" style="font-family: 'Plus Jakarta Sans', sans-serif;">Workout</h2>
                        <h3 class="text-[#181C20] font-[700] text-[24px] leading-[32px]" style="font-family: 'Plus Jakarta Sans', sans-serif;" id="stat-workout-split">Yapılmadı</h3>
                    </div>
                    <div class="w-12 h-12 rounded-[16px] bg-[#F0F2F8] flex items-center justify-center shrink-0" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.8);">
                        <span class="material-symbols-rounded text-[#A855F7] text-[20px]" style="font-variation-settings: 'FILL' 1;">fitness_center</span>
                    </div>
                </div>
            </div>

            <!-- 2x2 Grid -->
            <div class="grid grid-cols-2 gap-6">
                <!-- Water -->
                <div class="rounded-[24px] p-[1px] bg-gradient-to-br from-[#3B82F6] to-[#22C55E] cursor-pointer nav-tab" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-water">
                    <div class="bg-[#F0F2F8] rounded-[23px] p-5 flex flex-col items-center justify-center gap-3 aspect-square h-full">
                        <h3 class="text-[#181C20] font-[600] text-[14px] leading-[20px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Su Takibi</h3>
                        <div class="relative w-[96px] h-[96px] rounded-full flex items-center justify-center">
                            <svg class="w-20 h-20" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="neonGradient1" x1="0%" x2="100%" y1="0%" y2="100%">
                                        <stop offset="0%" stop-color="#8a4cfc"></stop>
                                        <stop offset="50%" stop-color="#3b82f6"></stop>
                                        <stop offset="100%" stop-color="#22c55e"></stop>
                                    </linearGradient>
                                </defs>
                                <circle class="text-surface-variant stroke-current" cx="50" cy="50" fill="transparent" r="40" stroke-width="6.4"></circle>
                                <circle class="progress-ring__circle" id="dash-prog-water" cx="50" cy="50" fill="transparent" r="40" stroke="url(#neonGradient1)" stroke-dasharray="251.2" stroke-dashoffset="251.2" stroke-linecap="round" stroke-width="6.4"></circle>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center flex-col">
                                <span class="material-symbols-rounded text-[#181C20] text-[20px]">water_drop</span>
                            </div>
                        </div>
                        <div class="text-center mt-1">
                            <span class="font-[700] text-[16px] leading-[24px] text-[#181C20] block" style="font-family: 'Plus Jakarta Sans', sans-serif;" id="dashboard-water-text">0<span class="font-[400] text-[12px] leading-[16px] text-[#181C20]">/0ml</span></span>
                        </div>
                    </div>
                </div>

                <!-- Kcal -->
                <div class="rounded-[24px] p-[1px] bg-gradient-to-br from-[#A855F7] to-[#22C55E] cursor-pointer nav-tab" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-calories">
                    <div class="bg-[#F0F2F8] rounded-[23px] p-5 flex flex-col items-center justify-center gap-3 aspect-square h-full">
                        <h3 class="text-[#181C20] font-[600] text-[14px] leading-[20px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Kalori Takibi</h3>
                        <div class="relative w-[96px] h-[96px] rounded-full flex items-center justify-center">
                            <svg class="w-20 h-20" viewBox="0 0 100 100">
                                <circle class="text-surface-variant stroke-current" cx="50" cy="50" fill="transparent" r="40" stroke-width="6.4"></circle>
                                <circle class="progress-ring__circle" id="dash-prog-cals" cx="50" cy="50" fill="transparent" r="40" stroke="url(#neonGradient1)" stroke-dasharray="251.2" stroke-dashoffset="251.2" stroke-linecap="round" stroke-width="6.4"></circle>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center flex-col rounded-full">
                                <span class="material-symbols-rounded text-[#181C20] text-[18px]">local_dining</span>
                            </div>
                        </div>
                        <div class="text-center mt-1">
                            <span class="font-[700] text-[16px] leading-[24px] text-[#181C20] block" style="font-family: 'Plus Jakarta Sans', sans-serif;" id="dashboard-calories-text">-<span class="font-[400] text-[12px] leading-[16px] text-[#181C20]">/-</span></span>
                        </div>
                    </div>
                </div>

                <!-- Reading -->
                <div class="rounded-[24px] p-[1px] bg-gradient-to-br from-[#3B82F6] to-[#22C55E] cursor-pointer nav-tab" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-books">
                    <div class="bg-[#F0F2F8] rounded-[23px] p-5 flex flex-col justify-between aspect-square h-full relative">
                        <div class="flex justify-between items-start w-full relative z-10">
                            <div class="w-10 h-10 rounded-[16px] bg-[#F0F2F8] flex items-center justify-center" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.8);">
                                <span class="material-symbols-rounded text-[#3B82F6] text-[20px]">menu_book</span>
                            </div>
                        </div>
                        <div class="mt-auto relative z-10">
                            <h3 class="text-[#181C20] font-[600] text-[14px] leading-[20px] mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">Reading</h3>
                            <div class="flex items-end gap-1" id="dashboard-books-text">
                                <span class="text-[#181C20] font-[700] text-[24px] leading-[24px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">0</span>
                                <span class="text-[#181C20] font-[400] text-[12px] leading-[16px] mb-0.5" style="font-family: 'Plus Jakarta Sans', sans-serif;">/0 p.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Watching -->
                <div class="rounded-[24px] p-[1px] bg-gradient-to-br from-[#3B82F6] to-[#22C55E] cursor-pointer nav-tab" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-movies">
                    <div class="bg-[#F0F2F8] rounded-[23px] p-5 flex flex-col justify-between aspect-square h-full">
                        <div class="flex justify-between items-start w-full">
                            <div class="w-10 h-10 rounded-[16px] bg-[#F0F2F8] flex items-center justify-center" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.8);">
                                <span class="material-symbols-rounded text-[#3B82F6] text-[20px]">movie</span>
                            </div>
                        </div>
                        <div class="mt-auto">
                            <h3 class="text-[#181C20] font-[600] text-[14px] leading-[20px] mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">Watching</h3>
                            <div class="flex items-end gap-1" id="dashboard-movies-text">
                                <span class="text-[#181C20] font-[700] text-[24px] leading-[24px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">0</span>
                                <span class="text-[#181C20] font-[400] text-[12px] leading-[16px] mb-0.5" style="font-family: 'Plus Jakarta Sans', sans-serif;">items</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Finance Card -->
            <div class="rounded-[24px] p-[1px] bg-gradient-to-br from-[#3B82F6] to-[#22C55E] cursor-pointer nav-tab" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-finance">
                <div class="bg-[#F0F2F8] rounded-[23px] p-6 flex items-center justify-between h-[100px]">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-[16px] bg-[#F0F2F8] flex items-center justify-center shrink-0" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.8);">
                            <span class="material-symbols-rounded text-[#A855F7] text-[18px]">account_balance_wallet</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <h2 class="text-[#181C20] font-[600] text-[14px] leading-[20px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Total Balance</h2>
                            <h3 class="text-[#181C20] font-[700] text-[20px] leading-[28px]" style="font-family: 'Plus Jakarta Sans', sans-serif;" id="stat-balance">0 TL</h3>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Shopping List Button -->
            <div class="rounded-[24px] p-[1px] bg-gradient-to-br from-[#3B82F6] to-[#22C55E] cursor-pointer nav-tab" style="box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8);" data-target="view-shopping">
                <div class="bg-[#F0F2F8] rounded-[23px] p-5 h-[80px] w-full flex items-center justify-between transition-all">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-[16px] bg-[#F0F2F8] flex items-center justify-center shrink-0" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.8);">
                            <span class="material-symbols-rounded text-[#A855F7] text-[20px]">shopping_cart</span>
                        </div>
                        <span class="text-[#181C20] font-[600] text-[18px] leading-[28px]" style="font-family: 'Plus Jakarta Sans', sans-serif;">Shopping List</span>
                    </div>
                </div>
            </div>
        </main>"""

start_str = '        <main class="px-6 py-4 max-w-md mx-auto flex flex-col gap-6">'
end_str = '        </main>'

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx) + len(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_main + content[end_idx:]
    with open('index.html', 'w') as f:
        f.write(content)
    print("Dashboard main updated successfully.")
else:
    print("Could not find the target main element.")
