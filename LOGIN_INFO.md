# 🎮 SeliGames - Giriş Bilgileri

## ✅ Demo Kullanıcılar Hazır!

Veritabanına 3 demo kullanıcı eklendi. **Herhangi biriyle giriş yapabilirsiniz**:

---

### 1️⃣ Demo Kullanıcı (Pro Plan)
```
📧 Email:    demo@seligames.com
🔑 Şifre:    demo123
👤 Kullanıcı: DemoUser
🎁 Plan:     Pro
```

### 2️⃣ Admin Kullanıcı (Ultra Plan)
```
📧 Email:    admin@seligames.com
🔑 Şifre:    admin123
👤 Kullanıcı: Admin
🎁 Plan:     Ultra
👑 Yetki:    Admin
```

### 3️⃣ Test Kullanıcı (Free Plan)
```
📧 Email:    test@test.com
🔑 Şifre:    test123
👤 Kullanıcı: TestUser
🎁 Plan:     Free
```

---

## 🚀 Nasıl Giriş Yapılır?

### Yöntem 1: Electron App (Önerilen)
```bash
cd seligames-app
npm start
```
1. Uygulama açılacak
2. Yukarıdaki email ve şifrelerden birini girin
3. **Giriş Yap** butonuna tıklayın
4. ✅ Hoş geldiniz!

### Yöntem 2: Backend Test
Backend'in çalıştığından emin olun:
```bash
cd seligames-backend
npm start
```
Backend şu adreste çalışmalı: `http://localhost:3000`

---

## 🔄 Yeni Kullanıcı Ekleme

Eğer yeni kullanıcı eklemek isterseniz:

```bash
cd seligames-backend
node add_demo_user.js
```

Bu script otomatik olarak:
- Mevcut kullanıcıları kontrol eder
- Yoksa 3 demo kullanıcıyı ekler
- Varsa bilgileri gösterir

---

## 🛠️ Kullanıcıları Listeleme

Tüm kullanıcıları görmek için:

```bash
cd seligames-backend
node list_users.js
```

---

## 🎯 TikTok Live Testi İçin

Demo kullanıcıyla giriş yaptıktan sonra:

1. Sol menüden **"TikTok Canlı"** sekmesine git
2. Input'a kullanıcı adı gir: `tv_asahi_news`
3. **Bağlan** butonuna tıkla
4. ✅ Canlı verileri izle!

---

## 📞 Sorun mu var?

### "User not found" hatası
- ✅ **ÇÖZÜLDÜ!** Demo kullanıcılar eklendi
- Backend'in çalıştığından emin olun
- Yukarıdaki email/şifreleri kullanın

### Backend çalışmıyor
```bash
cd seligames-backend
npm start
```

### Veritabanı sıfırlamak isterseniz
```bash
cd seligames-backend
rm database.sqlite
node add_demo_user.js
```

---

## 🎉 Hepsi Hazır!

Artık giriş yapıp TikTok Live özelliğini test edebilirsiniz!

**Önerilen test akışı:**
1. `seligames-backend` → Backend'i başlat
2. `seligames-app` → Electron app'i başlat
3. `demo@seligames.com` / `demo123` ile giriş yap
4. TikTok Live'a bağlan
5. Gerçek zamanlı verileri izle! 🚀
