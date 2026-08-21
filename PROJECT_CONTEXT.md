# PROJECT_CONTEXT.md — My Life Dashboard

> Proje hafızası. Sıfırdan başlayan birinin 5 dakikada tam resmi anlaması için.
> Son güncelleme: 2026-08-22

---

## 1. DOSYA YAPISI

```
mizirap/
├── index.html              # Tek HTML dosyası; tüm view'lar (21 adet) burada, hidden/show ile geçiş
├── app.js                  # SPA entry point: Firebase auth, modül init/clear, tab routing
├── firebase-config.js      # Firebase init (auth, db, storage) ve export
├── auth.js                 # Login/register/logout/Google Sign-In UI mantığı
├── listenerManager.js      # Firestore onSnapshot listener'larını merkezi kayıt/temizleme
├── utils.js                # Paylaşılan yardımcı fonksiyonlar (escapeHtml, formatDate, vb.)
│
├── workout.js              # Antrenman modülü (~3500 satır): split, egzersiz, core, esneme
├── activeSession.js        # Aktif antrenman seans oynatıcısı (ayrı modül, workout.js'ten çağrılır)
├── finance.js              # Finans: gelir/gider, kategoriler, ödeme yöntemleri, altın/gümüş
├── calories.js             # Kalori takibi: yemek kütüphanesi, günlük log, makro hesabı
├── water.js                # Su takibi: günlük log, hedef, istatistik
├── books.js                # Kitap takibi: okuma durumu, puanlama, log
├── movies.js               # Film/dizi takibi: izleme durumu, puanlama
├── shopping.js             # Alışveriş listesi
├── history.js              # Geçmiş antrenman logları
├── dashboard.js            # Dashboard widget'larını güncelleme fonksiyonları
├── profile.js              # Kullanıcı profil bilgileri
│
├── api-config.js           # CollectAPI anahtarı (altın/gümüş fiyatları)
├── firestore.rules         # Firestore güvenlik kuralları
├── manifest.json           # PWA manifest
├── style.css               # Minimal custom CSS (Tailwind üstüne ek)
├── icon-192.png            # PWA ikon
├── icon-512.png            # PWA ikon
│
└── assets/
    ├── exercises/          # Egzersiz görselleri (JPG) + muscle-map.js + SVG vücut haritaları
    └── stretches/          # Esneme hareketi görselleri (klasör/circle_150.png formatı)
```

---

## 2. TEKNOLOJİ YIĞINI

**Frontend**
- Saf HTML5 + Vanilla JavaScript (ES Modules, `import`/`export`)
- Tailwind CSS v3 — CDN üzerinden (`cdn.tailwindcss.com`), inline config ile tema override
- Font: **Plus Jakarta Sans** (Google Fonts)
- İkonlar: **Material Symbols Rounded** (Google CDN)

**CDN Kütüphaneler**
| Kütüphane | Kullanım |
|---|---|
| SortableJS | Split günü/egzersiz sıralaması (drag & drop) |
| Chart.js | Finans grafikleri |
| @panzoom/panzoom | Kas haritası SVG zoom/pan |

**Firebase (v10 CDN modular API)**
| Servis | Kullanım |
|---|---|
| Authentication | Email/şifre + Google Sign-In |
| Firestore | Tüm kullanıcı verisi (koleksiyon yapısı §4'te) |
| Storage | Tanımlanmış ama aktif kullanılmıyor (görseller base64 ile Firestore'a yazılıyor) |
| Offline persistence | `enableMultiTabIndexedDbPersistence` aktif |

**Harici API**
- **CollectAPI** — altın/gümüş güncel fiyatları; sonuç Firestore `/app/metalPricesCache`'e yazılır, 6 saatte bir yenilenir

**Deploy**
- GitHub repo: `https://github.com/MIZIRAP/mizirap.git` (main branch)
- Deploy yöntemi: Manuel / GitHub Pages — `index.html` root'ta, statik dosyalar direkt sunuluyor
- Build adımı yok
- PWA: `manifest.json` + `icon-192/512.png` ile home screen'e eklenebilir

---

## 3. MODÜL / ÖZELLİK ENVANTERİ

**Antrenman** — `workout.js` + `activeSession.js`
- Split tabanlı antrenman planı (split → gün → egzersiz); aktif seans oynatıcısı (set/ağırlık/tekrar/RPE, e1RM, zamanlayıcı)
- Veri: `splits/{splitId}/days/{dayId}/exercises`, `workout_logs`
- Durum: ✅ Tamamlandı

**Core Hareketleri** — `workout.js` içinde
- Core egzersiz kütüphanesi (Üst/Alt/Yan Karın, Bel/Sırt), core seansı, core player
- Varsayılan 18 hareket; ilk girişte `writeBatch` ile Firebase'e seed edilir
- Navigasyon: Antrenman → "Core Hareketleri ve Seanslar" → `view-core-library` → `view-core-player`
- Durum: ⚠️ Kısmen çalışıyor — Library UI tamam, navigasyon yeniden düzenlenecek

**Esneme** — `workout.js` içinde
- Esneme kütüphanesi (~50 varsayılan hareket), esneme seansı oluşturma, player (timer + görsel)
- Veri: `stretches`, `stretchSessions`; `hiddenDefaultStretches` localStorage'da
- Durum: ✅ Tamamlandı

**Finans** — `finance.js`
- Gelir/gider, kategoriler, ödeme yöntemleri, aylık grafik, altın/gümüş canlı fiyat
- Veri: `finance_transactions`, `finance_categories`, `finance_payment_methods`, `/app/metalPricesCache`
- Durum: ✅ Tamamlandı

**Kalori** — `calories.js`
- Yemek kütüphanesi, günlük kalori/makro logu, hedef takibi
- Veri: `foodLibrary`, `calorieLogs/{dateStr}`
- Durum: ✅ Tamamlandı

**Su** — `water.js`
- Günlük su tüketimi logu, hedef, istatistik
- Veri: `waterLogs/{dateStr}`
- Durum: ✅ Tamamlandı

**Kitap** — `books.js`
- Okuma durumu (okunuyor/okundu/bekliyor), puanlama, log
- Veri: `books`, `book_logs`
- Durum: ✅ Tamamlandı

**Film/Dizi** — `movies.js`
- İzleme durumu, puanlama
- Veri: `movies`
- Durum: ✅ Tamamlandı

**Alışveriş** — `shopping.js`
- Alışveriş listesi yönetimi
- Veri: `shoppingList`
- Durum: ✅ Tamamlandı

**Geçmiş** — `history.js`
- Geçmiş antrenman loglarını listele/filtrele
- Veri: `workout_logs`
- Durum: ✅ Tamamlandı

---

## 4. VERİ MODELİ

**Firestore Hiyerarşisi:**
```
users/{uid}/
  splits/{splitId}             { name, isActive, createdAt }
    days/{dayId}               { name, order }
      exercises/{exId}         { name, sets, muscleGroup, order, imageBase64?, isFav }
  workout_logs/{logId}         { splitId, dayId, dayName, startedAt, finishedAt, exercises:[{...sets}] }
  stretches/{stretchId}        { name, duration, imageBase64, isDefault }
  stretchSessions/{sessionId}  { name, movements:[{id,name,duration,imageBase64}], createdAt }
  cores/{coreId}               { name, duration, category, isDefault, imageBase64? }
  coreSessions/{sessionId}     { name, movements:[{id,name,duration}], createdAt }
  finance_transactions/{id}    { type, amount, category, paymentMethod, desc, date, createdAt }
  finance_categories/{id}      { name, icon, type }
  finance_payment_methods/{id} { name, icon }
  foodLibrary/{id}             { name, calories, protein, carb, fat, servingSize }
  calorieLogs/{dateStr}        { entries:[{foodId,name,amount,calories,...}], goal }
  waterLogs/{dateStr}          { entries:[{amount,time}], goal }
  books/{id}                   { title, author, status, rating, pages, coverBase64? }
  book_logs/{id}               { bookId, pagesRead, date }
  movies/{id}                  { title, year, status, rating, posterBase64? }
  shoppingList/{id}            { name, quantity, checked, category }

app/
  metalPricesCache             { gold, silver, updatedAt }
```

**localStorage anahtarları:**
- `uid` — aktif kullanıcı UID
- `hiddenDefaultStretches` — JSON array, gizlenen varsayılan esneme ID'leri
- `activeStretchSessionId` — aktif esneme seansı ID'si
- `activeCoreSessionId` — aktif core seansı ID'si

---

## 5. TASARIM KARARLARI VE KISITLAR

**Tasarım Sistemi (DOKUNULMAZLAR)**
- **Neomorfizm:** Ana tasarım dili. Arka plan `#F0F2F8`, gölge çifti `4-6px #D1D9E6` + `rgba(255,255,255,0.7)`. Bu ikili asla değiştirilmez.
- **Kart gölge standardı:** `box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255,255,255,0.7)` — inline style tercih edilir (Tailwind token'ı değil)
- **Renk Paleti:** Primary `#4648D4`, neon-purple `#A855F7`, neon-blue `#3B82F6`, neon-green `#22C55E`. Metin `#181C20`, muted `#464554`
- **Font:** Plus Jakarta Sans (400–700)
- **Border radius:** `32px` kart/modal, `rounded-full` buton/chip

**Mimari Kararlar**
- **Tek HTML (SPA):** Tüm view'lar `index.html`'de `hidden` toggle ile geçiş. Sebep: build adımı gerektirmeme, deploy basitliği.
- **Modül başına JS:** Her özellik `init(uid, cb)` + `clear()` export eder. Auth state change'de init/clear edilir.
- **Görseller base64 Firestore'da:** Firebase Storage yerine. Sebep: ayrı kural/URL yönetimi gerektirmeme. Risk: büyük base64 Firestore okuma maliyetini artırır.
- **registerListener() pattern:** Tüm `onSnapshot` listener'ları `listenerManager.js`'te kayıt altında; logout'ta `clearAllListeners()` ile temizlenir.
- **Tailwind CDN:** Build pipeline yok, kasıtlı; `cdn.tailwindcss.com production` uyarısı beklenen davranış.

**Scope Dışı**
- Push notification — planlanmadı
- Dark mode — `darkMode: "class"` tanımlı ama hiç aktif edilmedi
- Native mobil uygulama — PWA ile yetiniliyor

---

## 6. BİLİNEN SORUNLAR / YARIM KALANLAR

**Aktif Sorunlar**
- `workout.js` ~3500 satır — stretch + core + exercise kodu tek dosyada karışık; refactor önerilir
- Core Library → Core Player navigasyonu düzenlenmeli ("Seansa Başla" kaldırıldı, yerine ne koyulacağı açık)
- `assets/core/` tamamen silindi — core hareketleri görselsiz görünüyor (`imageBase64: null`)
- `triggerCoreImageUpload` action handler workout.js'te var ama `core-image-input` elementi HTML'de yok — null hatası üretebilir

**Teknik Borç**
- `.gitignore` yok — `node_modules/`, `.DS_Store` repo'ya giriyor
- `package.json` boş (`{}`) — node_modules gereksiz yere var
- Firebase API key `firebase-config.js`'te açık — public repo'da Security Rules ile korunuyor ama riskli
- `app.js?v=...` ve `workout.js?v=...` versiyonları hardcode — deploy'da güncellenmesi unutulabilir

**Yarım Kalanlar**
- Core detay popup'ında `#sheet-core-interactive-map` elementinin varlığı doğrulanmadı
- Core görsel upload sistemi — eski modal kaldırıldı, yeni bottom sheet'te görsel upload UI'ı eksik

---

## 7. SON DURUM

**En son çalışılan:** Core Hareketleri ve Seanslar özelliği (2026-08-22)
- "Core Çalışması" → "Core Hareketleri ve Seanslar" yeniden adlandırıldı
- `view-core-library` ve `add-core-bottom-sheet` oluşturuldu (Egzersiz Kütüphanesi tasarımının kopyası)
- 18 varsayılan core hareketi kategorileriyle tanımlandı; Firebase category migration scripti eklendi
- Proje genelinde büyük temizlik: 35+ junk dosya, duplicate asset klasörleri, puppeteer/acorn bağımlılıkları silindi

**Mevcut commit:** `928deda` (main branch)

**Önerilen sonraki adımlar:**
1. `#sheet-core-interactive-map` elementinin HTML'de varlığını kontrol et
2. Core Library → Core Player navigasyonunu düzenle
3. `.gitignore` ekle (`node_modules/`, `.DS_Store`)
4. `triggerCoreImageUpload` dead handler'ı veya eksik `core-image-input` elementini düzelt

---

## 8. TERCİHLER / ÇALIŞMA TARZI NOTLARI

- **Tam otonom mod aktif:** Karar ver → uygula → özetle. Onay beklemeden devam.
- **Güvenlik adımı:** Büyük silme/refactor'dan önce `git commit -m "cleanup: checkpoint before ..."` at.
- **Tasarım dokunulmazı:** Neomorfik gölge sistemi (`#D1D9E6` + `rgba(255,255,255,0.7)`) asla değiştirilmez.
- **Yeni UI bileşenleri:** Mevcut sayfaların tasarımını birebir klonla (referans: Egzersiz Kütüphanesi).
- **Riskli kararlar:** Büyük refactor veya iki yöne gidebilecek mimari kararlarda sor; küçük UI kararları kendin ver.
- **Push sıklığı:** Her tamamlanan özellik/fix sonrası otomatik push.
- **Dil:** Kullanıcı Türkçe, UI metinleri Türkçe, kod ve commit mesajları İngilizce.
- **Test:** `file:///` ile açıldığında JS modülleri CORS engeline takılır — gerçek test için HTTP sunucusu gerekir.
