const mongoose = require('mongoose');
const crypto = require('crypto');

const goalSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['like', 'follow', 'share', 'gift', 'comment', 'custom'],
        required: true
    },
    targetValue: {
        type: Number,
        required: true,
        min: 1
    },
    currentValue: {
        type: Number,
        default: 0,
        min: 0
    },
    giftFilter: {
        type: String,
        trim: true
    },
    style: {
        barColor: { type: String, default: '#00ff9d' },
        backgroundColor: { type: String, default: 'rgba(0,0,0,0.6)' },
        textColor: { type: String, default: '#ffffff' },
        fontSize: { type: Number, default: 18 },
        borderRadius: { type: Number, default: 12 },
        showPercentage: { type: Boolean, default: true },
        showNumbers: { type: Boolean, default: true },
        animation: {
            type: String,
            enum: ['smooth', 'bounce', 'pulse', 'none'],
            default: 'smooth'
        },
        theme: {
            type: String,
            enum: ['neon', 'minimal', 'gaming', 'gradient', 'glass'],
            default: 'neon'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    resetOnComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

goalSchema.index({ userId: 1 });
goalSchema.index({ isActive: 1 });

goalSchema.pre('save', function (next) {
    if (this.currentValue >= this.targetValue && !this.isCompleted) {
        this.isCompleted = true;
        this.completedAt = new Date();
    }
    next();
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;
