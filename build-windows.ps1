# ============================================================
#  SeliGames — Windows Installer Builder
#  Windows PC'de PowerShell'e şunu yapıştırıp çalıştır:
#    irm https://raw.githubusercontent.com/ethemkurtt/SeliGames/main/build-windows.ps1 | iex
#  Node.js + Git kuruluysa: kodu çeker, derler, gerçek .exe installer üretir
#  ve sunucuya yükler. (Wine GEREKMEZ — Windows'ta native derlenir.)
# ============================================================
$ErrorActionPreference = "Stop"
function Say($m,$c="White"){ Write-Host $m -ForegroundColor $c }

Say "==== SeliGames Windows Installer Builder ====" Cyan

# 1) Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Say "[X] Node.js bulunamadi. Acilan sayfadan 'LTS' surumunu kur, sonra bu komutu tekrar calistir." Red
  Start-Process "https://nodejs.org/en/download/prebuilt-installer"
  return
}
Say "[OK] Node $(node -v)" Green

# 2) Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Say "[X] Git bulunamadi. Acilan sayfadan kur (varsayilan ayarlarla), sonra tekrar calistir." Red
  Start-Process "https://git-scm.com/download/win"
  return
}
Say "[OK] Git $(git --version)" Green

# 3) Kodu cek / guncelle
$dir = Join-Path $env:USERPROFILE "SeliGames-build"
if (Test-Path (Join-Path $dir ".git")) {
  Say "[..] Mevcut kopya guncelleniyor..." Yellow
  git -C $dir reset --hard | Out-Null
  git -C $dir pull
} else {
  Say "[..] Repo indiriliyor: $dir" Yellow
  git clone https://github.com/ethemkurtt/SeliGames.git $dir
}
Set-Location (Join-Path $dir "seligames-app")

# 4) Bagimliliklar + derleme
Say "[..] npm install (ilk seferde birkac dakika surebilir)..." Yellow
npm install --no-audit --no-fund
Say "[..] Installer derleniyor (electron-builder --win)..." Yellow
npm run dist:win

# 5) Sonuc
$exe = Join-Path (Get-Location) "dist\SeliGames-Setup-1.0.0.exe"
if (-not (Test-Path $exe)) {
  Say "[X] Installer uretilemedi. Yukaridaki hata mesajini bana yolla." Red
  return
}
$mb = [math]::Round((Get-Item $exe).Length/1MB,1)
Say "[OK] Installer hazir: $exe  ($mb MB)" Green
Start-Process explorer.exe "/select,`"$exe`""

# 6) Sunucuya yukle (istege bagli)
$ans = Read-Host "Sunucuya simdi yukleyeyim mi? (sifre sorulacak) [E/h]"
if ($ans -eq "" -or $ans -match "^[eEyY]") {
  if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Say "[!] scp yok. Windows: Ayarlar > Uygulamalar > Istege bagli ozellikler > 'OpenSSH Client' ekle. Ya da dosyayi bana elle yukleyecegini soyle." Yellow
  } else {
    Say "[..] Yukleniyor (root@187.124.29.94 sifresi sorulacak)..." Yellow
    scp "$exe" root@187.124.29.94:/root/SeliGames-Setup-1.0.0.exe
    Say "[OK] Yuklendi. Simdi Claude'a 'installer yuklendi' yaz; gerisini o yapar (yedek + canliya alma)." Green
  }
} else {
  Say "Tamam. Dosya: $exe — hazir oldugunda yuklersin." White
}
