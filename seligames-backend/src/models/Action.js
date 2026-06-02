const mongoose = require('mongoose');

/**
 * Action — a single, reusable "what happens" unit. Rules reference Actions
 * by id so one Action (e.g. "Play airhorn") can be fired from many Rules.
 *
 * Modelled after TikFinity's Actions, but richer:
 *   - overlay-alert : on-screen animated card (image/video/text) on the
 *                     user's MyActions browser source.
 *   - sound         : play a sound (preset key or uploaded mp3 url) on the
 *                     overlay's audio channel.
 *   - tts           : speak text (voice/rate/pitch) — synthesised by the
 *                     overlay using the Web Speech API.
 *   - keyboard      : OS-level keystroke in the streamer's focused game
 *                     (executed by the Electron client).
 *   - mouse / text  : OS-level mouse click / typed text (Electron).
 *   - launch        : run a command / .exe / steam URI (Electron).
 *   - points        : grant channel points to the triggering viewer.
 *   - wheel-spin     : spin a wheel overlay.
 *   - confetti / particles : fire a particle burst overlay.
 *   - chat          : send a chat message back to TikTok (future).
 */
const actionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        required: true,
        enum: [
            'overlay-alert', 'sound', 'tts', 'keyboard', 'mouse', 'text',
            'launch', 'points', 'wheel-spin', 'confetti', 'chat', 'media',
        ],
    },
    // Type-specific configuration. Kept as Mixed so each action type can
    // carry exactly what it needs without a sparse column explosion.
    //
    //  overlay-alert : { title, message, mediaUrl, mediaType:'image'|'video'|'gif',
    //                    durationMs, sound, animation:'pop'|'slide'|'bounce',
    //                    accentColor, textColor }
    //  sound         : { preset?, mp3Url?, volume }
    //  tts           : { voice, text, rate, pitch, volume }
    //  keyboard      : { value }  e.g. "Shift+F2"  (matches Electron parseShortcut)
    //  mouse         : { value }  e.g. "leftclick"
    //  text          : { value }
    //  launch        : { command, cwd? }
    //  points        : { amount }
    //  wheel-spin    : { wheelOverlayId? }   (target wheel; default = any active wheel)
    //  confetti      : { overlayTarget?, colors?, intensity }
    //  media         : { mediaUrl, mediaType, durationMs }
    config: { type: mongoose.Schema.Types.Mixed, default: {} },

    enabled: { type: Boolean, default: true },
}, { timestamps: true });

actionSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Action', actionSchema);
