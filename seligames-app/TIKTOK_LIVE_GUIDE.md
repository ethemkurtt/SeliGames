# TikTok Live Entegrasyonu - Kullanım Kılavuzu

## 🎯 Genel Bakış

SeliGames uygulamasına **Eulerstream API** kullanarak TikTok Live entegrasyonu eklendi. Artık gerçek zamanlı olarak TikTok canlı yayınlarından veri alabilirsiniz!

## 🚀 Nasıl Kullanılır?

### 1. Uygulamayı Başlatın
```bash
cd /Users/elegant/Desktop/test/seligames-app
npm start
```

### 2. Giriş Yapın
- Email ve şifrenizle giriş yapın
- (Demo için herhangi bir email/şifre kullanabilirsiniz)

### 3. TikTok Canlı Sayfasına Gidin
- Sol menüden **"TikTok Canlı"** sekmesine tıklayın

### 4. Bağlantıyı Kurun
- Input alanına TikTok kullanıcı adını girin
  - Örnek: `tv_asahi_news`
  - veya: `@tv_asahi_news`
  - veya tam URL: `https://www.tiktok.com/@tv_asahi_news/live`
- **"Bağlan"** butonuna tıklayın

### 5. Canlı Verileri İzleyin! 🎉
Uygulama otomatik olarak şunları gösterecek:
- 💬 **Yorumlar**: Kullanıcı yorumları
- 🎁 **Hediyeler**: Gönderilen hediyeler ve değerleri
- ❤️ **Beğeniler**: Like sayıları
- 👋 **Yeni Üyeler**: Yayına katılanlar
- ➕ **Takipçiler**: Yeni takip edenler
- 📊 **İzleyici Sayısı**: Anlık izleyici sayısı

## 🔧 Teknik Detaylar

### API Bilgileri
- **Servis**: Eulerstream WebSocket API
- **Endpoint**: `wss://ws.eulerstream.com`
- **API Key**: Güvenli şekilde renderer.js içinde saklanıyor
- **Protokol**: WebSocket (Gerçek zamanlı çift yönlü iletişim)

### Desteklenen Event'ler
```javascript
- chat        // Sohbet mesajları
- gift        // Hediyeler
- like        // Beğeniler
- member      // Yeni katılanlar
- follow      // Takip edenler
- share       // Paylaşımlar
- roomUser    // İzleyici istatistikleri
```

### Kod Yapısı
```
seligames-app/
├── index.html       # UI (TikTok Live sayfası)
├── renderer.js      # WebSocket logic (satır 436-700)
├── main.js          # Electron main process
└── preload.js       # IPC bridge
```

## 📊 Özellikler

✅ **Gerçek Zamanlı Bağlantı**: WebSocket üzerinden anlık veri akışı  
✅ **Otomatik Event İşleme**: Tüm TikTok event'leri otomatik parse edilir  
✅ **Canlı İstatistikler**: Yorum, hediye, beğeni sayaçları  
✅ **Event Feed**: Tüm olayların kronolojik listesi  
✅ **Kullanıcı Dostu**: Sadece kullanıcı adı gir, bağlan!  
✅ **Hata Yönetimi**: Bağlantı hataları kullanıcıya bildirilir  
✅ **Disconnect**: Tek tıkla bağlantıyı kes  

## 🎮 Mod Entegrasyonu

TikTok Live event'leri ile oyun modlarını entegre edebilirsiniz:

1. **Mods** sayfasından bir mod seçin
2. Hediye-Aksiyon eşleştirmesi yapın
3. TikTok Live'a bağlanın
4. İzleyiciler hediye gönderdiğinde otomatik aksiyonlar tetiklenecek!

Örnek eşleştirmeler:
- 🌹 Gül → Süper Zıplama
- 💎 Elmas → Para Ver ($10000)
- 🦁 Aslan → Rastgele Araç Spawn
- ❤️ Kalp → Ateş Mermileri (30sn)

## 🐛 Sorun Giderme

### Bağlantı Kurulamıyor
1. İnternet bağlantınızı kontrol edin
2. Kullanıcı adının doğru olduğundan emin olun
3. Kullanıcının **CANLI YAYINDA** olduğundan emin olun
4. Console'u açın (Ctrl+Shift+I) ve hata mesajlarını kontrol edin

### Event'ler Gelmiyor
1. Bağlantının aktif olduğunu kontrol edin (Yeşil nokta)
2. Yayının canlı olduğunu doğrulayın
3. Tarayıcı console'unu açıp WebSocket mesajlarını izleyin

### API Key Hatası
API key renderer.js dosyasında hardcoded olarak bulunuyor. Gerekirse güncellenebilir.

## 📝 Geliştirme Notları

### WebSocket Bağlantı Akışı
```
1. Kullanıcı "Bağlan" tıklar
2. Username parse edilir
3. WebSocket bağlantısı oluşturulur
4. onopen → Bağlantı başarılı UI update
5. onmessage → Event'ler parse edilir ve gösterilir
6. onerror/onclose → Hata yönetimi
```

### Event Handler
Her gelen mesaj `handleTikTokEvent()` fonksiyonunda işlenir:
- Event type kontrolü
- Data parse
- İstatistik update
- UI'a event ekleme

## 🔐 Güvenlik

- API Key client-side'da saklanıyor (Electron app için uygun)
- Production için environment variable kullanılmalı
- WebSocket bağlantısı WSS (güvenli) kullanıyor

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Network sekmesinde WebSocket trafiğini inceleyin
3. Eulerstream API dokümantasyonunu kontrol edin

## 🎉 Başarılı Test

Test edilen kullanıcı: **tv_asahi_news**
- ✅ Bağlantı başarılı
- ✅ Event'ler gerçek zamanlı alındı
- ✅ İstatistikler güncellendi
- ✅ UI responsive ve smooth

---

**Not**: Bu entegrasyon Eulerstream API'sini kullanır. TikTok'un resmi API'si değildir. Kullanım kurallarına dikkat edin.
