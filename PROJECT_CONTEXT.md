# MIZIRAP - Proje Hafızası (Project Context / Memory)

Bu dosya, projeyi anlamak için gerekli temel mimari, yapısal bilgileri, alınan kararları ve proje hafızasını içeren güncel belgedir.

## 1. Projenin Amacı ve Kapsamı
Antrenman, kalori, su, finans, kitap/film ve alışveriş takibini tek çatı altında toplayan kişisel bir yaşam/sağlık uygulamasıdır. Gemini destekli yapay zeka asistanı sayesinde kullanıcılar doğal dille harcama ekleyebilir, su/kalori kaydı yapabilir, hedeflerini güncelleyebilir ve kişisel beslenme koçluğu alabilirler. Uygulama, Firebase üzerinde çalışan ve GitHub Pages'te barındırılan mobil odaklı bir Progressive Web App'tir (PWA).

## 2. Mimari Genel Bakış
*   **SPA ve Yönlendirme:** Tek sayfa uygulaması (SPA) yapısındadır. Yönlendirme (routing), özel bir History API tabanlı mekanizma ile sağlanır.
*   **Veri Akışı:** Firebase Firestore (NoSQL) üzerinden asenkron veri senkronizasyonu yapılır. Dashboard, ilgili belgeleri `onSnapshot` ile dinleyerek gerçek zamanlı güncellenir. Çevrimdışı destek (offline persistence) aktiftir.
*   **Bileşen İlişkisi:** Her modül (water, calories, finance vb.) bağımsız bir JS dosyasıdır. Ortak durum (state) yönetimi `sharedState.js` üzerinden, olay dinleyicileri (event listeners) `listenerManager.js` ile yönetilir. Ana denetleyici `app.js`'dir.

## 3. Kullanılan Teknoloji Yığını ve Seçim Nedenleri
*   **Frontend:** HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Custom Neumorphism). (Sadelik, hafiflik ve doğrudan DOM manipülasyonu tercih edildi).
*   **CSS Framework:** Kısmi Tailwind CSS. (Eskiden CDN kullanılıyordu, ancak performans ve offline destek için `tailwind3-cli.exe` ile statik build edilmeye başlandı).
*   **Backend (BaaS):** Firebase v10.14.1 (Auth, Firestore, Storage). (Gerçek zamanlı senkronizasyon ve çevrimdışı destek için).
*   **Yapay Zeka:** Gemini API (`gemini-3.5-flash-lite` ve fallback olarak `gemini-3.6-flash`).
*   **Harici Kütüphaneler:**
    *   `SortableJS`: Dashboard widget'larını sürükle-bırak ile kişiselleştirmek için.
    *   `Chart.js`: Finans grafiklerini çizmek için.
    *   `Panzoom`: Egzersiz görsellerinde yakınlaştırma için.
    *   `CollectAPI`: Güncel finans, döviz ve altın kurlarını çekmek için.

## 4. Kilometre Taşları ve Yapılmış Önemli İşler
*   **Modül Tamamlanmaları:** Dashboard, Workout, Calories, Water, Finance, Shopping, Books/Movies, Tools ve Profile modüllerinin temel özellikleri tamamlandı.
*   **Tasarım Revizyonu:** Neumorphism ve Neon-Glow estetiği sisteme başarıyla entegre edildi, Swipe-to-go-back mekanizması kuruldu.
*   **Widget Kişiselleştirme:** Dashboard ekranında widget'ların 500ms basılı tutularak taşınabilmesi sağlandı.
*   **Yapay Zeka (AI) Entegrasyonu:**
    *   Gemini API ile sohbet asistanı eklendi.
    *   Asistana çoklu araç çağrısı (Function Calling) yeteneği (Finans, Su, Kalori, Alışveriş, Profil güncelleme) kazandırıldı.
    *   Beslenme koçu ve onboarding senaryoları eklendi.
    *   `gemini-3.5-flash-lite` modeline geçiş yapılarak kapasite optimize edildi, maliyet ve kota verimliliği artırıldı.
    *   **Dayanıklılık (Resilience):** AI istekleri için 30 saniye per-request timeout, 3 tekrar deneme (üstel beklemeli), `gemini-3.6-flash` yedek modeli kullanımı ve toplam 60 saniyelik limit mekanizması (deadline) kuruldu.
*   **Temizlik ve Optimizasyon:** Kullanılmayan `.tmp` ve `headers.txt` gibi dosyalar temizlendi ve `.gitignore` ile yoksayıldı.

## 5. Önemli Teknik ve Tasarım Kararları
*   **Mobil Odaklılık (Katı Kısıt):** Masaüstü (responsive) deneyimi desteklenmez. Arayüz `max-w-[420px]` içinde simüle edilir.
*   **Neumorphism Stili:** Tailwind'in gölgeleri yerine custom `box-shadow` (`neo-surface`, `neo-inset`) yapıları kullanılır. Bu tasarımdan sapılamaz.
*   **Uygulama İçi "Geri" Butonlarının Yokluğu:** OS native hissiyatı (swipe to go back) yaratmak adına arayüzde geri butonu kullanılmaz, History API ile yürütülür.
*   **Loading UX:** "0" verilerinin yanıltıcı görünmesini engellemek için yükleme anlarında iskelet yükleyici tercih edilmiştir.
*   **Client-Side AI Key:** Gemini API anahtarı Firebase veritabanından çekilip istemci tarafında tutulmaktadır. Sunucu maliyetlerinden kaçınmak adına kabul edilen bir güvenlik tavizidir.

## 6. Denenip Terk Edilen Yaklaşımlar (Yapılmayacaklar)
*   **Tailwind CDN:** Performans ve çevrimdışı çalışma kısıtları nedeniyle terk edildi, yerini lokal CLI build işlemine (`build-css.bat`) bıraktı.
*   **Sınırsız AI Geçmişi:** Model bağlamının şişmesi nedeniyle tüm sohbeti göndermekten vazgeçildi, `slice(-10)` ile son 10 mesaja sınırlandı.
*   **Sınırsız API Beklemesi:** 503/429 yoğunluk hatalarında arayüzün kilitlenmemesi için hard-timeout mekanizmalarına geçildi.
*   **PowerShell ile Dosya Düzenleme:** Türkçe karakter ve encoding (mojibake) bozulmaları nedeniyle kesinlikle TERK EDİLDİ. (Sadece yerleşik str_replace veya write_to_file araçları kullanılmalı).

## 7. Bilinen Sorunlar ve Teknik Borç
*   **AI Yanıt Gecikmesi (Latency):** AI asistanı bir mesaj aldığında sırasıyla profil, kalori, özet, kategori ve ödeme yöntemi verilerini (5 ayrı `await`) okur, bu da API çağrısı başlamadan önce ciddi bir yavaşlamaya neden olur. Şu an `debug/assistant-latency` dalında loglama (ölçüm) aşamasındadır.
*   **Tarayıcı Önbellekleme Sorunu:** Uygulamada `sw.js` (Service Worker) bulunmamakta, `app.js` ise `?v=20260920` gibi statik bir cache-buster ile çağrılmaktadır. JS dosyalarında yapılan son değişikliklerin canlıya yansıması için kullanıcıların "hard refresh" yapması gerekmektedir.
*   **Finans Senkronizasyon Bug'ı:** AI asistan ile finans işlemi eklendiğinde işlem sadece listeye yazılmakta, Dashboard'daki günlük özeti güncellememektedir. Çözümü `fix/assistant-finance-sync` dalında push edilmiş ancak henüz `main`'e merge edilmemiştir.

## 8. Açık TODO'lar ve Öncelik Sırası
1. **YÜKSEK:** AI gecikme testlerinin sonuçlarını alıp (ardışık Firestore okumalarını paralelleştirerek veya streaming kullanarak) gecikmeyi azaltmak.
2. **YÜKSEK:** `fix/assistant-finance-sync` PR'ını main'e birleştirmek.
3. **ORTA:** `index.html`'deki statik cache-buster parametresini otomatik hale getirmek veya PWA Service Worker ile dinamik güncellemeleri sağlamak.
4. **DÜŞÜK:** Performans odaklı Firestore okuma-yazma kotalarının azaltılması.
5. **DÜŞÜK:** Aktif antrenman (workout) seans yönetiminin test edilip edge case'lerinin çözülmesi.

## 9. Geliştirici Kısıtlamaları (BUNLARI ASLA YAPMA)
*   **PowerShell Düzenlemesi:** Dosyaları değiştirmek için `Set-Content` veya `-replace` ASLA KULLANMA.
*   **Tasarım Dışına Çıkma:** Yeni modüller mevcut yapıların kopyalanıp uyarlanmasıyla yapılmalı, düz ve klasik buton/kart tasarımları kullanılmamalıdır.
*   **Veri Migration'ı:** Aksi açıkça istenmedikçe Firestore üzerindeki mevcut kullanıcı veri yapısını değiştirecek köklü hareketlerden kaçın.
*   **Varsayılan API Anahtarı Kodlama:** API anahtarları asla kaynak koda hardcoded olarak yazılmamalıdır (Profile UI'dan alınır).
