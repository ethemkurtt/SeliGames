const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    eventType: {
        type: String,
        enum: ['chat', 'gift', 'like', 'follow', 'share', 'member', 'viewer', 'subscribe'],
        required: true
    },
    tiktokUsername: {
        type: String,
        trim: true
    },
    data: {
        user: String,
        nickname: String,
        profilePicture: String,
        comment: String,
        giftName: String,
        giftId: String,
        giftCount: { type: Number, default: 1 },
        diamondCount: { type: Number, default: 0 },
        likeCount: { type: Number, default: 0 },
        viewerCount: { type: Number, default: 0 }
    },
    sessionId: {
        type: String,
        index: true
    }
}, {
    timestamps: true
});

eventSchema.index({ userId: 1, eventType: 1 });
eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ sessionId: 1, createdAt: -1 });

eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
