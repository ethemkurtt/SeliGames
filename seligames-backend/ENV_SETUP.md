# MongoDB Atlas Bağlantı Kurulumu

## 1. MongoDB Atlas Hesabı Oluşturma

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) sitesine gidin
2. Ücretsiz hesap oluşturun
3. Yeni bir cluster oluşturun (M0 Free tier yeterli)

## 2. Database User Oluşturma

1. Atlas dashboard'da **Database Access** sekmesine gidin
2. **Add New Database User** butonuna tıklayın
3. Username ve password belirleyin (güçlü bir şifre kullanın)
4. Database User Privileges: **Read and write to any database** seçin
5. **Add User** butonuna tıklayın

## 3. Network Access Ayarlama

1. **Network Access** sekmesine gidin
2. **Add IP Address** butonuna tıklayın
3. Development için: **Allow Access from Anywhere** (0.0.0.0/0) seçin
4. Production için: Sadece belirli IP'leri ekleyin
5. **Confirm** butonuna tıklayın

## 4. Connection String Alma

1. **Database** sekmesine gidin
2. Cluster'ınızın yanındaki **Connect** butonuna tıklayın
3. **Connect your application** seçeneğini seçin
4. Driver: **Node.js**, Version: **5.5 or later** seçin
5. Connection string'i kopyalayın

Örnek format:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/seligames?retryWrites=true&w=majority
```

## 5. .env Dosyası Oluşturma

Backend klasöründe `.env` dosyası oluşturun:

```bash
cd seligames-backend
touch .env
```

`.env` dosyasına şunları ekleyin:

```env
# MongoDB Atlas Connection String
# <username> ve <password> kısımlarını kendi bilgilerinizle değiştirin
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/seligames?retryWrites=true&w=majority

# JWT Secret Key (güçlü bir değer kullanın)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# Server Port
PORT=3000

# Environment
NODE_ENV=development
```

## 6. Test Etme

```bash
npm install
npm start
```

Başarılı bağlantı mesajını görmelisiniz:
```
✅ MongoDB Atlas bağlantısı başarılı
🚀 Server is running on http://localhost:3000
```

## ⚠️ Güvenlik Notları

- `.env` dosyasını **ASLA** git'e commit etmeyin
- Production'da güçlü JWT_SECRET kullanın
- Network Access'i production'da sınırlandırın
- Database user şifresini güvenli tutun

