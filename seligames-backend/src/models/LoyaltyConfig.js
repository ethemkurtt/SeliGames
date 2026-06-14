const mongoose = require('mongoose');

/**
 * LoyaltyConfig — per-streamer channel-points settings: what the currency is
 * called and how many points each interaction earns. One doc per streamer.
 */
const loyaltyConfigSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    enabled: { type: Boolean, default: true },
    pointsName: { type: String, default: 'Puan' },     // currency display name
    earn: {
        perChat: { type: Number, default: 2 },         // per chat message
        perLike: { type: Number, default: 1 },         // per like event (× likeCount, capped)
        likeCap: { type: Number, default: 50 },        // max likes counted per like event
        perFollow: { type: Number, default: 50 },
        perShare: { type: Number, default: 20 },
        perGiftCoin: { type: Number, default: 1 },     // per coin of gift value
        perMinute: { type: Number, default: 0 },       // passive watch-time (0 = off)
    },
}, { timestamps: true });

module.exports = mongoose.model('LoyaltyConfig', loyaltyConfigSchema);
