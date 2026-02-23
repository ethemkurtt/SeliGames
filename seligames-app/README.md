# TikTok Live WebSocket Monitor

Electron tabanlı masaüstü uygulaması - TikTok Live sayfalarındaki WebSocket frame'lerini Chrome DevTools Protocol (CDP) ile yakalayıp analiz eder.

## 🎯 Özellikler

- ✅ **Görünmez Monitoring**: TikTok Live sayfası arka planda açılır (show: false)
- ✅ **Kalıcı Oturum**: Bir kere giriş yapınca session korunur (persist:tiktok)
- ✅ **CDP WebSocket Yakalama**: Chrome DevTools Protocol ile WebSocket frame'leri dinlenir
- ✅ **Anlık Veri Akışı**: Frame'ler gerçek zamanlı olarak UI'da listelenir
- ✅ **Akıllı Parsing**: JSON otomatik parse edilir, binary frame'ler işaretlenir
- ✅ **Filtreleme**: Frame tipi (text/binary) ve JSON filtresi
- ✅ **İstatistikler**: Toplam, text ve binary frame sayıları
- ✅ **Disk Logging**: Tüm aktivite debug log dosyasına yazılır
- ✅ **Güvenli Mimari**: contextIsolation, sandbox, güvenli IPC

## 📋 Gereksinimler

- Node.js 16+
- npm veya yarn

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

## 📖 Kullanım

### 1. İlk Kurulum ve Giriş

- Uygulamayı başlatın
- TikTok Live URL'i girin (örn: `https://www.tiktok.com/@username/live`)
- "Başlat" butonuna tıklayın
- İlk kullanımda "TikTok Penceresini Göster" ile pencereyi açıp giriş yapın
- Sonraki kullanımlarda oturum otomatik korunur

### 2. WebSocket Monitoring

- URL girip "Başlat" dedikten sonra otomatik olarak:
  - TikTok Live sayfası arka planda yüklenir
  - CDP debugger attach edilir
  - WebSocket frame'leri yakalanmaya başlar
  - Frame'ler UI'da anlık listelenir

### 3. Filtreleme

- **Frame Tipi**: Tümü / Sadece Text / Sadece Binary
- **Sadece JSON**: Checkbox ile sadece JSON parse edilebilen frame'leri göster

### 4. Kontroller

- **Başlat**: Monitoring'i başlatır
- **Durdur**: Monitoring'i durdurur
- **TikTok Penceresini Göster**: Gizli pencereyi görünür yapar (login için)
- **Temizle**: Frame listesini ve istatistikleri temizler

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────┐
│                  Main Process                        │
│  - BrowserWindow yönetimi                           │
│  - CDP debugger attach/detach                       │
│  - Network.webSocketFrameReceived event handler     │
│  - IPC handlers                                     │
│  - Disk logging                                     │
└─────────────────────────────────────────────────────┘
                         ↕ IPC
┌─────────────────────────────────────────────────────┐
│                 Preload Script                       │
│  - contextBridge ile güvenli API expose             │
│  - IPC köprüsü (main ↔ renderer)                   │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│               Renderer Process                       │
│  - UI state yönetimi                                │
│  - Frame listesi render                             │
│  - Filtreleme ve istatistikler                      │
│  - JSON parsing                                     │
└─────────────────────────────────────────────────────┘
```

## 📁 Dosya Yapısı

```
seligames-app/
├── main.js           # Ana Electron process
├── preload.js        # Güvenli IPC köprüsü
├── renderer.js       # UI logic
├── index.html        # Kullanıcı arayüzü
├── package.json      # Proje tanımı
└── README.md         # Bu dosya
```

## 🔒 Güvenlik

- **contextIsolation: true** - Renderer ve main process izolasyonu
- **nodeIntegration: false** - Renderer'da Node.js API'leri kapalı
- **sandbox: true** - Renderer process sandbox'ta çalışır
- **contextBridge** - Güvenli IPC API expose
- **CSP** - Content Security Policy aktif

## 📊 WebSocket Frame Formatı

### Text Frame (opcode=1)
```json
{
  "timestamp": "2025-12-17T13:24:01.123Z",
  "opcode": 1,
  "type": "TEXT",
  "isJSON": true,
  "parsed": { ... },
  "payloadData": "..."
}
```

### Binary Frame (opcode=2)
```json
{
  "timestamp": "2025-12-17T13:24:01.456Z",
  "opcode": 2,
  "type": "BINARY",
  "preview": "first 200 chars...",
  "payloadData": "..."
}
```

## 🐛 Debug

Debug log dosyası konumu:
- **macOS**: `~/Library/Application Support/tiktok-websocket-monitor/websocket-debug.log`
- **Windows**: `%APPDATA%/tiktok-websocket-monitor/websocket-debug.log`
- **Linux**: `~/.config/tiktok-websocket-monitor/websocket-debug.log`

Konsola yazdırmak için:
```bash
npm start
# Uygulama açıldıktan sonra DevTools'u aç: View > Toggle Developer Tools
```

## ⚠️ Önemli Notlar

### Sınırlamalar
- Bu uygulama sadece Electron'un kendi CDP yeteneklerini kullanır
- TikTok'un anti-bot veya captcha sistemlerini aşmaya çalışmaz
- Stealth plugin veya bypass teknikleri içermez
- Kullanıcı manuel olarak giriş yapmalıdır

### Edge Cases
- Debugger attach başarısız olursa hata mesajı gösterilir
- Sayfa reload olduğunda otomatik yeniden attach edilir
- Uygulama kapanırken debugger otomatik detach edilir
- Max 1000 frame tutulur (performans için)

### TikTok Live URL Formatı
```
https://www.tiktok.com/@username/live
https://www.tiktok.com/@username/live/1234567890
```

## 🛠️ Geliştirme

```bash
# Development modda çalıştır
npm run dev

# DevTools otomatik açılsın
# main.js içinde: mainWindow.webContents.openDevTools();
```

## 📝 Lisans

MIT

## 🤝 Katkıda Bulunma

Bu proje eğitim amaçlıdır. TikTok'un kullanım şartlarına uygun şekilde kullanılmalıdır.
