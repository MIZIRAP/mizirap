# MIZIRAP

Antrenman, kalori, su, finans, kitap/film ve alışveriş takibini tek
çatı altında toplayan kişisel bir yaşam/sağlık uygulaması. Vanilla
JavaScript ile geliştirilmiş, Firebase üzerinde çalışan ve GitHub
Pages'te barındırılan bir PWA (Progressive Web App).

## Özellikler

- **Dashboard**: Tüm modüllerin günlük özetini gösteren, widget'ları
  uzun basarak sürükle-bırak ile kişiselleştirilebilen ana ekran.
- **Workout**: Özel antrenman split'leri oluşturma, egzersiz
  kütüphanesinden seçim yapma ve canlı antrenman seansı takibi.
- **Calories**: Makro bazlı (protein/karbonhidrat/yağ) besin girişi ve
  günlük beslenme arşivi.
- **Water**: Günlük su tüketim hedefi ve takibi.
- **Finance**: Canlı döviz/altın kuru entegrasyonu ile gelir-gider ve
  bütçe takibi.
- **Shopping**: Basit alışveriş listesi yönetimi.
- **Books / Movies**: Okunan kitapların ve izlenen film/dizilerin
  arşivi.
- **Tools**: Sağlık, performans ve beslenme kategorilerinde 14
  hesaplayıcı içeren araç kütüphanesi; Profil'deki fiziksel bilgiler
  otomatik olarak hesaplamalarda kullanılır.
- **Profile**: Kullanıcı ayarları, hedefler ve fiziksel bilgiler.

## Teknoloji Yığını

- **Frontend**: HTML5, Vanilla JavaScript (ES6 modülleri), Tailwind CSS
  (önceden derlenmiş statik CSS — CDN kullanılmıyor)
- **Backend (BaaS)**: Firebase (Authentication, Firestore, Storage)
- **Harici API**: CollectAPI (finans modülü için döviz/altın kuru)
- **Barındırma**: GitHub Pages (statik site)
- **PWA**: manifest.json ve ikon setleriyle uygulama olarak
  yüklenebilir

## Tasarım İlkeleri

- **Mobil odaklı**: Masaüstü deneyimi desteklenmez, arayüz mobil cihaz
  simülasyonu içinde ortalanır.
- **Neumorphism**: Özel box-shadow yapılarıyla (`neo-surface`,
  `neo-inset`) oluşturulmuş yumuşak, gölgeli tasarım dili.
- **Native navigasyon hissi**: Arayüz içi "geri" okları kasıtlı olarak
  kullanılmaz; navigasyon History API ve swipe-to-go-back ile yürütülür.

## CSS Derleme Notu

Projeye yeni bir Tailwind class'ı eklediğinizde (HTML veya JS
dosyaları içerisine), CSS'in güncellenmesi gerekir. Bu projede Node.js
kullanılmadığı için Tailwind CLI bağımsız sürümü kullanılmaktadır:

1. build-css.bat dosyasına çift tıklayarak (veya terminalden) çalıştırın.
2. tailwind-build.css dosyasının yeniden üretildiğinden emin olun ve
   dosyayı GitHub'a commit'leyin.
