const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Geçerli bir email adresi giriniz']
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    // Personal Information
    fullName: {
        type: String,
        trim: true
    },
    birthDate: {
        type: Date
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    profilePictureUrl: {
        type: String
    },
    // TikTok Integration
    tiktokUsername: {
        type: String,
        trim: true
    },
    isLive: {
        type: Boolean,
        default: false
    },
    // User Settings
    settings: {
        // General Settings
        autoUpdateMods: {
            type: Boolean,
            default: true
        },
        notifications: {
            type: Boolean,
            default: true
        },
        launchOnStartup: {
            type: Boolean,
            default: false
        },
        darkTheme: {
            type: Boolean,
            default: true
        },
        // TikTok Settings
        tiktokAutoConnect: {
            type: Boolean,
            default: false
        },
        tiktokEventLogging: {
            type: Boolean,
            default: true
        },
        tiktokSoundEffects: {
            type: Boolean,
            default: true
        },
        tiktokScreenNotifications: {
            type: Boolean,
            default: true
        },
        // Gift Sound Mappings (tier-based fallback)
        giftSounds: {
            small: {
                type: String,
                default: 'bell'
            },
            medium: {
                type: String,
                default: 'chime'
            },
            large: {
                type: String,
                default: 'fanfare'
            },
            epic: {
                type: String,
                default: 'victory'
            }
        },
        // Per-gift sound mapping — overrides tier-based giftSounds above.
        // Keyed by gift name. Each entry is either
        //   { preset: "coin" } → use one of the built-in synth sounds, or
        //   { mp3: "data:audio/mpeg;base64,…", volume: 0.8 } → custom uploaded MP3
        giftSoundMap: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // Per-mod gift→action mapping. Keyed by modId (string of ObjectId).
        // Each mod config: { installed: bool, installPath: string, giftActions: { [giftName]: { shortcut, type, value, enabled } } }
        // action types: 'keyboard' (Ctrl+1, Shift+A), 'text' (typed command), 'mouse' (left-click, right-click)
        modConfigs: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    // Subscription Information
    subscriptionPlan: {
        type: String,
        enum: ['free', 'basic', 'pro', 'ultra'],
        default: 'free'
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'trial'],
        default: 'active'
    },
    subscriptionStartDate: {
        type: Date
    },
    subscriptionEndDate: {
        type: Date
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'failed', 'none'],
        default: 'none'
    },
    autoRenew: {
        type: Boolean,
        default: false
    },
    trialUsed: {
        type: Boolean,
        default: false
    },
    totalPaymentsMade: {
        type: Number,
        default: 0
    },
    lastPaymentDate: {
        type: Date
    },
    nextBillingDate: {
        type: Date
    },
    // Activity Tracking
    lastLoginDate: {
        type: Date
    }
}, {
    timestamps: true // createdAt ve updatedAt otomatik eklenir
});

// Index'ler
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ tiktokUsername: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
