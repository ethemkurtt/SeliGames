# 🎯 Eulerstream API Tam Analiz

## 📚 API Yapısı

Eulerstream iki ana yöntem sunuyor:

### 1️⃣ WebSocket API (Bizim Kullandığımız)
**Amaç**: Gerçek zamanlı event akışı  
**Endpoint**: `wss://ws.eulerstream.com`  
**Format**: Event-based (chat, gift, like, vb.)

### 2️⃣ REST API  
**Amaç**: Anlık veri çekme, işlem yapma  
**Base URL**: `https://api.eulerstream.com`

---

## 🌐 REST API Endpoint'leri

### Canlı Yayın Bilgileri
```javascript
GET /webcast/room_info?uniqueId=tv_asahi_news
// Döner: Başlık, izleyici sayısı, durum, vb.

GET /webcast/room_id?uniqueId=tv_asahi_news  
// Döner: Room ID

GET /webcast/room_cover?uniqueId=tv_asahi_news
// Döner: Kapak resmi URL

GET /webcast/room_video?uniqueId=tv_asahi_news
// Döner: Video stream bilgileri
```

### Hediye ve Sıralama
```javascript
GET /webcast/gift_info
// Döner: Tüm hediye listesi ve fiyatları

GET /webcast/rankings?...
// Döner: TikTok sıralamaları

GET /webcast/user_earnings?uniqueId=...
// Döner: Kullanıcı kazançları
```

### Toplu İşlemler
```javascript
POST /webcast/bulk_live_check
Body: { "userIds": ["user1", "user2", ...] }
// Döner: Hangi kullanıcılar canlı?

POST /webcast/chat
Body: { "message": "Hello!", ... }
// Canlı yayına mesaj gönder
```

### Feed ve Fetch
```javascript
GET /webcast/feed?uniqueId=...
// Döner: Event feed (WebSocket alternatifi)

GET /webcast/fetch?uniqueId=...
// Döner: Anlık yayın verisi
```

---

## 📨 WebSocket Event Formatı

### Gelen Mesaj Yapısı
```javascript
{
  "webcastChatMessage": {
    "common": {
      "method": "WebcastChatMessage",
      "msgId": "..."
    },
    "user": {
      "nickname": "UserName",
      "uniqueId": "username",
      "profilePictureUrl": "...",
      // ... daha fazla user field
    },
    "comment": "Merhaba!"
  }
}
```

### Desteklenen Event Type'ları

| Key | Event Tipi | Açıklama |
|-----|------------|----------|
| `webcastChatMessage` | Chat | Sohbet mesajları |
| `webcastGiftMessage` | Gift | Hediye gönderildi |
| `webcastLikeMessage` | Like | Beğeni |
| `webcastMemberMessage` | Member | Yeni üye katıldı |
| `webcastSocialMessage` | Social | Takip, paylaş |
| `webcastRoomUserSeqMessage` | RoomUser | İzleyici sayısı |
| `webcastControlMessage` | Control | Kontrol mesajları (ignore) |
| `webcastQuestionNewMessage` | Question | Soru soruldu |
| `webcastEnvelopeMessage` | Envelope | Zarf |
| `webcastLinkMicBattle` | Battle | Mikrofon savaşı |
| `webcastLiveIntroMessage` | LiveIntro | Yayın giriş |

---

## 🔧 Bizim İmplementasyonumuz

### ✅ Doğru Yapılanlar:

1. **WebSocket bağlantısı**: ✅ Doğru endpoint
2. **API Key**: ✅ Query param olarak gönderiliyor
3. **Handler fonksiyonları**: ✅ Her event için ayrı handler
4. **İstatistik tracking**: ✅ liveStats object'i

### ⏳ Düzeltilmesi Gereken:

**Sadece `ws.onmessage` handler'ı!**

**ŞU AN:**
```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 RAW WebSocket Data:', JSON.stringify(data, null, 2));
    // Eski format için yazılmış kod...
}
```

**OLMASI GEREKEN:** (WEBSOCKET_FIX.js'deki kod)
```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const messageKeys = Object.keys(data);
    
    // webcastChatMessage, webcastGiftMessage gibi key'leri yakala
    messageKeys.forEach(key => {
        const normalizedKey = key.toLowerCase();
        const messageData = data[key];
        
        if (normalizedKey.includes('chat')) {
            handleChatMessage(messageData);
        }
        else if (normalizedKey.includes('gift')) {
            handleGiftMessage(messageData);
        }
        // ... diğer handler'lar
    });
}
```

---

## 🎨 İleride Eklenebilecek Özellikler

### 1. Room Info Gösterimi
```javascript
// Bağlantı kurulduğunda room bilgilerini göster
async function loadRoomInfo(uniqueId) {
    const response = await fetch(
        `https://api.eulerstream.com/webcast/room_info?uniqueId=${uniqueId}&apiKey=${apiKey}`
    );
    const data = await response.json();
    
    // UI'da göster:
    // - Başlık
    // - Kapak resmi
    // - İzleyici sayısı
    // - Durum (live/offline)
}
```

### 2. Hediye Bilgileri
```javascript
async function loadGiftInfo() {
    const response = await fetch(
        `https://api.eulerstream.com/webcast/gift_info?apiKey=${apiKey}`
    );
    const gifts = await response.json();
    
    // Hediye listesini cache'le
    // Mod mapping'de kullan
}
```

### 3. Multi-User Monitoring
```javascript
async function checkMultipleLive(userIds) {
    const response = await fetch(
        `https://api.eulerstream.com/webcast/bulk_live_check`,
        {
            method: 'POST',
            body: JSON.stringify({ userIds }),
            headers: { 'x-api-key': apiKey }
        }
    );
    
    // Hangi kullanıcılar canlı yayında?
}
```

---

## 📊 Console Output Karşılaştırması

### ŞU AN (Düzeltme öncesi):
```
webcastmembermessage: {"common":{"method":"WebcastMemberMessage","msgId":"7441...
webcastchatmessage: {"common":{"method":"WebcastChatMessage","msgId":"7441...
webcastlikemessage: {"common":{"method":"WebcastLikeMessage","msgId":"7441...
```
❌ **Okunaksız, parse edilmiyor, istatistik yok**

### OLACAK (Düzeltme sonrası):
```
📨 Received: Chat, Member
  👤 UserName: Merhaba!
  👋 NewUser joined
📨 Received: Gift
  🎁 User123 sent Rose x5 (5 💎)
📨 Received: Like
  ❤️ Viewer liked
```
✅ **Temiz, anlaşılır, istatistikler güncelleniyor**

---

## 🎯 YAPILACAKLAR LİSTESİ

### Hemen Şimdi:
1. ✅ API dokümantasyonu analiz edildi
2. ✅ Handler fonksiyonları eklendi
3. ⏳ **renderer.js satır 622-664'ü güncelle** (WEBSOCKET_FIX.js ile)
4. ⏳ Uygulamayı yeniden başlat
5. ⏳ Test et ve istatistiklerin güncellendiğini gör

### İleride (Opsiyonel):
- [ ] REST API entegrasyonu (room info, gift info)
- [ ] İlk mesajdan room bilgilerini parse et
- [ ] Hediye listesini API'den çek ve cache'le
- [ ] Multi-user monitoring
- [ ] Event history kaydetme

---

## 🔗 Faydalı Linkler

- [API Dökümanı](https://www.eulerstream.com/docs/openapi)
- [WebSocket Guide](https://www.eulerstream.com/docs/sign-server/websockets)
- [Decoder Tool](https://www.eulerstream.com/tools/decoder) ⭐
- [Discord Community](https://www.eulerstream.com/discord)

---

**ÖNEMLİ NOT**: Tüm REST API çağrılarında API key'i `x-api-key` header'ı veya `apiKey` query param olarak göndermelisiniz.

**ŞİMDİ YAPMANIZ GEREKEN TEK ŞEY**: renderer.js'deki `ws.onmessage` kısmını güncellemek! 🚀
