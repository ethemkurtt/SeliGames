const mongoose = require('mongoose');

const modUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    modId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mod',
        required: true
    },
    modTitle: {
        type: String,
        required: true,
        trim: true
    },
    totalInteractions: {
        type: Number,
        default: 0
    },
    giftCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index'ler
modUsageSchema.index({ userId: 1, modId: 1 }, { unique: true });
modUsageSchema.index({ userId: 1, lastUsed: -1 });

const ModUsage = mongoose.model('ModUsage', modUsageSchema);

module.exports = ModUsage;
