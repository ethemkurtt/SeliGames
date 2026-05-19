const mongoose = require('mongoose');
const crypto = require('crypto');

const overlaySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    overlayId: {
        type: String,
        unique: true,
        default: () => crypto.randomBytes(12).toString('hex')
    },
    overlayType: {
        type: String,
        enum: ['goal', 'gift-alert', 'last-x', 'leaderboard', 'chart', 'chat', 'event-feed', 'subathon'],
        required: true
    },
    subType: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    style: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    currentValue: {
        type: Number,
        default: 0
    },
    targetValue: {
        type: Number,
        default: 0
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

overlaySchema.index({ userId: 1, overlayType: 1 });
overlaySchema.index({ isActive: 1 });

const Overlay = mongoose.model('Overlay', overlaySchema);
module.exports = Overlay;
