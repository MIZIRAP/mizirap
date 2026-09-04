## CSS Derleme Notu
Projeye yeni bir Tailwind class'ı eklediğinizde (HTML veya JS dosyaları içerisine), CSS'in güncellenmesi gerekir. Bu projede Node.js kullanılmadığı için Tailwind CLI bağımsız sürümü kullanılmaktadır:
1. uild-css.bat dosyasına çift tıklayarak (veya terminalden) çalıştırın.
2. 	ailwind-build.css dosyasının yeniden üretildiğinden emin olun ve dosyayı GitHub'a commitleyin.

# Hayat Defteri

GÃ¶rev listesi, notlar ve finans takibini tek yerde toplayan, GitHub Pages Ã¼zerinde Ã¼cretsiz barÄ±ndÄ±rÄ±lan, Firebase ile giriÅŸ sistemi ve veri saklama iÃ§eren kiÅŸisel web uygulamasÄ±.

## Kurulum adÄ±mlarÄ±

### 1. Firebase projesi oluÅŸtur

1. [console.firebase.google.com](https://console.firebase.google.com) adresine git, Google hesabÄ±nla giriÅŸ yap.
2. **Add project** ile yeni bir proje oluÅŸtur (Ã¶rn. `hayat-defteri`). Google Analytics'i kapatabilirsin, gerekmiyor.
3. Proje aÃ§Ä±ldÄ±ktan sonra sol Ã¼stteki **âš™ Project settings > General** sekmesine git.
4. **Your apps** bÃ¶lÃ¼mÃ¼nde `</>` (Web) simgesine tÄ±kla, uygulamana bir isim ver (Ã¶rn. "hayat-defteri-web") ve kaydet.
5. KarÅŸÄ±na Ã§Ä±kan `firebaseConfig` nesnesini kopyala.

### 2. Authentication'Ä± etkinleÅŸtir

1. Sol menÃ¼den **Build > Authentication**'a git.
2. **Get started** > **Sign-in method** sekmesi.
3. **Email/Password**'Ã¼ seÃ§ ve etkinleÅŸtir.

### 3. Firestore veritabanÄ±nÄ± oluÅŸtur

1. Sol menÃ¼den **Build > Firestore Database**.
2. **Create database** > *production mode* seÃ§ > sana en yakÄ±n bÃ¶lgeyi (Ã¶rn. `eur3` â€” Avrupa) seÃ§.
3. **Rules** sekmesine git, aÅŸaÄŸÄ±daki kurallarÄ± yapÄ±ÅŸtÄ±r ve **Publish**'e bas:

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

Bu kural, her kullanÄ±cÄ±nÄ±n **sadece kendi verisini** okuyup yazabilmesini saÄŸlar.

### 4. Config'i projeye yapÄ±ÅŸtÄ±r

`firebase-config.js` dosyasÄ±nÄ± aÃ§, 2. adÄ±mda kopyaladÄ±ÄŸÄ±n bilgileri `BURAYA_...` yazan yerlere yapÄ±ÅŸtÄ±r.

### 5. GitHub'a yÃ¼kle ve Pages'i aÃ§

```bash
# Bu klasÃ¶rde bir git reposu baÅŸlat
git init
git add .
git commit -m "Ä°lk sÃ¼rÃ¼m: Hayat Defteri"

# GitHub'da yeni bir repo oluÅŸtur (github.com/new), sonra:
git remote add origin https://github.com/KULLANICI_ADIN/hayat-defteri.git
git branch -M main
git push -u origin main
```

Sonra GitHub'da reponun **Settings > Pages** sekmesine git:
- **Source**: "Deploy from a branch"
- **Branch**: `main` / `root`
- **Save**

BirkaÃ§ dakika iÃ§inde siten ÅŸu adreste yayÄ±na girer:
`https://KULLANICI_ADIN.github.io/hayat-defteri/`

### 6. (Opsiyonel) Kendi domain'ini baÄŸla

Domain aldÄ±ktan sonra (Ä°netmar, Natro vb.) DNS ayarlarÄ±na GitHub'Ä±n verdiÄŸi A/CNAME kayÄ±tlarÄ±nÄ± ekleyip, repo **Settings > Pages > Custom domain** kÄ±smÄ±na domain'ini yazman yeterli.

## Yerelde test etmek

TarayÄ±cÄ± gÃ¼venlik kÄ±sÄ±tlamalarÄ± nedeniyle `index.html`'i doÄŸrudan Ã§ift tÄ±klayarak aÃ§mak modÃ¼l importlarÄ±nÄ± engeller. Basit bir yerel sunucu ile aÃ§:

```bash
# Python varsa
python3 -m http.server 8000
# sonra tarayÄ±cÄ±da: http://localhost:8000
```

## Sonraki adÄ±mlar / geliÅŸtirme fikirleri

- GÃ¶revlere kategori/etiket ekleme
- Finans iÃ§in aylÄ±k grafik (Chart.js ile kolayca eklenir)
- Notlara arama/filtreleme
- KaranlÄ±k mod
- GÃ¶rev hatÄ±rlatma bildirimleri (Firebase Cloud Messaging ile)

## Maliyet

- **GitHub Pages**: Ãœcretsiz
- **Firebase**: Spark (Ã¼cretsiz) planÄ± bu Ã¶lÃ§ekte fazlasÄ±yla yeterli â€” gÃ¼nlÃ¼k 50.000 okuma / 20.000 yazma limiti var, kiÅŸisel kullanÄ±m iÃ§in sorun olmaz.
- **Domain (opsiyonel)**: YÄ±llÄ±k ~150-500 TL
