# 🔍 TikTok Live Event Debug Güncellemesi

## ✅ Yapılan İyileştirmeler

### 1. Detaylı Loglama
Her WebSocket mesajı artık console'a çok detaylı şekilde yazılıyor:
- 📨 RAW WebSocket Data (JSON formatında)
- 📦 Mesaj sayısı
- 📬 Her bir mesajın detayı
- 🎯 İşlenen event'in türü ve verisi

### 2. Çoklu Format Desteği
API farklı formatlarda veri gönderebilir. Artık desteklenen formatlar:
- `{ messages: [...] }` - Mesaj dizisi
- `{ event: "...", data: {...} }` - Direkt event
- `[...]` - Event dizisi
- Diğer formatlar için automatic detection

### 3. Esnek Event Handling
Event'ler artık farklı şekillerde adlandırılabilir:
- `event`, `type`, veya `action` alanlarından biri kullanılabilir
- `data`, `payload` veya direkt mesaj objesinden veri alınır

### 4. Gelişmiş Kullanıcı Tespiti
Kullanıcı adı için birçok fallback:
- `data.user.nickname`
- `data.user.uniqueId`
- `data.nickname`
- `data.uniqueId`
- `data.username`
- "Unknown User" (fallback)

### 5. Unknown Event'ler için Destek
Tanınamayan event'ler bile:
- Console'da loglanır
- UI'da "❓" ikonu ile gösterilir
- Debug için mesaj içeriği eklenir

## 🧪 Debug Nasıl Yapılır?

### Adım 1: Electron App'i Yeniden Başlat
```bash
# Çalışan uygulamayı kapat (Ctrl+C)
# Sonra tekrar başlat:
cd seligames-app
npm start
```

### Adım 2: Developer Tools Aç
- **Mac**: `Cmd + Option + I`
- **Windows/Linux**: `Ctrl + Shift + I`

### Adım 3: Console Sekmesine Git
Console'da şunları göreceksiniz:

### Adım 4: TikTok'a Bağlan
`tv_asahi_news` veya başka bir canlı kullanıcı adı girin

### Adım 5: Logları İzle

#### Bağlantı Başarılı İse:
```
🔄 Connecting to: wss://ws.eulerstream.com?uniqueId=...
✅ WebSocket connected!
```

#### Mesaj Gelirse:
```
📨 RAW WebSocket Data: { ... }
📦 Processing X messages
📬 Message 1: { event: "chat", data: {...} }
🎯 Processing Event: { ... }
🔑 Event type: chat
📦 Event data: { ... }
💬 Chat from UserName: Hello!
```

#### Mesaj Gelmiyorsa:
- Kullanıcı canlı yayında mı kontrol edin
- Başka bir kullanıcı deneyin
- Network sekmesinde WebSocket trafiğini inceleyin

## 🎯 Şimdi Ne Yapmalı?

1. **Uygulamayı yeniden başlatın** (değişikliklerin yüklenmesi için)
2. **Developer Console'u açın** (logları görmek için)
3. **TikTok Live'a bağlanın**
4. **Console'da logları izleyin**

### Eğer Mesaj Geliyorsa Ama UI'da Görünmüyorsa:
- Console'daki mesajların tam içeriğini bana gönderin
- Event formatını anlayıp daha da iyileştirebilirim

### Eğer Hiç Mesaj Gelmiyorsa:
- Eulerstream API'sinin çalıştığını kontrol edin
- API key'in doğruluğunu kontrol edin
- Farklı bir canlı yayın kullanıcısı deneyin

## 📋 Console'da Aranacak Şeyler:

✅ **Başarılı Durum:**
```
✅ WebSocket connected!
📨 RAW WebSocket Data: ...
🎯 Processing Event: ...
💬 Chat from ...
```

❌ **Problem Durumu:**
```
❌ WebSocket error
⚠️ Unknown message format
⚠️ Unknown event type
```

## 💡 İpuçları

1. **Clear Console**: Console'u temizlemek için `clear()`
2. **Filter Logs**: Console'da "🎯" veya "📨" ile filtreleyin
3. **Network Tab**: WS (WebSocket) bağlantısını izleyin
4. **Console Copy**: Log'u sağ tık → Copy object yapabilirsiniz

---

**Sonraki Adım**: Uygulamayı yeniden başlatıp console'daki logları kontrol edin!
