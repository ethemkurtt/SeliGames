const mongoose = require('mongoose');

/**
 * ViewerPoints — a single viewer's channel-points balance for one streamer.
 * Points are earned from interactions (chat/like/follow/gift) and spent on
 * redeemable rewards (rules with a pointsCost). One doc per (streamer, viewer).
 */
const viewerPointsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    viewer: { type: String, required: true },          // TikTok unique username
    nickname: { type: String, default: '' },           // display name (latest seen)
    avatarUrl: { type: String, default: '' },          // profile picture (latest seen)
    points: { type: Number, default: 0 },              // current spendable balance
    totalEarned: { type: Number, default: 0 },         // lifetime earned (for tiers/leaderboard)
    lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

viewerPointsSchema.index({ userId: 1, viewer: 1 }, { unique: true });
viewerPointsSchema.index({ userId: 1, points: -1 });        // leaderboard (balance)
viewerPointsSchema.index({ userId: 1, totalEarned: -1 });   // leaderboard (lifetime)

module.exports = mongoose.model('ViewerPoints', viewerPointsSchema);
