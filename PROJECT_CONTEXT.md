# MIZIRAP - Proje Hafızası (Project Context)

Bu dosya, projeyi anlamak için gerekli temel mimari ve yapısal bilgileri içeren güncel proje hafızasıdır.

## 1. DOSYA YAPISI
*   **`.git/` & `.gitignore`**: Versiyon kontrol yönetim klasörü ve yoksayılanlar dosyası.
*   **`assets/`**: Statik medya ve görsellerin barındırıldığı dizin.
*   **`index.html`**: SPA mimarisine uygun tüm görünümleri barındıran temel ve tek HTML iskeleti.
*   **`style.css`**: Özel "Neumorphic" ve "Neon-Glow" tasarımların barındırıldığı temel stil katmanı.
*   **`app.js`**: Uygulamanın başlatılması, modüllerin bağlanması ve History API tabanlı yönlendirmenin yapıldığı ana kontrolcü.
*   **`auth.js`**: Firebase giriş/kayıt ve oturum açma yönetim modülü.
*   **`dashboard.js`**: Tüm alt modüllerden asenkron verileri çekip özet sayfasında render eden modül.
*   **`workout.js` & `activeSession.js`**: Egzersiz planlaması ve aktif spor anını takip eden gelişmiş antrenman yönetim modülleri.
*   **`calories.js`**: Besin ekleme, makro hesaplama ve günlük öğün kayıt modülü.
*   **`water.js`**: Günlük su tüketim hedefini ve kayıtlarını yöneten modül.
*   **`finance.js`**: Döviz/Altın kur entegrasyonu ile gelir-gider ve bütçe analiz modülü.
*   **`books.js` & `movies.js`**: Medya arşiv ve takip modülleri.
*   **`shopping.js`**: Alışveriş listesi ekleme/silme (CRUD) modülü.
*   **`history.js`**: Tüm genel hareket geçmişini (log) görüntüleyen modül.
*   **`profile.js`**: Kullanıcı ayarları ve hedef bilgilerini tutan modül.
*   **`utils.js` & `listenerManager.js`**: Tarih işlemleri ve DOM olay (event) dinleyicilerinin bellek dostu yönetimi.
*   **`api-config.js` & `firebase-config.js`**: Dış servis (CollectAPI) ve Firebase bağlantı parametreleri.
*   **`manifest.json` & `icon-*.png`**: Progressive Web App (PWA) kurulum dosyaları.

## 2. TEKNOLOJİ YIĞINI
*   **Diller ve Temel Yapı**: HTML5, Vanilla JavaScript (ES6+ modülleri), Vanilla CSS.
*   **Framework/Kütüphane**: Framework kullanılmıyor (Vanilla SPA). CSS için kısmi Tailwind CSS (CDN üzerinden).
*   **Tasarım Dili**: Neumorphism (Glassmorphism esintili neo-surface konsepti), Google Material Symbols.
*   **Backend (BaaS)**: Firebase v10.14.1 (Auth, Firestore, Storage). Çevrimdışı okuma özelliği devrededir.
*   **Harici API**: CollectAPI (Finans modülünde güncel altın/döviz kurları için).
*   **Build/Deploy**: Uygulama GitHub Pages üzerinden barındırılır. Build süreci manuel cache kırma parametresi ile ilerler (`?v=TIMESTAMP`). PWA yapısı desteklenir.

## 3. MODÜL / ÖZELLİK ENVANTERİ
*   **Navigation (Tamamlandı)**: Sekme (tab) ve History API destekli, ekran kaydırmalı (swipe) navigasyon sistemi. Ana ekran `app.js` üzerinden yönetilir.
*   **Dashboard (Tamamlandı)**: Tüm modüllere dair günlük verilerin neon kartlar halinde özetlendiği ana ekran. SortableJS entegrasyonu ile widget'lar (üst 2x2 ve alt butonlar) uzun basılarak (500ms) sürükle-bırak ile kişiselleştirilebilir.
*   **Workout (Tamamlandı)**: Özel "Split" yaratma, egzersiz kütüphanesinden seçim ve canlı seans kaydetme. Firestore tabanlı çalışır. Yakın zamanda kaydır-sil (swipe-to-delete) animasyonlarında "co-slide" iyileştirmesi yapılmıştır.
*   **Calories (Tamamlandı)**: Makro bazlı giriş, kaydır-sil (swipe-to-delete) desteği ve porsiyon klavyesi ile güncel beslenme arşivi.
*   **Water (Tamamlandı)**: Animasyonlu ilerleme çubuğu içeren sıvı takibi (Birim hataları onarıldı).
*   **Finance (Tamamlandı)**: API destekli canlı kur, gelir/gider listesi ve çizgi grafikli (Chart.js vb.) gösterim.
*   **Shopping (Tamamlandı)**: Pratik eklenebilir alışveriş listesi.
*   **Books/Movies (Tamamlandı)**: Medya kayıtlarının ve son izlenenlerin arşivlenmesi.
*   **Tools (Tamamlandı)**: Sağlık, performans ve beslenme kategorilerinde `CalculatorEngine` mimarisiyle çalışan toplam 14 hesaplayıcıyı barındırır. Canlı arama (filtreleme) özelliği aktiftir. Hesaplamalarda Profil'deki "Fiziksel Bilgiler" form verileri (boy, kilo vb.) otomatik kullanılır; elde edilen değerler "Sağlık Özeti" kartında görselleştirilir.

## 4. VERİ MODELİ
Veriler, Firestore (NoSQL) yapısında her kullanıcıya ait alt koleksiyonlar şeklinde yapılandırılmıştır:
*   `users/{uid}/profile/data`: Kullanıcının profil ve detaylı fiziksel bilgileri (boy, kilo, cinsiyet, aktivite_seviyesi, hedef, boyun, bel, kalça, bilek, dinlenik_nabız vb.).
*   `users/{uid}/workouts`: Kaydedilmiş antrenman split'leri (planları).
*   `users/{uid}/workoutLogs`: Tamamlanmış antrenman seanslarının tarihsel kayıtları.
*   `users/{uid}/water`: Günlük su kayıtları.
*   `users/{uid}/calories` & `users/{uid}/foods`: Günlük alınan kaloriler ve kullanıcıya özel yemek arşivi.
*   `users/{uid}/finance`: Gider ve gelir işlemleri.
*   `users/{uid}/shopping`: Alışveriş listesi kalemleri.

## 5. TASARIM KARARLARI VE KISITLAR
*   **Mobil Odaklılık (Katı Kısıt)**: Masaüstü (responsive) deneyimi desteklenmez. Arayüz "max-w-[420px]" şeklinde mobil cihaz simülasyonu içinde ortalanır.
*   **Neumorphism Stili**: Tasarımda Tailwind'in kendi gölgeleri yerine custom "box-shadow" yapıları (`neo-surface`, `neo-inset`) kullanılır. Tasarım bütünlüğü esastır ve dışına çıkılamaz.
*   **Sanal Tuş Eksikliği**: İşletim sistemi native hissiyatı (swipe to go back) için arayüz içi "Geri" okları özellikle kaldırılmıştır. Navigation History API ile yürütülür.
*   **Loading UX**: "0" verilerinin yanıltıcı görünmesini engellemek için yükleme anlarında iskelet yükleyici (`...` vs.) tercih edilmiştir.

## 6. BİLİNEN SORUNLAR / YARIM KALANLAR
*   **Aktif Bug**: Sistem genelinde çalışmayı engelleyen (blocking) kritik bir sorun tespit edilmemiştir. Su takibi widget'ı metin formatı hatası, hesaplayıcı (calculator) UI bozulmaları, widget sıralamalarındaki flash sorunları ve veri doğrulama (edge case limit) eksiklikleri başarıyla çözüldü.

## 7. SON DURUM
*   **Tamamlanan En Son Geliştirme**: Profil modülünde "Fiziksel Bilgiler" formu ve "Sağlık Özeti" panosu eklendi. `CalculatorEngine` tabanlı 14 farklı hesaplama aracını içeren Tools sayfası kullanıma sunuldu. Ana sayfa widget grupları için SortableJS tabanlı, uzun basarak (500ms) sürükle-bırak sıralama özelliği (Faz 1-4) entegre edildi.
*   **Olası Sonraki Adımlar**: Performans odaklı Firestore okuma-yazma kotalarının düşürülmesi ve aktif antrenman seans yönetiminin test edilip cilalanması.

## 8. TERCİHLER / ÇALIŞMA TARZI NOTLARI
*   **Otonom Çalışma**: Kullanıcının verdiği görevler onay ve izin istenmeden direkt uygulanır (bu talimatta istendiği üzere).
*   **Refactor/Güvenlik Pratiği**: Kod yapısında veya mimarisinde büyük değişikliğe gidilmeden önce `cleanup: checkpoint before cleanup` commit mesajı ile mevcut durumu proaktif olarak Git'e kaydetmek zorunludur.
*   **Tasarım Kuralları**: Tasarım (padding, margin, shadow, colors) yapısı kesinlikle değiştirilemez. Yeni eklemeler sadece mevcudun kopyalanıp adapte edilmesiyle yapılır.
