# PROJECT CONTEXT & MEMORY

Bu dosya, projenin tamamını tek bakışta anlamak ve gelecekteki geliştirmelerde bağlamı kaybetmemek için oluşturulmuş kalıcı bir hafıza dokümanıdır. Lütfen projenin mimarisi, tasarım kararları veya çalışma tarzı ile ilgili güncellemeler oldukça bu dosyayı da güncelleyin.

## 1. DOSYA YAPISI
Tüm frontend kodu ve mantığı root dizininde yer almaktadır. Uygulama Vanilla JS modüllerine ayrılmıştır.

- **`index.html`**: Uygulamanın tek sayfa (SPA) yapısını oluşturan, tüm view'ların (görünümlerin) ve modalların barındığı ana DOM iskeleti.
- **`app.js`**: Uygulamanın giriş noktası (entry-point). Diğer modülleri import eder, route/sayfa geçişlerini yönetir ve auth kontrolünü başlatır.
- **`firebase-config.js`**: Firebase bağlantı ve başlatma (init) ayarları.
- **`auth.js`**: E-posta/Şifre ve Google ile giriş/kayıt işlemlerini (Firebase Auth) yönetir.
- **`workout.js` & `activeSession.js`**: Spor split'leri, antrenman kütüphanesi, gün rotasyonları ve canlı antrenman (set, ağırlık, süre) takibi mantığı.
- **`finance.js`**: Gelir-gider yönetimi, Chart.js grafik çizimi, işlemler listesi.
- **`calories.js` & `water.js`**: Günlük kalori ve su takibi özellikleri.
- **`books.js` & `movies.js`**: Okuma ve izleme listesi (CRUD) işlemleri.
- **`shopping.js`**: Alışveriş listesi özellikleri.
- **`profile.js` & `history.js`**: Kullanıcı profili ve genel geçmiş takibi.
- **`dashboard.js`**: Diğer tüm modüllerden özet verileri toplayıp ana ekranda (Özet) gösteren merkez modül.
- **`utils.js` & `listenerManager.js`**: Ortak yardımcı fonksiyonlar ve event yönetimi araçları.
- **`style.css`**: Tailwind ile yönetilemeyen spesifik ve küçük UI override'ları.
- **Scratch / Python Dosyaları** (`fix_divs.py`, `find_unmatched_div.py` vb.): Geliştirme aşamasında DOM hatalarını bulmak için kullanılmış tek seferlik araçlar, projenin canlı haline ait değiller.

## 2. TEKNOLOJİ YIĞINI
- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5.
- **Stil & Tasarım**: CDN üzerinden dahil edilen **TailwindCSS** (Kullanılan pluginler: `forms`, `container-queries`). Tasarım tamamen mobil öncelikli.
- **Veritabanı & Auth**: **Firebase** (Sürüm 10.14.1) Firestore ve Firebase Authentication.
- **Grafikler**: Chart.js (CDN).
- **Build & Deploy**: Node.js tabanlı bir build aracı (Webpack, Vite vb.) **kullanılmıyor**. Modüller CDN ve tarayıcı içi ES Modules (`type="module"`) ile çalışıyor. Cache busting manuel olarak URL parametreleriyle yapılıyor (`?v=102` gibi).

## 3. MODÜL / ÖZELLİK ENVANTERİ
- **Auth (Tamamlandı)**: Kullanıcı girişi, kayıt. State: `window.currentUid` ve Firebase onAuthStateChanged üzerinden.
- **Dashboard (Tamamlandı)**: Modüllerden toplanan verileri (su, bütçe, spor) birleştirip gösterir.
- **Workout (Tamamlandı)**: Split (Push/Pull/Legs) oluşturma, gün içindeki egzersizlerin `localStorage` favori sistemi, Firestore üzerinden aktif canlı antrenman kaydı (timer, setler, ağırlık). Yakın zamanda global objelerden `data-action` tabanlı event delegation yapısına taşındı.
- **Finance (Tamamlandı)**: Gelir, Gider ekleme, Firestore üzerinde bakiye tutma ve ay sonu grafiği.
- **Kitap & Film (Kısmen Tamamlandı)**: Ekleme/Silme/Okundu işaretleme. State Firestore üzerinde diziler veya sub-collection olarak tutuluyor.
- **Kalori & Su (Kısmen Tamamlandı / Çalışıyor)**: Günlük kalori kotası ve bardak/su takibi.

## 4. VERİ MODELİ
Veri yapısı Firebase Firestore üzerinde kullanıcıya (`uid`) bağımlı olarak kurgulanmıştır.
- `users/{uid}`: Kullanıcının temel ayarları ve dashboard metrikleri.
- `users/{uid}/workout_logs`: Aktif ve bitmiş antrenman seansları. İçerisinde `status: "in_progress"` veya `"completed"` state'leri bulunur.
- `users/{uid}/workout_templates`: Kullanıcının oluşturduğu split ve gün şemaları.
- `users/{uid}/transactions`: Finance modülü gelir/gider listesi. Her kayıt `amount`, `type`, `date` vb. içerir.
- **Yerel Depolama (LocalStorage)**: Örneğin egzersiz favori sistemi (`miz_fav_exercises_{uid}`) cihazın kendi hafızasında tutulur.

## 5. TASARIM KARARLARI VE KISITLAR
- **Mobil Görünüm (Kısıtlayıcı Konteyner)**: Tasarım masaüstünde de bir telefon gibi görünmek zorundadır. Bu sebeple tüm uygulama `<div id="app-container" class="max-w-[420px] mx-auto ...">` içerisine hapsedilmiştir. **DİKKAT:** Eklenen tüm yeni görünümler (`view`) ve sayfalar `#app-screen` isimli DOM elementinin **içinde** yer almak zorundadır. Dışına taşan section'lar masaüstünde sayfa düzenini yıkar, sağa sola kayar veya 100vh aşağıya itilerek boş ekran gösterir.
- **Event Delegation (data-action)**: ES Modülleri kullandığımız için fonksiyonlar otomatik olarak `window` (global) objesine geçmez. Bu sebeple `onclick="function()"` kullanmak yerine butonlara `data-action="functionName"` verilir ve her modül `document.addEventListener('click', ...)` ile bu action'ları yakalar.
- **Modülerlik**: Build tool olmadığı için modül içi importlar dosya ismine `.js?v=XX` eklenerek yapılır.

## 6. BİLİNEN SORUNLAR / YARIM KALANLAR
- **Modül Refactor İhtiyacı**: `workout.js` ve `activeSession.js` tamamen `data-action` mantığına geçirildi ve düzeltildi. Ancak `finance.js`, `books.js`, `movies.js` gibi modüller `index.html` üzerinde hala inline `onclick` çağrıları taşıyor olabilir. Eğer bu modüllerde butona tıklandığında hata (ReferenceError) alınırsa, sebep `onclick` kullanımlarıdır; `data-action` sistemine dönüştürülmelidirler.
- **Cache Busting**: Versiyon parametreleri (`?v=102`) manuel artırıldığı için kod değişiklikleri tarayıcıda hemen yansımayabilir.
- **E1RM Formülü (Workout)**: `activeSession.js` içindeki e1rm (Estimated 1 Rep Max) hesaplamaları daha kompleks formüllere (Brzycki vb.) güncellenmek üzere basit tutulmuştur.

## 7. SON DURUM
- **En Son Yapılanlar**: DOM yapısındaki `#app-container` ve `#app-screen` hataları (split ve antrenman sayfasının dışarıda kaldığı için boş açılması durumu) düzeltildi. `activeSession.js` içerisindeki `_sessionDoc` ReferenceError hatası onarıldı. Aktif seanstaki geri dönüş butonu `data-action` yapısına taşındı.
- **Bir Sonraki Adım**: Diğer modüllerin (finans, kitap, film) inline `onclick` sistemlerinin `data-action` yapısına taşınması ve modül bağımsızlıklarının test edilmesi önerilir.

## 8. TERCİHLER / ÇALIŞMA TARZI NOTLARI
- **Push İzni**: Kullanıcı geliştirmelerin bitiminde **asla** push izni sorulmasını istemiyor. Düzeltmeler tamamlandıktan sonra `git commit` ve `git push` komutları AI tarafından proaktif ve otomatik olarak çalıştırılmalıdır.
- **Tarayıcı (Browser) Kullanımı YASAK**: Kullanıcı, browser subagent'ının açılıp sisteminde testler (veya navigasyon) yapmasını kesinlikle **istememektedir**. Debug işlemleri statik kod analizi ve statik çıkarım ile yapılmalıdır.
- **Hatasız İlerleyiş**: Kullanıcı hatalara karşı çok toleranssız ("çalışan şeyi bozdun", "hata istemiyorum"). Değişiklikler (özellikle DOM manipülasyonu) çok dikkatli yapılmalı ve side-effect'ler (örneğin layout kırılması) her zaman göz önünde bulundurulmalıdır.
