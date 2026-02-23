# SeliGames Backend API

TikTok Live entegrasyonu için backend API servisi.

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. MongoDB Atlas Bağlantısı

`.env` dosyası oluşturun:
```bash
cp .env.example .env
```

`.env` dosyasına MongoDB Atlas connection string'inizi ekleyin:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/seligames?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
NODE_ENV=development
```

### 3. Sunucuyu Başlat

```bash
# Development
npm run dev

# Production
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacak.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş yap
- `GET /api/auth/profile` - Kullanıcı profili (Auth gerekli)
- `POST /api/auth/connect-tiktok` - TikTok kullanıcı adı bağla (Auth gerekli)
- `POST /api/auth/toggle-live` - Canlı yayın durumunu değiştir (Auth gerekli)
- `POST /api/auth/change-password` - Şifre değiştir (Auth gerekli)

### Mods
- `GET /api/mods` - Tüm modları listele
- `GET /api/mods/:id` - Mod detayı
- `POST /api/mods` - Yeni mod oluştur
- `PUT /api/mods/:id` - Mod güncelle
- `DELETE /api/mods/:id` - Mod sil (soft delete)

### Statistics
- `GET /api/statistics` - Kullanıcı istatistikleri (Auth gerekli)
- `POST /api/statistics/record` - Mod kullanım kaydı (Auth gerekli)

### Subscription
- `GET /api/subscription/status` - Abonelik durumu (Auth gerekli)
- `POST /api/subscription/upgrade` - Abonelik planı yükselt (Auth gerekli)
- `POST /api/subscription/cancel` - Aboneliği iptal et (Auth gerekli)
- `POST /api/subscription/renew` - Aboneliği yenile (Auth gerekli)
- `GET /api/subscription/history` - Ödeme geçmişi (Auth gerekli)
- `POST /api/subscription/auto-renew` - Otomatik yenileme ayarı (Auth gerekli)

## 🗄️ Veritabanı

MongoDB Atlas kullanılıyor. Modeller:
- **User**: Kullanıcı bilgileri, abonelik, TikTok entegrasyonu
- **Mod**: Oyun modları
- **ModUsage**: Mod kullanım istatistikleri
- **PaymentHistory**: Ödeme geçmişi

## 🔐 Güvenlik

- JWT token authentication
- Bcrypt password hashing
- CORS enabled
- Environment variables for sensitive data

## 📝 Notlar

- MongoDB Atlas connection string'i `.env` dosyasında saklanmalı
- Production'da `JWT_SECRET` mutlaka güçlü bir değer olmalı
- `force: true` sync kaldırıldı - MongoDB otomatik şema oluşturur

