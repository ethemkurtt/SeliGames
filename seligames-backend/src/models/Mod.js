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
    downloadCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index'ler
modSchema.index({ title: 1 });
modSchema.index({ gameTitle: 1 });
modSchema.index({ isActive: 1 });

const Mod = mongoose.model('Mod', modSchema);

module.exports = Mod;
