# PROJECT_CONTEXT

1. **DOSYA YAPISI**
   - `index.html`: Uygulamanın ana iskeleti, Tailwind konfigürasyonu ve DOM şablonları.
   - `app.js`: Ana kontrolcü, auth durumu yönetimi ve sekme/modül geçişlerini koordine eden dosya.
   - `style.css`: Özel animasyonlar, gizli scrollbar ayarları ve genel UI stilleri.
   - `firebase-config.js`: Firebase bağlantı ve başlatma ayarları.
   - `api-config.js`: Dış servis (CollectAPI) anahtarları.
   - `utils.js`: Tarih formatlama, DOM güvenliği vb. yardımcı fonksiyonlar.
   - `listenerManager.js`: Firebase dinleyicilerini (onSnapshot) merkezi yöneten ve temizleyen araç.
   - `auth.js`: Giriş ekranı ve kimlik doğrulama işlemleri.
   - `dashboard.js`: Ana özet ekranının yönetimi.
   - `books.js`, `calories.js`, `finance.js`, `movies.js`, `shopping.js`, `water.js`, `workout.js`, `history.js`, `profile.js`: İlgili özelliklerin UI ve veritabanı işlemlerini yürüten ayrık modül dosyaları.
   - `firestore.rules`: Veritabanı okuma/yazma güvenlik izinleri.

2. **TEKNOLOJİ YIĞINI**
   - **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3.
   - **Framework/Kütüphaneler**: Tailwind CSS (CDN üzerinden), Sortable.js (sürükle-bırak için), Material Symbols.
   - **Backend / Veritabanı**: Firebase v10 CDN (Authentication, Firestore, Storage).
   - **Harici API**: CollectAPI (Finans modülünde kur/metal verisi için kullanılıyor olabilir).
   - **Build/Deploy**: Herhangi bir build aracı (Vite, Webpack vb.) kullanılmıyor. Doğrudan `main` branch üzerinden GitHub Pages ile manuel barındırılıyor.

3. **MODÜL / ÖZELLİK ENVANTERİ**
   - **Dashboard**: Diğer modüllerden verileri çekip ana sayfada gösterir. (Tamamlandı)
   - **Auth**: E-posta/Şifre veya anonim giriş sağlar. (Tamamlandı)
   - **Books**: Okunan/okunacak kitaplar ve sayfa okuma logları. (Tamamlandı)
   - **Calories**: Hedef kalori takibi, besin kütüphanesi ve öğün logları. (Tamamlandı)
   - **Finance**: Gelir/Gider işlemleri, kategoriler, ödeme yöntemleri ve bakiye hesabı. (Tamamlandı)
   - **Shopping**: Alışveriş listesi yönetimi (ekle/çiz/sil). (Tamamlandı)
   - **Water**: Günlük hedefli su tüketim takibi. (Tamamlandı)
   - **Workout**: Antrenman programları (splits) ve idman geçmişi. (Tamamlandı)
   - **Movies**: Film izleme listesi. (Tamamlandı)
   - **History**: Diğer modüllerdeki son aktivitelerin ortak listesi. (Tamamlandı)

4. **VERİ MODELİ**
   - Tüm veriler Firestore'da izolasyon için `users/{userId}` path'i altında tutuluyor.
   - **Koleksiyonlar**:
     - `finance_categories`, `finance_payment_methods`, `finance_transactions` (Finans)
     - `calorieLogs`, `foodLibrary` (Kalori)
     - `shoppingList` (Alışveriş)
     - `waterLogs` (Su)
     - `books`, `book_logs` (Kitap)
     - `splits`, `workout_logs` (Spor)
     - `movies` (Sinema)
   - **Dokümanlar**: Global ayarlar `users/{userId}/settings/` altında doküman olarak tutulur (Örn: `settings/calories`, `settings/water`).

5. **TASARIM KARARLARI VE KISITLAR**
   - **Tasarım Sistemi**: `index.html` içinde Tailwind Play CDN ile yapılandırılmış; Ana renkler (`#7EA18D`, `#A4784A`), Inter fontu, Dark mode desteği ve yuvarlatılmış (card) tasarımlar tercih edilmiş.
   - **Vanilla JS & Firebase CDN Kullanımı**: Build süreci ile uğraşmadan "tak-çalıştır" şeklinde, herhangi bir statik sunucuda veya GitHub Pages'te hemen çalışması için seçilmiş.
   - **Listener Yönetimi**: Modüler yapıda bellek sızıntısını ve yetki hatalarını (özellikle logout anında) önlemek için merkezi bir `listenerManager.js` kurulmuş.
   - **Kısıtlar**: Tailwind Play CDN kullanımı development amaçlıdır, production için ağırdır ancak kişisel/minimal proje scope'u nedeniyle bilinçli olarak bırakılmış.

6. **BİLİNEN SORUNLAR / YARIM KALANLAR**
   - Teknik Borç: Uygulamanın büyüklüğüne rağmen state management'ın global değişkenler ve event listener'lar ile manuel yapılıyor olması. Tailwind'in tarayıcıda derlenmesi (CDN üzerinden).
   - Yarım Kalan / Planlanan: Finans işlemleri için grafik/pasta dilimi görünümü, notlarda arama/filtreleme, görevlere kategori ekleme ve anlık bildirim sistemi projede henüz tam uygulanmamış (README'de "sonraki adımlar" olarak listeli).

7. **SON DURUM**
   - Projenin temel yaşam takip modüllerinin (finans, kalori, su, antrenman, kitap, alışveriş) hepsi aktif olarak yazılmış ve birleştirilmiş.
   - Kullanılabilir, stabil bir SPA (Single Page Application) versiyonuna ulaşılmış.
   - Sonraki potansiyel adımlar, mevcut verilerin analiz edilip grafikleştirilmesi (Chart.js entegrasyonu).

8. **TERCİHLER / ÇALIŞMA TARZI NOTLARI**
   - Gereksiz dolgu metinleri ve uzatılmış açıklamalardan kaçınılmalı.
   - Kararlar rasyonel temellere (neden/sonuç) oturtularak, doğrudan amaca yönelik kısa cevaplarla ve kod/dosya odaklı ilerlenmeli.
