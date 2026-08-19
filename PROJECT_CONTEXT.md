# PROJECT_CONTEXT

## 1. DOSYA YAPISI
- **index.html**: SPA (Single Page Application) yapısını, tüm view kapsayıcılarını ve modal şablonlarını içeren ana DOM.
- **app.js**: Uygulamanın giriş noktası (entry-point). Diğer modülleri import eder, sekme (tab) geçişlerini ve Firebase auth oturum kontrollerini yönetir.
- **firebase-config.js**: Firebase (Auth, Firestore, Storage) başlatma ve offline persistence (çoklu sekme desteğiyle) ayarları.
- **auth.js**: E-posta/Şifre ve Anonim (Misafir) giriş/çıkış UI ve işlemlerini yönetir.
- **workout.js & activeSession.js**: Vücut geliştirme/spor antrenman programı (split), favori egzersizler, hareket haritası ve canlı antrenman set/tekrar/ağırlık takibi.
- **finance.js**: Gelir-gider işlemleri, cüzdan bakiyeleri, kategoriler ve ödeme yöntemleri yönetimi.
- **calories.js & water.js**: Günlük kalori (makro) ve su tüketimi hedefleri, kayıt ekleme ve takibi.
- **books.js & movies.js**: Kitap okuma listesi (durum, sayfa takibi) ve film/dizi izleme listeleri işlemleri (CRUD).
- **shopping.js**: Alınacaklar/Alışveriş listesi yönetimi.
- **profile.js**: Kullanıcı profil (isim vb.) güncellemeleri.
- **history.js**: Firestore'daki kalori, su, finans, kitap gibi geçmiş verilerin güne (YYYY-MM-DD) göre gruplanmış özetini sunar.
- **dashboard.js**: Tüm modüllerin özet (summary) verilerini ana ekranda birleştirerek sunar.
- **utils.js & listenerManager.js**: Ortak DOM/Tarih yardımcı fonksiyonları ve global olay dinleyicisi (event listener) yönetimi.
- **style.css**: Tailwind harici spesifik UI stilleri (scrollbar, animasyon, progress-ring vb.).
- **Python Scriptleri**: Geliştirme sürecinde DOM, modal ve div eşleşme hatalarını taramak/düzeltmek için kullanılan statik analiz araçları.

## 2. TEKNOLOJİ YIĞINI
- **Frontend**: Vanilla JavaScript (ES6 Modules) ve HTML5.
- **Stil / Tasarım**: CDN üzerinden TailwindCSS (plugins: `forms`, `container-queries`). Tamamen **mobil öncelikli** (mobile-first). Material Design 3 tabanlı özel renk paleti (`tailwind-config`).
- **Veritabanı & Auth**: Firebase v10 SDK (Auth, Firestore, Storage). Firestore'da çevrimdışı önbellekleme (offline persistence) aktif.
- **Grafik / Kütüphaneler**: SortableJS (sürükle-bırak listeler), Chart.js (grafikler), Panzoom (harita/görsel yakınlaştırma).
- **Build / Deploy**: Node.js veya Webpack gibi bir build aracı **yoktur**. ES6 modülleri CDN ve `<script type="module">` ile doğrudan tarayıcıda çalışır. Önbellek (cache) kırma işlemi URL parametreleriyle (ör: `?v=14`) manuel yapılır.

## 3. MODÜL / ÖZELLİK ENVANTERİ
- **Auth (Tamamlandı)**: Login, anonim giriş, session yönetimi.
- **Dashboard (Tamamlandı)**: Diğer tüm modüllerden veri çekip günlük özeti ekrana yansıtır.
- **Workout (Tamamlandı)**: Split > Gün > Egzersiz hiyerarşisi. Aktif antrenman canlı takibi ve geçmiş logları.
- **Finance (Kısmen Tamamlandı)**: İşlem ekleme, silme ve bakiye. Bazı elementler/modüller hala `.onclick` atamaları içeriyor.
- **Calories & Water (Kısmen Tamamlandı)**: Hedef belirleme, porsiyon veya serbest giriş. Temel listeleme aktif ancak DOM event'lerinde `onclick` kullanımı yaygın.
- **Books & Movies (Kısmen Tamamlandı)**: Liste ve CRUD işlemleri çalışıyor.
- **Shopping (Tamamlandı)**: Alışveriş listesi aktif.
- **History (Tamamlandı)**: Tüm modüllerden toplanan güncel verilerin zamana göre gruplanması.
- **Profile (Tamamlandı)**: Temel kullanıcı bilgisi güncellemeleri.

## 4. VERİ MODELİ
- Tüm kullanıcı verileri Firestore'da güvenlik kuralları gereği (user.uid) hiyerarşisiyle tutulur (ör. `users/{uid}/...`).
- **workout_templates**: Kullanıcıya özel antrenman şablonları.
- **workout_logs**: Tamamlanan veya devam eden (`status: "in_progress"`) antrenman seansları.
- **finance_transactions, finance_categories, finance_payment_methods**: Finansal işlemler ve tanımlamalar.
- **book_logs, movies**: İzleme ve okuma listeleri kayıtları.
- **calorieLogs, waterLogs**: Günlük olarak tutulan makro ve su kayıtları.
- **LocalStorage**: Cihaz bazlı oturum ve UI tercihleri (ör. `uid`, son açılan sekmeler).

## 5. TASARIM KARARLARI VE KISITLAR
- **Mobil Konteyner Zorunluluğu**: Masaüstünde de bir telefon gibi görünmesi amaçlanmıştır. Her şey `<div id="app-container" class="max-w-[420px] ...">` ve `#app-screen` içinde olmalıdır. Dışına taşan elementler görünümü (layout) bozar.
- **Event Delegation (data-action) Tercihi**: ES Modüllerinin global function tanımlayamaması sebebiyle (html içinden `onclick="foo()"` çağrılamaz), elementlere `data-action="..."` atayıp global/tepe seviyesindeki bir event listener ile tıklamaların yönetilmesi kararlaştırılmıştır.
- **Modüler ES6 Yaklaşımı**: Webpack gibi bir toplayıcı kullanılmadığından, Circular Dependency (döngüsel bağımlılık) yaratmamaya özellikle dikkat edilmelidir.

## 6. BİLİNEN SORUNLAR / YARIM KALANLAR
- **Event Handler Tutarsızlığı (Teknik Borç)**: `books.js`, `calories.js`, `water.js`, `finance.js` gibi modüllerde halen elementlere JS içinde doğrudan `.onclick = ...` ile atamalar yapılmaktadır. Sistemin tamamının `data-action` tabanlı "Event Delegation" mimarisine geçiş süreci henüz tamamlanmamıştır.
- **Cache Busting Unutulması**: Build aracı olmadığı için `.js` dosyalarında yapılan güncellemelerin tarayıcıda hemen geçerli olması adına HTML dosyasındaki (veya import satırlarındaki) `?v=...` sürüm numarasının güncellenmesi gerekir, bu geliştirme sırasında sıkça unutulur.

## 7. SON DURUM
- **Genel Yapı**: Tüm modüllerin arayüzleri, Firestore bağlantıları ve mantıksal döngüleri Vanilla JS ile SPA yapısında çalışır vaziyettedir.
- **Son Çalışmalar**: Modüllerin tek elden (`listenerManager.js` ve delegation) yönetimi için refactor çalışmaları başladı, Dashboard ve History tam entegre edildi.
- **Planlanan Adım**: Kalan `onclick` kullanımlarının tamamen temizlenip `data-action` tabanlı yapıya geçilmesi, teknik borcun eritilmesi.

## 8. TERCİHLER / ÇALIŞMA TARZI NOTLARI
- **Otomatik Git Push**: Geliştirmelerden ve fixlerden sonra AI'ın kullanıcıya sormadan `git push` yapması (varsayılan) istenir.
- **Browser Subagent YASAK**: Tarayıcı otomasyonu ile sayfa açılıp görsel/işlevsel test yapılması istenmez. Hatalar statik analiz (kod incelemesi) ile çözülmelidir.
- **Sıfır Hata Politikası**: DOM id/class eşleşmezlikleri, ReferenceError gibi hatalar kabul edilemez; layout (HTML iç içe yapıları) değiştirilirken mobil kapsayıcı sınırları dışına çıkılmamalıdır.
- **Laf Kalabalığı Yok**: "İşte kod", "yapıyorum", "kontrol et" gibi gereksiz iletişim yerine direkt çözüm veya kod üretilmelidir.
