/**
 * loyalty — channel-points economy. Awards points for interactions and
 * handles reward redemptions (atomic deduct). Called from the ruleEngine so
 * every normalised event both fires rules AND accrues points.
 */
const ViewerPoints = require('../models/ViewerPoints');
const LoyaltyConfig = require('../models/LoyaltyConfig');

const DEFAULTS = {
    enabled: true, pointsName: 'Puan',
    earn: { perChat: 2, perLike: 1, likeCap: 50, perFollow: 50, perShare: 20, perGiftCoin: 1, perMinute: 0 },
};

// ── Config cache (per streamer, 30s TTL) ────────────────────────────────
const cfgCache = new Map(); // userId -> { cfg, at }
async function getConfig(userId) {
    const key = String(userId);
    const hit = cfgCache.get(key);
    if (hit && (Date.now() - hit.at) < 30000) return hit.cfg;
    let doc = await LoyaltyConfig.findOne({ userId }).lean().catch(() => null);
    const cfg = {
        ...DEFAULTS, ...(doc || {}),
        earn: { ...DEFAULTS.earn, ...((doc && doc.earn) || {}) },
    };
    cfgCache.set(key, { cfg, at: Date.now() });
    return cfg;
}
function invalidate(userId) { cfgCache.delete(String(userId)); }

// ── Earning ──────────────────────────────────────────────────────────────
// Compute points for a normalised event, given earn rates.
function pointsFor(ev, earn) {
    switch (ev.eventType) {
        case 'chat': return earn.perChat || 0;
        case 'like': return (earn.perLike || 0) * Math.min(ev.likeCount || 1, earn.likeCap || 50);
        case 'follow': return earn.perFollow || 0;
        case 'share': return earn.perShare || 0;
        case 'subscribe': return (earn.perFollow || 0) * 5;
        case 'gift': return (earn.perGiftCoin || 0) * (ev.coins || 0) * (ev.repeatCount || 1);
        default: return 0;
    }
}

/**
 * Award points for an event. Fire-and-forget — never blocks rule dispatch.
 * Emits 'points-update' to the user room so overlays/app refresh live.
 */
async function award(ev, io) {
    if (!ev.userId || !ev.user) return;
    const cfg = await getConfig(ev.userId);
    if (!cfg.enabled) return;
    const amount = pointsFor(ev, cfg.earn);
    if (!amount || amount <= 0) return;
    const set = { nickname: ev.nickname || ev.user, lastSeen: new Date() };
    // Only overwrite the stored avatar when this event carries one, so a later
    // avatar-less event doesn't wipe a good picture.
    if (ev.profilePicture) set.avatarUrl = ev.profilePicture;
    const doc = await ViewerPoints.findOneAndUpdate(
        { userId: ev.userId, viewer: ev.user },
        { $inc: { points: amount, totalEarned: amount }, $set: set },
        { upsert: true, new: true }
    ).lean().catch(() => null);
    if (doc && io) {
        io.to(`user:${ev.userId}`).emit('points-update', {
            viewer: ev.user, nickname: doc.nickname, points: doc.points, delta: amount,
        });
    }
    return doc;
}

// ── Redemption ─────────────────────────────────────────────────────────
// Atomically deduct `cost` if the viewer can afford it. Returns the updated
// balance on success, or null if insufficient funds / no account.
async function tryRedeem(userId, viewer, cost) {
    if (!cost || cost <= 0) return { ok: true, points: null };
    const doc = await ViewerPoints.findOneAndUpdate(
        { userId, viewer, points: { $gte: cost } },
        { $inc: { points: -cost } },
        { new: true }
    ).lean().catch(() => null);
    return doc ? { ok: true, points: doc.points } : { ok: false };
}

// Manual adjust (admin/app). delta may be negative. Floors at 0.
async function adjust(userId, viewer, delta, nickname) {
    const doc = await ViewerPoints.findOneAndUpdate(
        { userId, viewer },
        { $inc: { points: delta, totalEarned: Math.max(0, delta) }, $set: { nickname: nickname || viewer, lastSeen: new Date() } },
        { upsert: true, new: true }
    ).lean();
    if (doc.points < 0) {
        await ViewerPoints.updateOne({ _id: doc._id }, { $set: { points: 0 } });
        doc.points = 0;
    }
    return doc;
}

module.exports = { getConfig, invalidate, award, tryRedeem, adjust, pointsFor, DEFAULTS };
