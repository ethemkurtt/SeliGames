# SeliGames Uygulamalarını Başlatma Rehberi

## ✅ Backend Başarıyla Çalışıyor!

### Backend (Zaten Çalışıyor)
```bash
# Backend çalışıyor: http://localhost:3000
# PID: 90080

# Durdurmak için:
kill 90080

# Yeniden başlatmak için:
cd /Users/elegant/Desktop/test/seligames-backend
node server.js &
```

### Electron App (Şu An Başlatılıyor)
```bash
cd /Users/elegant/Desktop/test/seligames-app
npm start
```

### Web App
```bash
cd /Users/elegant/Desktop/test/seligames-web
npm run dev
```

### TikTok Live Service (Opsiyonel)
```bash
cd /Users/elegant/Desktop/test/seligames-live
node index.js tv_asahi_news
```

## 🧪 API Test Komutları

### Health Check
```bash
curl http://localhost:3000/health
```

### Kullanıcı Kaydı
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test123"}'
```

### Giriş
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Modları Listele
```bash
curl http://localhost:3000/api/mods
```

### Mod Oluştur
```bash
curl -X POST http://localhost:3000/api/mods \
  -H "Content-Type: application/json" \
  -d '{
    "title":"GTA V TikTok Mod",
    "description":"TikTok Live hediyeleriyle GTA V kontrol et",
    "version":"1.0.0",
    "downloadUrl":"https://example.com/mod.zip",
    "gameTitle":"GTA V",
    "category":"action"
  }'
```

## 📊 Durum Kontrolü

### Backend çalışıyor mu?
```bash
lsof -ti:3000
```

### MongoDB bağlantısı test
```bash
cd /Users/elegant/Desktop/test/seligames-backend
node -e "require('./src/database').connectDB().then(() => console.log('✅ OK')).catch(e => console.log('❌', e.message))"
```

## 🎮 Kullanım

1. **Electron App** ile giriş yapın
2. **TikTok Canlı** sekmesine gidin
3. TikTok kullanıcı adınızı girin
4. **Bağlan** butonuna tıklayın
5. Canlı yayın verilerini görün!

## 🔧 Sorun Giderme

### Backend yeniden başlatma
```bash
# Eski process'i durdur
pkill -f "node server.js"

# Yeniden başlat
cd /Users/elegant/Desktop/test/seligames-backend
node server.js &
```

### Port zaten kullanımda hatası
```bash
# Port 3000'i kullanan process'i bul ve durdur
lsof -ti:3000 | xargs kill -9
```

### MongoDB bağlantı hatası
- Network Access ayarlarını kontrol edin
- IP adresinizin izinli olduğundan emin olun
- .env dosyasındaki connection string'i kontrol edin

