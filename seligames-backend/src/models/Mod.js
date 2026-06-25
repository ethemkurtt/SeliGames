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
    // Each entry: { giftName, type: 'keyboard'|'text'|'mouse', value }.
    template: [{
        _id: false,
        giftName: { type: String, trim: true },
        type: { type: String, enum: ['keyboard', 'text', 'mouse'], default: 'keyboard' },
        value: { type: String, trim: true }
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
