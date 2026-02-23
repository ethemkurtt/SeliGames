# TikTok Live API - SeliGames Live

Bu proje TikTok Live yayınlarından gerçek zamanlı veri almak için Node.js ve TikTok-Live-Connector kullanır.

## Kurulum

Bağımlılıklar zaten yüklendi. Eğer tekrar kurmanız gerekirse:

```bash
npm install
```

## Kullanım

### 1. TikTok Kullanıcı Adını Değiştirin

`index.js` dosyasını açın ve `username` değişkenini izlemek istediğiniz TikTok kullanıcısının adı ile değiştirin:

```javascript
const username = 'kullanici_adi'; // Bu kullanıcı CANLI yayında olmalı!
```

**ÖNEMLİ:** İzlemek istediğiniz kullanıcı mutlaka CANLI yayında olmalıdır!

### 2. Uygulamayı Çalıştırın

```bash
node index.js
```

## Dinlenebilecek Olaylar (Events)

Uygulama şu olayları dinler:

- **chat**: Yayın sohbetindeki mesajlar
- **gift**: Hediyeler
- **like**: Beğeniler
- **member**: Yeni katılan üyeler
- **roomUser**: İzleyici sayısı gibi oda istatistikleri
- **social**: Takip etme gibi sosyal etkileşimler
- **subscribe**: Kanal abonelikleri

### Diğer Mevcut Olaylar

TikTok-Live-Connector ayrıca şu olayları da destekler (index.js'e ekleyebilirsiniz):

- **emote**: Emoji/tepkiler
- **envelope**: Zarf olayları
- **questionNew**: Yeni sorular
- **linkMicBattle**: Mikrofon savaşları
- **linkMicArmies**: Mikrofon orduları
- **liveIntro**: Yayın girişi

## Örnek Çıktı

```
Connected to 123456789's live
User nickname: GreatPerson101, Commented: I love this stream!
User nickname: TikTokFan, Commented: Hello everyone!
User TikTokUser sent Rose (1 diamonds)
User CoolViewer liked the stream! Total likes: 150
New member: NewFan joined the stream!
Room stats - Viewers: 342
```

## Notlar

- Yayın bittiğinde veya kullanıcı offline olduğunda bağlantı hatası alırsınız
- Her zaman güncel bir TikTok hesabı kullandığınızdan emin olun
- TikTok'un topluluk kurallarına uygun kullanın

## Geliştirme İçin Fikirler

Bu veriyle yapabilecekleriniz:

1. **OBS Entegrasyonu**: Yorumları veya hediyeleri ekranda gösterin
2. **Akıllı Cihaz Kontrolü**: Belirli hediyeler geldiğinde ışıkları yakın
3. **Komut Sistemi**: Sohbetteki belirli komutlara tepki verin
4. **İstatistik Takibi**: Yayın verilerini kaydedin ve analiz edin
5. **Uyarı Sistemi**: Büyük hediyeler veya belirli yorumlar için bildirim gönderin

## Lisans

ISC
