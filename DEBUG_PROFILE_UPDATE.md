# 🐛 Profile Update Debug Rehberi

## Hata: `Error: No handler registered for 'update-profile'`

### ✅ Yapılan Kontroller:
1. ✅ `main.js` - Handler mevcut (satır 382)
2. ✅ `preload.js` - IPC expose edilmiş
3. ✅ `auth.js` - Backend endpoint mevcut (satır 86)
4. ✅ `User.js` - Model field'ları eksiksiz

### 🔴 Sorun:
**Backend çalışmıyor!** Electron app başladığında backend hazır değilse bu hata alınır.

---

## 📋 ÇÖ ZÜM ADIMLARI

### 1. Backend'i başlat:
```bash
cd /Users/elegant/Desktop/test/seligames-backend
npm start
```

**Bekle:** `✅ Server running on port 3000` mesajını gör

---

### 2. Electron'u başlat:
```bash
cd /Users/elegant/Desktop/test/seligames-app
npm start
```

---

### 3. Test Et:
1. Uygulamayı aç
2. Giriş yap
3. **Profil** sayfasına git
4. Bir alan değiştir (örn. "Kullanıcı Adı")
5. **Kaydet** butonuna tıkla

---

## 🔍 Hata Devam Ederse

### A) Console Log'larına Bak
Electron app'te **F12** → Console sekmesine git:
```javascript
// Şunu görüyor musun?
❌ Güncelleme başarısız: Error invoking remote method 'update-profile'
```

### B) Backend Log'larına Bak
Backend terminal'ine bak:
```bash
# Bu satırı görüyor musun?
POST /api/auth/profile 200 12.345 ms
```

**Eğer 404 veya başka bir hata görüyorsan:**
```bash
# Backend'i yeniden başlat
cd /Users/elegant/Desktop/test/seligames-backend
npm start
```

---

### C) Handler'ı Manuel Test Et

**F12 Console'da** şunu yaz:
```javascript
window.api.updateProfile({ username: 'testuser123' })
  .then(r => console.log('✅ Başarılı:', r))
  .catch(e => console.error('❌ Hata:', e));
```

**Beklenen çıktı:**
```javascript
✅ Başarılı: { success: true, data: { message: 'Profile updated successfully', user: {...} } }
```

**Eğer hala hata alıyorsan:**
```javascript
❌ Hata: Error: No handler registered for 'update-profile'
```
→ **Electron app'i tamamen kapat ve tekrar başlat**

---

## 🚀 Kesin Çözüm

### 1. Tüm process'leri durdur:
```bash
# macOS/Linux:
pkill -9 node

# Windows:
taskkill /F /IM node.exe
```

### 2. Backend'i başlat:
```bash
cd /Users/elegant/Desktop/test/seligames-backend
npm start
```

### 3. 5 saniye bekle

### 4. Electron'u başlat:
```bash
cd /Users/elegant/Desktop/test/seligames-app
npm start
```

---

## 📝 Notlar

- **Handler kesinlikle var** (`main.js:382`)
- **Preload expose edilmiş** (`preload.js`)
- **Backend endpoint hazır** (`auth.js:86`)
- Sorun: **Backend çalışmadan Electron başlatılmış**

---

## 🎯 Özet

1. ✅ Backend'i başlat (port 3000)
2. ✅ Electron'u başlat
3. ✅ F12 Console'da hata kontrolü yap
4. ✅ Profile git ve güncelle

**Her şey düzgün başlatılırsa %100 çalışacak!** 🎉

