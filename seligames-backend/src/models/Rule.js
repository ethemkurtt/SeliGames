const mongoose = require('mongoose');

/**
 * Rule — the "when this happens" side. Maps a TikTok event (+ filters,
 * role gating, cooldowns, combo behaviour) onto one or more Actions.
 *
 * This is the heart of the engine — TikFinity's "Events" but with a
 * proper condition system, dual-layer cooldowns and role gating built in
 * rather than bolted on.
 */
const conditionSchema = new mongoose.Schema({
    // field on the normalised event we test against
    field: {
        type: String,
        enum: ['coins', 'repeatCount', 'giftName', 'giftId', 'likeCount', 'comment', 'username'],
        required: true,
    },
    op: {
        type: String,
        enum: ['==', '!=', '>=', '<=', '>', '<', 'includes', 'startsWith', 'regex'],
        required: true,
    },
    value: { type: String, default: '' }, // compared after coercion
}, { _id: false });

const ruleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },

    trigger: {
        type: {
            type: String,
            required: true,
            enum: ['gift', 'like', 'follow', 'share', 'subscribe', 'chat', 'command', 'member', 'any'],
        },
        // Optional narrowing for gift triggers — match a specific gift by
        // id or name. Empty / '*' = any gift.
        giftId: { type: String, default: '' },
        giftName: { type: String, default: '' },
        // For 'command' triggers — the chat command word (without prefix),
        // e.g. "spin" matches "!spin ...". Prefix configurable.
        command: { type: String, default: '' },
        commandPrefix: { type: String, default: '!' },
    },

    // ALL conditions must pass (AND). Empty = always pass.
    conditions: { type: [conditionSchema], default: [] },

    // Viewer role gating. Empty or ['everyone'] = no restriction.
    // Roles are derived from the event payload where TikTok exposes them.
    roles: {
        type: [String],
        default: ['everyone'],
        // everyone | subscriber | moderator | topGifter | follower | newGifter
    },

    // Dual-layer rate limiting. 0 = no limit.
    cooldown: {
        globalMs: { type: Number, default: 0 },   // whole rule
        perUserMs: { type: Number, default: 0 },   // per triggering viewer
    },

    // For repeatable gift events: fire once per combo, or once per repeat.
    //   perGift = repeatCount times (capped), once = a single fire.
    combo: { type: String, enum: ['perGift', 'once'], default: 'once' },
    comboCap: { type: Number, default: 50 }, // safety cap for perGift

    // Actions to run, in order.
    actionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Action' }],

    // Runtime stats (handy for the UI + debugging).
    stats: {
        fireCount: { type: Number, default: 0 },
        lastFiredAt: { type: Date, default: null },
        lastUser: { type: String, default: '' },
    },

    // Ordering in the UI.
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

ruleSchema.index({ userId: 1, enabled: 1 });
ruleSchema.index({ userId: 1, 'trigger.type': 1 });

module.exports = mongoose.model('Rule', ruleSchema);
