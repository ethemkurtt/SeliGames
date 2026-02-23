// Konfigürasyon dosyası - Burada ayarlarınızı değiştirebilirsiniz

module.exports = {
    // İzlemek istediğiniz TikTok kullanıcı adı (CANLI yayında olmalı!)
    username: 'pizzamannickdiesslin',

    // Hangi event'leri dinlemek istediğinizi seçin
    events: {
        chat: true,        // Sohbet mesajları
        gift: true,        // Hediyeler
        like: true,        // Beğeniler
        member: true,      // Yeni üyeler
        roomUser: true,    // Oda istatistikleri
        social: true,      // Takip etme
        subscribe: true,   // Abonelikler
        emote: false,      // Emoji/tepkiler
        envelope: false,   // Zarf olayları
    },

    // Gelişmiş ayarlar
    options: {
        enableExtendedGiftInfo: true,  // Detaylı hediye bilgisi
        enableWebsocketUpgrade: true,   // WebSocket yükseltmesi
        requestPollingIntervalMs: 1000, // Polling aralığı (ms)
    }
};
