# SeliGames Proje Kurulum Rehberi

## 📋 Proje Yapısı

```
seligames/
├── seligames-backend/     # Express.js + MongoDB API
├── seligames-app/          # Electron Desktop App
├── seligames-web/          # React Web App
└── seligames-live/         # TikTok Live Standalone Service
```

## 🚀 Hızlı Başlangıç

### 1. Backend Kurulumu

```bash
cd seligames-backend

# Bağımlılıkları yükle
npm install

# MongoDB Atlas bağlantısı için .env dosyası oluştur
# ENV_SETUP.md dosyasındaki talimatları takip edin
cp ENV_SETUP.md .env  # Manuel olarak oluşturun ve düzenleyin

# Sunucuyu başlat
npm start
# veya development için
npm run dev
```

Backend `http://localhost:3000` adresinde çalışacak.

### 2. Electron App Kurulumu

```bash
cd seligames-app

# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

### 3. Web App Kurulumu

```bash
cd seligames-web

# Bağımlılıkları yükle
npm install

# Development server'ı başlat
npm run dev
```

Web app `http://localhost:5173` (veya Vite'ın belirlediği port) adresinde çalışacak.

### 4. TikTok Live Service (Opsiyonel)

```bash
cd seligames-live

# Bağımlılıkları yükle
npm install

# Kullanım
node index.js <tiktok_username>
```

## 🔧 MongoDB Atlas Kurulumu

Detaylı kurulum için `seligames-backend/ENV_SETUP.md` dosyasına bakın.

Özet:
1. MongoDB Atlas hesabı oluşturun
2. Cluster oluşturun
3. Database user oluşturun
4. Network access ayarlayın
5. Connection string'i `.env` dosyasına ekleyin

## 📝 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/seligames
JWT_SECRET=your-secret-key
PORT=3000
NODE_ENV=development
```

## 🎯 API Endpoints

Backend API dokümantasyonu için `seligames-backend/README.md` dosyasına bakın.

Ana endpoint'ler:
- `/api/auth/*` - Authentication
- `/api/mods/*` - Mod yönetimi
- `/api/statistics/*` - İstatistikler
- `/api/subscription/*` - Abonelik yönetimi

## 🐛 Sorun Giderme

### MongoDB Bağlantı Hatası
- Connection string'in doğru olduğundan emin olun
- Network Access'te IP'nizin izinli olduğunu kontrol edin
- Database user şifresinin doğru olduğundan emin olun

### Port Çakışması
- Backend varsayılan port: 3000
- Web app port: Vite otomatik belirler (genelde 5173)
- Port değiştirmek için `.env` dosyasını düzenleyin

### CORS Hatası
- Backend'de CORS zaten aktif
- Eğer sorun yaşıyorsanız, `server.js` içindeki CORS ayarlarını kontrol edin

## 📚 Ek Dokümantasyon

- `seligames-backend/README.md` - Backend API dokümantasyonu
- `seligames-backend/ENV_SETUP.md` - MongoDB Atlas kurulum rehberi
- `seligames-app/README.md` - Electron app dokümantasyonu
- `TIKTOK_INTEGRATION_SUMMARY.md` - TikTok entegrasyon özeti

## ✅ Kontrol Listesi

- [ ] MongoDB Atlas hesabı oluşturuldu
- [ ] Backend `.env` dosyası yapılandırıldı
- [ ] Backend başarıyla çalışıyor
- [ ] Electron app backend'e bağlanabiliyor
- [ ] Web app backend'e bağlanabiliyor
- [ ] TikTok Live entegrasyonu test edildi

## 🎨 Tasarım İyileştirmeleri

Detaylı tasarım önerileri için `DESIGN_IMPROVEMENTS.md` dosyasına bakın.

