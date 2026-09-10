# MIZIRAP "Daily Goal" Popup Tasarım ve Yapı Özeti

Bu doküman, Su ve Kalori modüllerindeki "Günlük Hedef" (Daily Goal) ayar popup'larının HTML/CSS yapılarını, farklılıklarını ve davranışlarını referans amaçlı belgelemektedir. Kod değişikliği içermez.

## 1. HTML Yapısı ve Temel Farklar (Orijinalite)
Her iki popup (modal) da aynı yapısal temeli paylaşan **Bottom-Sheet** (ekranın altından çıkan) stili pencerelerdir. 

**Orijinal/Temel Versiyon:** Su Takibi Modalı (`#water-goal-modal`). İlk oluşturulan yapıdır, renkler ve gölgeler (box-shadow) büyük oranda inline style veya ham hex kodlarıyla (`#4A90E2` gibi) yazılmıştır.
**Türetilmiş/Gelişmiş Versiyon:** Kalori Takibi Modalı (`#calories-goal-modal`). Su modalından kopyalanıp geliştirilmiştir; inline style'lar yerine projenin Tailwind config'inde sonradan tanımlanan class'lar (`text-silk-blue`, `shadow-neumorphic-inset` vb.) ve `aria-label` gibi erişilebilirlik etiketleri eklenmiştir. Ayrıca kalori modalında alt alta ekstra makro kontrol barları bulunur.

Referans olarak bir UI kopyalanacaksa, kod standartları açısından **Kalori Takibi Modalı (`#calories-goal-modal`)** daha doğru bir temeldir.

## 2. Popup'ın Genel Yapısı (Container ve Animasyon)
*   **Pozisyon:** `fixed inset-0 z-50 flex items-end justify-center` (Bottom-sheet görünümü).
*   **Backdrop (Arkaplan Overlay):** `absolute inset-0 bg-black/10 backdrop-blur-sm z-10 opacity-0 transition-opacity duration-300` (Siyah %10 opaklık ve arka plan bulanıklaştırma).
*   **Content Container:** `relative w-full max-w-sm bg-[#F0F2F8] rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] p-6 z-20 flex flex-col items-center transform transition-transform duration-300 translate-y-full pb-8` (veya `pb-10`).
*   **Açılış/Kapanış Animasyonu:** Başlangıçta JS ile `hidden` class'ı kaldırılır, hemen ardından (requestAnimationFrame) `translate-y-full` class'ı silinip `translate-y-0` eklenir. Backdrop'ta da `opacity-0` silinip `opacity-100` eklenir. Süre `duration-300` (300ms) olup `transition-transform` ile kayarak girer.
*   **Kapatma Yöntemi ve Tasarımı:** Modallar backdrop'a tıklayarak veya JS üzerinden kapatılabilir (ayrı bir X butonu yoktur). Ancak üst kısımda mobilde kaydırarak (swipe) kapatma hissiyatı vermek için şu görsel bileşen bulunur: 
    *   Drag Handle: `<div class="w-12 h-1.5 bg-gray-300 rounded-full mb-6 cursor-pointer" id="...-close-handle"></div>`

## 3. Başlık Alanı
*   **Metin (Su):** "Hedefini Güncelle"
*   **Metin (Kalori):** "Hedeflerini Güncelle"
*   **Konum:** Ortalanmış (`w-full text-center mb-6`).
*   **Font/Renk Sınıfları:** `text-xl font-bold text-gray-800 mb-2` (Projenin global font-family'si ne ise odur, ek bir inline font belirtilmemiştir).

## 4. Hedef Değeri Giriş/Gösterim Alanı (Kontroller)
Değerler klavyeyle input üzerinden girilmez, ortadaki göstergenin sağında ve solunda yer alan büyük `-` ve `+` butonlarına tıklanarak artırılır/azaltılır.

*   **Ana Wrapper:** `<div class="flex items-center justify-between w-full px-4 mb-6">`
*   **Eksi Butonu:** `<button class="neo-button w-14 h-14 rounded-full flex items-center justify-center bg-[#F0F2F8] text-silk-blue focus:outline-none">` (İçinde material symbol `remove` bulunur).
*   **Artı Butonu:** `<button class="neo-button w-14 h-14 rounded-full flex items-center justify-center bg-[#F0F2F8] text-silk-green focus:outline-none">` (İçinde material symbol `add` bulunur).
*   **Ortadaki Gösterge Container (Neumorphic Inset Daire):** `<div class="flex flex-col items-center justify-center w-32 h-32 rounded-full shadow-neumorphic-inset bg-[#F0F2F8]">`
*   **Sayısal Değer:** `<span class="text-3xl font-extrabold text-gray-800">2000</span>`
*   **Birim (ml/kcal):** `<span class="text-sm font-semibold text-silk-blue mt-1">kcal</span>`

## 5. Aksiyon Butonları
Her iki popup'ta da yalnızca Tek ve Birincil bir buton (Kaydet) bulunur. İkincil bir vazgeç/iptal butonu yoktur.

*   **Kaydet Butonu Yapısı:** `<button class="w-full py-4 px-6 rounded-full font-bold text-lg text-gray-800 gradient-border shadow-md focus:outline-none active:scale-[0.98] transition-transform flex items-center justify-center gap-2">`
*   **Konum:** Popup'ın en alt satırında, `w-full` (tam genişlikte) yer alır.
*   **İkon:** İçerisinde `check_circle` (Kalori) veya `water_drop` (Su) ikonu (text-silk-blue vb.) barındırır.

## 6. Su ve Kalori Popup'ları Arasındaki Tutarsızlıklar (Farklar)
*   **CSS Class / Inline Style Kullanımı:** Su modalında `shadow-neumorphic-inset` gibi helper class'lar henüz eklenmediği için daire iç gölgeleri inline (`style="box-shadow: inset 4px 4px..."`) olarak, renkler hex olarak (`#4A90E2`) yazılıdır. Kalori modalında proje Tailwind değişkenleri (`text-silk-blue`, `text-silk-green`) tercih edilmiştir.
*   **Erişilebilirlik:** Kalori modalında butonlarda `aria-label="Decrease amount"` gibi özellikler varken, Su modalında yoktur.
*   **Padding Alt (pb):** Su modalı content'inde `pb-10` kullanılırken, kalori modalında `pb-8` kullanılmıştır.
*   **İçerik Zenginliği:** Kalori modalında ana hedef dairesinin ALTINDA, protein/karb/yağ makroları için 3 adet neo-inset satırı daha bulunur. Su modalı ise sadece tek bir daire göstergesinden ibarettir.

## 7. Popup'ların Tetiklendiği Butonlar
Bu modallar, ilgili sayfanın (`view-water` veya `view-calories`) en üstünde bulunan ana neon çemberin (Circular Progress Section) hemen altındaki "Daily Goal" (Günlük Hedef) butonlarına tıklanarak açılır.

*   **Su Butonu:** `<button id="btn-edit-water-goal" class="mt-8 px-8 py-3 rounded-full bg-[#F0F2F8] text-[#1E293B] font-bold uppercase tracking-wider text-xs"...>`
*   **Kalori Butonu:** `<button id="calories-goal-btn" class="mt-8 px-8 py-3 rounded-full bg-[#F0F2F8] text-[#1E293B] font-bold uppercase tracking-wider text-xs active:scale-95 transition-transform"...>`
(Not: Kalori butonuna ekstradan tıklama animasyonu `active:scale-95 transition-transform` eklenmiştir, Su butonunda bu eksiktir).
