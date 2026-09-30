# MIZIRAP - Proje Hafızası (Project Context / Memory)

Son Güncelleme: 2026-09-30
Commit Hash (Tarama Zamanı): edf17fd

Bu dosya, projeyi anlamak için gerekli temel mimari, yapısal bilgileri, alınan kararları ve proje hafızasını içeren güncel belgedir. Sadece okuma (read-only) taraması ile proje kod tabanı doğrulanarak hazırlanmıştır.

## 1. Projenin Amacı ve Kapsamı
Antrenman, kalori, su, finans, kitap/film ve alışveriş takibini tek çatı altında toplayan kişisel bir yaşam/sağlık uygulamasıdır. Gemini destekli yapay zeka asistanı sayesinde kullanıcılar doğal dille harcama ekleyebilir, su/kalori kaydı yapabilir, hedeflerini güncelleyebilir ve kişisel beslenme koçluğu alabilirler. Uygulama, Firebase üzerinde çalışan ve GitHub Pages'te barındırılan mobil odaklı bir Progressive Web App'tir (PWA).

## 2. Mimari Genel Bakış
*   **SPA ve Yönlendirme:** Tek sayfa uygulaması (SPA) yapısındadır. Yönlendirme (routing), özel bir History API tabanlı mekanizma ile `app.js` üzerinden sağlanır.
*   **Veri Akışı:** Firebase Firestore (NoSQL) üzerinden asenkron veri senkronizasyonu yapılır. Dashboard, ilgili belgeleri `onSnapshot` ile dinleyerek gerçek zamanlı güncellenir.
*   **Bileşen İlişkisi:** Her modül bağımsız bir JS dosyasıdır. Modüller sekme geçişlerinde lazy load ile yüklenir. Ortak durum (state) `sharedState.js` üzerinden, olay dinleyicileri (zombie listener hijyeni için) `listenerManager.js` ile yönetilir. Ana denetleyici `app.js`'dir.

## 3. Dosya Ağacı ve Sorumlulukları
*   `index.html`: Tek ve ana HTML dosyası. Tüm sekmelerin tasarımlarını ve bottom navbar'ı barındırır.
*   `app.js`: Ana entry point. Auth durumu, History API (yönlendirme) ve lazy load sekme geçişlerini yönetir.
*   `ai-chat.js`: AI Asistanının (Gemini) sohbet, UI ve takım çantası (function calling) mantığını içerir.
*   `dashboard.js`: Ana özet ekranı. Widget sıralama (SortableJS) ve günlük özet migration'larını (auto-heal dahil) barındırır.
*   `calories.js`: Besin arama, kütüphane ve porsiyon kaydetme.
*   `workout.js`: Antrenman programı (split) yönetimi.
*   `activeSession.js`: Aktif antrenman oturumlarının sayacı ve set kayıtları.
*   `exerciseDetail.js`: Egzersiz görselleri (kas haritası) ve panzoom modülü.
*   `finance.js`: Gelir/gider işlemleri ve kural bazlı kategorizasyon.
*   `shopping.js`: Market/alışveriş listesi yönetimi.
*   `books.js` & `movies.js`: Okuma ve izleme listesi (durum bazlı).
*   `water.js`: Basit su takibi ve animasyonları.
*   `tools.js`: Vücut kitle indeksi vb. ekstra araçlar.
*   `profile.js`: API anahtarı girişi ve kullanıcı ayarları.
*   `sharedState.js`: Profil verisi önbelleği ve paylaşımlı stateler (fetchSharedProfile vb.).
*   `listenerManager.js`: Firestore onSnapshot ve DOM listener'larının sayfa değişimlerinde temizlenmesini sağlar.
*   `tailwind3-cli.exe` & `build-css.bat`: Tailwind statik build araçları.
*   `firebase-config.js`: Firebase başlatma ayarları.

## 4. Kullanılan Teknoloji Yığını ve Seçim Nedenleri
*   **Frontend:** HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Custom Neumorphism).
*   **CSS Framework:** Kısmi Tailwind CSS. (`tailwind3-cli.exe` ile offline build edilerek `tailwind-build.css` oluşturulur).
*   **Backend (BaaS):** Firebase v10.14.1 (Auth, Firestore).
*   **Yapay Zeka:** Gemini API (`gemini-3.5-flash-lite` ve fallback olarak `gemini-3.6-flash`).
*   **Harici Kütüphaneler:**
    *   `SortableJS`: Dashboard widget'larını sürükle-bırak (500ms gecikme ile) ile kişiselleştirmek için.
    *   `Chart.js`: Finans grafiklerini çizmek için.
    *   `Panzoom`: Egzersiz görsellerinde yakınlaştırma için.
    *   `CollectAPI`: Döviz/altın kurları için (anahtarlar `tools.js` içinde kullanılıyor).

## 5. Firestore Veri Şeması ve Yollar
Tüm yollar `users/{uid}/` altındadır. Temel koleksiyonlar:
*   `summary/daily-{YYYY-MM-DD}`: Günlük su ve kalori tüketim özetleri. (Dashboard tarafından dinlenir).
*   `profile/data`: Widget sıralamaları (`widgetOrder`, `bottomWidgetOrder`) ve temel kullanıcı ayarları.
*   `settings/aiAssistant`: Gemini API anahtarının (geminiApiKey) tutulduğu belge.
*   `settings/calories` & `settings/water`: Günlük makro/kalori ve su hedefleri.
*   `calorieLogs`: `name`, `kcal`, `protein`, `karb`, `yag`, `grams`, `dateStr`, `createdAt`, `type` ('Food').
*   `waterLogs`: `amount`, `createdAt`.
*   `finance_transactions`: `amount`, `type`, `categoryId`, `paymentMethodId`, `description`, `dateStr`, `createdAt`.
*   `shoppingList`: `title`, `done`, `createdAt`.
*   `books` / `movies`: `title`, `status`, `createdAt`, `updatedAt` vb.
*   `splits`: Antrenman programları.

## 6. Yönlendirme (Route) ve State Listesi
*   **Route Sistemi:** `app.js` içerisindeki `window.showView(viewId)` ve `window.addEventListener("popstate")` (History API) kullanılarak sağlanır. Tüm sekmeler `<div class="view hidden" id="view-...">` şeklindedir ve sadece aktif olanın `hidden` sınıfı kaldırılır. Geçişlerde `viewChanged` CustomEvent fırlatılır.
*   **Listener Hijyeni:** `listenerManager.js` sayesinde `viewChanged` event'ine bağlı olarak eski sekmenin Firestore dinleyicileri (onSnapshot) temizlenir.

## 7. AI Asistan (Gemini) Detayı
*   **Akış:** Kullanıcı mesajı UI'dan alınır -> `buildAiContext()` ile mevcut state çekilir -> Mesaj ve context Gemini API'ye gönderilir -> Araç (Function Calling) gerekiyorsa Firestore'a yazılır -> Sonuç döndürülür.
*   **Latency (Gecikme) Zinciri:** `buildAiContext()` şu anda 5 farklı koleksiyonu *sıralı (await)* şekilde okur: `calorieLogs`, `dailySummary`, `finance_categories`, `finance_payment_methods`, `books`. (TODO: Bunlar `Promise.all` ile paralelleştirilmelidir).
*   **Araçlar (Function Calling):**
    *   `addShoppingItems`, `addFinanceTransaction`, `addWaterLog`, `addCalorieLog`
    *   `get_calorie_goal`, `update_calorie_goal`, `update_water_goal`, `update_profile_data`
    *   Antrenman: `create_new_program`, `add_day_to_program`, `add_exercise_to_day`, `get_user_workout_context`, `delete_day_from_program`, `remove_exercise_from_day`, `update_exercise_sets`.
*   **Model ve Dayanıklılık:** `gemini-3.5-flash-lite` varsayılandır. 6000ms offline timeout'lar kullanılır. `slice(-10)` ile geçmiş 10 mesaj bağlamda tutulur.
*   **API Anahtarı:** UI üzerinden (Profil) girilir, Firebase `settings/aiAssistant` yoluna kaydedilir ve oradan okunarak istemci tarafında API çağrısında kullanılır (Serverless BaaS kısıtlaması nedeniyle kabul edilen bir güvenlik tavizi).

## 8. Stil Sistemi ve Tasarım Rehberi
*   **Kısıtlar:** Arayüz `max-w-[420px]` içinde simüle edilir. "Geri" butonu kullanılmaz, swipe-to-go-back ve bottom-navbar navige eder.
*   **Neumorphism:** `style.css` içerisinde tanımlı `neo-surface`, `neo-inset`, `neo-surface-small` gibi gölge sınıfları kullanılır.
*   **Renk Paleti:** Özel renkler (background `#F0F2F8`, on-background, neon-purple, vb.) `tailwind.config.js` içinde tanımlıdır.
*   **Yeni Modül Referansı:** Yeni bir modül eklenecekse, `shopping.js` veya `water.js` gibi basit, kendi `initXXX` fonksiyonu ve dinleyici temizleme mantığı olan dosyalar kopyalanarak referans alınmalıdır.

## 9. Kilometre Taşları ve Yapılmış Önemli İşler
*   Dashboard, Workout, Calories, Water, Finance, Shopping, Books/Movies, Tools ve Profile modüllerinin temel özellikleri tamamlandı.
*   Neumorphism stili ve Swipe-to-go-back mekanizması kuruldu.
*   AI Asistan entegrasyonu (çoklu araç çağrısı, PPL oluşturma, beslenme koçluğu) eklendi.
*   **iOS Safari Sabit Alt Menü Düzeltmesi (Fix):** PWA başlatıldığında oluşan viewport hatalarına karşı body `relative 100dvh` yapıldı ve navbar `absolute` ile sabitlendi.
*   **Dashboard Oto-İyileştirme (Auto-Heal):** Kalori toplamı hatalarını ve Race-condition'ı önlemek için Firestore `increment()` kullanıldı, `dashboard.js` içerisine hatalı toplamı arka planda gerçek loglarla eşitleyen auto-heal mekanizması eklendi.

## 10. Önemli Teknik ve Tasarım Kararları
*   **Mobil Odaklılık (Katı Kısıt):** Masaüstü (responsive) deneyimi desteklenmez. Arayüz `max-w-[420px]` içinde simüle edilir.
*   **Neumorphism Stili:** Tailwind'in gölgeleri yerine custom `box-shadow` yapıları zorunludur.
*   **Loading UX:** "0" verilerinin yanıltıcı görünmesini engellemek için yükleme anlarında iskelet yükleyici (skeleton loader) tercih edilmiştir.
*   **History API:** Uygulama içi geri dönüşler donanımsal/native geri butonu ile çalışır.

## 11. Denenip Terk Edilen Yaklaşımlar (Yapılmayacaklar)
*   **Tailwind CDN:** Performans ve çevrimdışı çalışma kısıtları nedeniyle terk edildi, yerini lokal CLI build işlemine (`build-css.bat`) bıraktı.
*   **Sınırsız AI Geçmişi:** Model bağlamının şişmesi nedeniyle tüm sohbeti göndermekten vazgeçildi, `slice(-10)` ile son 10 mesaja sınırlandı.
*   **PowerShell ile Dosya Düzenleme:** Türkçe karakter ve encoding (mojibake) bozulmaları nedeniyle kesinlikle TERK EDİLDİ. (Sadece yerleşik str_replace veya write_to_file araçları kullanılmalı).

## 12. Bilinen Sorunlar ve Teknik Borç
*   **AI Yanıt Gecikmesi (Latency):** `ai-chat.js` içerisindeki `buildAiContext()` fonksiyonunda yapılan 5 adet Firestore okuması asenkron `await` zinciri ile yapılıyor, bu paralelleştirilmeli. (Şu an `debug/assistant-latency` dalında loglama (ölçüm) aşamasındadır).
*   **Tarayıcı Önbellekleme Sorunu:** Uygulamada `sw.js` (Service Worker) bulunmamakta, `index.html` içinde `app.js` `?v=20260927-2` gibi statik bir cache-buster ile çağrılmaktadır. (Son düzenlemelerde `manifest.json` ve `firebase.json`'da cache yapılandırmaları iyileştirilse de PWA tarafında sw.js eksik).
*   **Tüm Logları Çekme (Verimsizlik):** `dashboard.js` içindeki su migration (`waterQ`) ve bazı diğer hesaplamalar (örn. geçmiş aylar için) tüm koleksiyonu çekmektedir, bu büyük veri setlerinde kilitlenmelere yol açabilir.

## 13. Açık TODO'lar ve Öncelik Sırası
1. **YÜKSEK:** AI gecikme testlerinin sonuçlarını alıp (ardışık Firestore okumalarını `Promise.all` ile paralelleştirerek) gecikmeyi azaltmak.
2. **ORTA:** `index.html`'deki statik cache-buster parametresini otomatik hale getirmek veya PWA Service Worker ile tam offline dinamik güncellemeleri sağlamak.
3. **ORTA:** Firestore üzerinde tüm logları çekmek yerine Firebase Cloud Functions veya client-side aggregration yöntemleri ile belge okuma sayısını azaltmak.
4. **DÜŞÜK:** Aktif antrenman (workout) seans yönetiminin test edilip edge case'lerinin çözülmesi.

## 14. Geliştirici Kısıtlamaları (BUNLARI ASLA YAPMA)
*   **Yanlış Branch'e Push Yapma (ÇOK KRİTİK):** Canlı site (GitHub Pages) `main` branch'inden beslenmektedir. Çalışmalarınızı mutlaka `main` branch'ine pushlamalı veya çalıştığınız dalı iş bitiminde `main` ile birleştirmelisiniz.
*   **PowerShell Düzenlemesi:** Dosyaları değiştirmek için `Set-Content` veya `-replace` ASLA KULLANMA.
*   **Tasarım Dışına Çıkma:** Yeni modüller mevcut yapıların kopyalanıp uyarlanmasıyla yapılmalı, düz ve klasik buton/kart tasarımları kullanılmamalıdır.
*   **Veri Migration'ı:** Aksi açıkça istenmedikçe Firestore üzerindeki mevcut kullanıcı veri yapısını değiştirecek köklü hareketlerden kaçın.
*   **Varsayılan API Anahtarı Kodlama:** API anahtarları asla kaynak koda hardcoded olarak yazılmamalıdır (Profile UI'dan alınır).
