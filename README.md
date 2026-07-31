# Hayat Defteri

Görev listesi, notlar ve finans takibini tek yerde toplayan, GitHub Pages üzerinde ücretsiz barındırılan, Firebase ile giriş sistemi ve veri saklama içeren kişisel web uygulaması.

## Kurulum adımları

### 1. Firebase projesi oluştur

1. [console.firebase.google.com](https://console.firebase.google.com) adresine git, Google hesabınla giriş yap.
2. **Add project** ile yeni bir proje oluştur (örn. `hayat-defteri`). Google Analytics'i kapatabilirsin, gerekmiyor.
3. Proje açıldıktan sonra sol üstteki **⚙ Project settings > General** sekmesine git.
4. **Your apps** bölümünde `</>` (Web) simgesine tıkla, uygulamana bir isim ver (örn. "hayat-defteri-web") ve kaydet.
5. Karşına çıkan `firebaseConfig` nesnesini kopyala.

### 2. Authentication'ı etkinleştir

1. Sol menüden **Build > Authentication**'a git.
2. **Get started** > **Sign-in method** sekmesi.
3. **Email/Password**'ü seç ve etkinleştir.

### 3. Firestore veritabanını oluştur

1. Sol menüden **Build > Firestore Database**.
2. **Create database** > *production mode* seç > sana en yakın bölgeyi (örn. `eur3` — Avrupa) seç.
3. **Rules** sekmesine git, aşağıdaki kuralları yapıştır ve **Publish**'e bas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Bu kural, her kullanıcının **sadece kendi verisini** okuyup yazabilmesini sağlar.

### 4. Config'i projeye yapıştır

`firebase-config.js` dosyasını aç, 2. adımda kopyaladığın bilgileri `BURAYA_...` yazan yerlere yapıştır.

### 5. GitHub'a yükle ve Pages'i aç

```bash
# Bu klasörde bir git reposu başlat
git init
git add .
git commit -m "İlk sürüm: Hayat Defteri"

# GitHub'da yeni bir repo oluştur (github.com/new), sonra:
git remote add origin https://github.com/KULLANICI_ADIN/hayat-defteri.git
git branch -M main
git push -u origin main
```

Sonra GitHub'da reponun **Settings > Pages** sekmesine git:
- **Source**: "Deploy from a branch"
- **Branch**: `main` / `root`
- **Save**

Birkaç dakika içinde siten şu adreste yayına girer:
`https://KULLANICI_ADIN.github.io/hayat-defteri/`

### 6. (Opsiyonel) Kendi domain'ini bağla

Domain aldıktan sonra (İnetmar, Natro vb.) DNS ayarlarına GitHub'ın verdiği A/CNAME kayıtlarını ekleyip, repo **Settings > Pages > Custom domain** kısmına domain'ini yazman yeterli.

## Yerelde test etmek

Tarayıcı güvenlik kısıtlamaları nedeniyle `index.html`'i doğrudan çift tıklayarak açmak modül importlarını engeller. Basit bir yerel sunucu ile aç:

```bash
# Python varsa
python3 -m http.server 8000
# sonra tarayıcıda: http://localhost:8000
```

## Sonraki adımlar / geliştirme fikirleri

- Görevlere kategori/etiket ekleme
- Finans için aylık grafik (Chart.js ile kolayca eklenir)
- Notlara arama/filtreleme
- Karanlık mod
- Görev hatırlatma bildirimleri (Firebase Cloud Messaging ile)

## Maliyet

- **GitHub Pages**: Ücretsiz
- **Firebase**: Spark (ücretsiz) planı bu ölçekte fazlasıyla yeterli — günlük 50.000 okuma / 20.000 yazma limiti var, kişisel kullanım için sorun olmaz.
- **Domain (opsiyonel)**: Yıllık ~150-500 TL
