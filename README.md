# MIZIRAP

Antrenman, kalori, su, finans, kitap/film ve alışveriş takibini tek çatı altında toplayan kişisel bir yaşam/sağlık uygulaması. Vanilla JavaScript ile geliştirilmiş, Firebase üzerinde çalışan ve GitHub Pages'te barındırılan mobil öncelikli bir PWA (Progressive Web App)'tir. 

Aynı zamanda doğal dille istek alan (örn: "Bugün 500ml su içtim") ve profil bilgilerinize göre tavsiyeler verebilen, Gemini API destekli akıllı bir asistan içerir.

## Özellikler

- **Dashboard**: Tüm modüllerin günlük özetini gösteren, widget'ları uzun basarak (500ms) sürükle-bırak ile kişiselleştirilebilen ana ekran.
- **AI Asistan**: Gemini destekli akıllı asistan. Mesajlaşarak kalori, su, harcama ekleyebilir ve beslenme koçluğu tavsiyeleri alabilirsiniz.
- **Workout**: Özel antrenman split'leri oluşturma, egzersiz kütüphanesinden seçim yapma ve canlı antrenman seansı takibi.
- **Calories**: Makro bazlı (protein/karbonhidrat/yağ) besin girişi ve günlük beslenme arşivi.
- **Water**: Günlük su tüketim hedefi ve ilerleme çubuklu takip.
- **Finance**: Canlı döviz/altın kuru entegrasyonu ile gelir-gider takibi ve grafiksel sunum.
- **Shopping**: Basit ve hızlı alışveriş listesi yönetimi.
- **Books / Movies**: Okunan kitapların ve izlenen film/dizilerin arşivi.
- **Tools**: Sağlık, performans ve beslenme kategorilerinde 14 farklı araç barındıran hesaplayıcı kütüphanesi. (Fiziksel bilgiler profilden otomatik çekilir).
- **Profile**: Kullanıcı ayarları, kişisel hedefler ve AI yapılandırması (Gemini Key vb.).

## Teknoloji Yığını

- **Frontend**: HTML5, Vanilla JavaScript (ES6 modülleri), Tailwind CSS (Statik CLI Build)
- **CSS Stili**: Özel Neumorphism / Glassmorphism gölgelendirme
- **Backend (BaaS)**: Firebase v10 (Authentication, Firestore, Storage)
- **Yapay Zeka**: Gemini API (Flash Lite / Flash modelleri)
- **Harici API**: CollectAPI (Finans modülü)
- **Barındırma**: GitHub Pages

## Kurulum ve Çalıştırma

Proje Vanilla JS olduğu için Node.js bağımlılığı veya npm paketi içermez.
1. Projeyi bilgisayarınıza indirin.
2. Klasörü bir statik HTTP sunucusu ile açın (VS Code "Live Server" eklentisi önerilir).
3. Tarayıcıdan yerel adrese (örn: `http://127.0.0.1:5500`) giderek uygulamayı görüntüleyin.

## CSS Derleme Notu (Tailwind CLI)

Projeye yeni bir Tailwind utility class'ı eklediğinizde CSS'in yeniden derlenmesi gerekir.
1. Proje kök dizinindeki `build-css.bat` dosyasını çalıştırın (veya terminalden `tailwind3-cli.exe -i ./input.css -o ./tailwind-build.css --minify`).
2. Derlenen `tailwind-build.css` dosyasının güncellendiğinden emin olun.

## Klasör ve Dosya Yapısı

- `index.html`: Uygulamanın tek sayfa (SPA) iskeleti. Tüm görünümleri barındırır.
- `style.css` / `tailwind-build.css`: Neumorphism gölgelerinin ve Tailwind sınıflarının bulunduğu stil dosyaları.
- `app.js`: Yönlendirmeyi (History API) ve ana başlatıcı mantığı içeren denetleyici.
- `ai-chat.js`: Gemini AI asistan bağlantısı, iş mantığı ve araç çağrılarını yöneten modül.
- `dashboard.js`, `workout.js`, `finance.js` vb.: Her bir özelliğe karşılık gelen modüler iş mantığı (Business Logic) dosyaları.
- `assets/`: Statik resimler, ikonlar, harici betikler (muscle-map vb.).
- `api-config.js` / `firebase-config.js`: Üçüncü parti servis bağlantı ayarları.

## Yapılandırma ve Kullanım

* **Firebase:** Uygulamanın çalışması için geçerli bir Firebase projesi bilgileri `firebase-config.js` içerisine eklenmelidir.
* **Finans Kurları:** `api-config.js` içerisine geçerli bir CollectAPI anahtarı gereklidir.
* **Yapay Zeka (AI):** AI asistanın çalışması için uygulama içi "Profil -> Ayarlar" ekranından kişisel Gemini API anahtarınızı girmeniz gerekir. Anahtar tarayıcınızda ve hesabınızda güvenle saklanır.

## Geliştirici Katkı Notları

1. **Mobil Öncelikli Tasarım:** Bu projenin masaüstü sürümü yoktur. Geliştirmeleri mobil görünüm simülasyonu ile test edin.
2. **Native Geri Butonları:** Arayüzde özel "Geri" tuşları barındırılmaz. Cihazın kendi geri kaydırma (swipe-to-go-back) özellikleri kullanılarak History API destekli navigasyon yapılır.
3. **Araç Kısıtlamaları:** Proje içinde toplu değişiklik yaparken PowerShell betiklerinde karakter bozulması (mojibake) yaşanabildiğinden, UTF-8 kodlama yöntemlerine sadık kalın.