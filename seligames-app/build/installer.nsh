; --- SeliGames özel NSIS include ---
; Wine 4.0.1 makensis (macOS'ta) installer'a gerçek Windows NSIS'in reddettiği
; bir self-CRC değeri yazıyor → çalıştırınca "Installer integrity check has
; failed" hatası, oysa yük (payload) tamamen sağlam (7z ile açılabiliyor).
; Self-CRC kontrolünü kapatıyoruz; indirme bütünlüğü zaten TLS + tarayıcı +
; bizim sha256 doğrulamamızla garanti. Bu, customHeader makrosu üzerinden
; global kapsamda emit edilir.
!macro customHeader
  CRCCheck off
!macroend
