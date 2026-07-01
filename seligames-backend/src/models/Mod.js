const mongoose = require('mongoose');

const modSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    version: {
        type: String,
        default: '1.0.0'
    },
    downloadUrl: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String
    },
    gameTitle: {
        type: String,
        trim: true
    },
    // Minecraft/entegrasyon modları için bağlantı bilgileri (opsiyonel). Admin
    // "Oyun Ekle"de girer; app "Sunucuya Bağlan" modalında doğru adres + sürüm
    // gösterir (artık sabit "her sürüm" iddiası yok).
    serverAddress: { type: String, trim: true },   // ör. "mc.seligame.com:25565" veya "187.124.29.94"
    mcVersion: { type: String, trim: true },        // ör. "OptiFine 1.19.4"
    connectNote: { type: String, trim: true },      // ek not / uyarı
    // Ek özellikler
    category: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    // Optional default gift→action template. When a streamer first opens the mod
    // (and has no personal config yet), this pre-fills their gift→shortcut map so
    // they don't start from a blank/cluttered table. Set in the admin "Oyun Ekle".
    // Each entry: { giftName, type, value, commands: [{type, value}, ...] }.
    // `commands` holds the FULL ordered command sequence for that gift (TikFinity-
    // style multi-command, e.g. Minecraft "/tnt 1 0 0" then Enter then "/tnt 2 0 0").
    // `type`/`value` mirror commands[0] so older clients keep working (single cmd).
    template: [{
        _id: false,
        giftName: { type: String, trim: true },
        type: { type: String, enum: ['keyboard', 'text', 'mouse'], default: 'keyboard' },
        value: { type: String, trim: true },
        commands: [{
            _id: false,
            type: { type: String, enum: ['keyboard', 'text', 'mouse'], default: 'keyboard' },
            value: { type: String, trim: true }
        }]
    }],
    downloadCount: {
        type: Number,
        default: 0
    },
    // File storage — populated after admin upload via /api/admin/mods/:id/upload.
    // If unset, the public `downloadUrl` (external CDN) is used as fallback.
    fileName: { type: String },
    fileSize: { type: Number },
    fileMimeType: { type: String },
    fileUploadedAt: { type: Date },
    fileChecksum: { type: String }
}, {
    timestamps: true
});

// Index'ler
modSchema.index({ title: 1 });
modSchema.index({ gameTitle: 1 });
modSchema.index({ isActive: 1 });

const Mod = mongoose.model('Mod', modSchema);

module.exports = Mod;
