const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./src/database');
const authRoutes = require('./src/routes/auth');
const modRoutes = require('./src/routes/mods');
const statisticsRoutes = require('./src/routes/statistics');
const subscriptionRoutes = require('./src/routes/subscription');
const goalRoutes = require('./src/routes/goals');
const overlayRoutes = require('./src/routes/overlays');
const eventRoutes = require('./src/routes/events');
const giftRoutes = require('./src/routes/gifts');
const adminRoutes = require('./src/routes/admin');
const siteRoutes = require('./src/routes/site');
const proxyRoutes = require('./src/routes/proxy');
const automationRoutes = require('./src/routes/automation');
const loyaltyRoutes = require('./src/routes/loyalty');
const ruleEngine = require('./src/services/ruleEngine');
const Goal = require('./src/models/Goal');
const Overlay = require('./src/models/Overlay');
const Event = require('./src/models/Event');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
// 25mb (default was 100kb) — gift-sound MP3s and action media are embedded as
// base64 data-URIs inside the settings JSON; the tiny default caused HTTP 413.
app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ limit: '25mb', extended: true }));

// Serve uploaded mod cover images. Path matches what /api/mods/:id/image
// writes to Mod.imageUrl: "/uploads/mod-images/<modId>.<ext>".
const path = require('path');
const MOD_IMAGES_DIR = process.env.MOD_IMAGES_DIR || '/var/seligames/mod-images';
app.use('/uploads/mod-images', require('express').static(MOD_IMAGES_DIR, {
    maxAge: '1d',
    fallthrough: true,
}));

app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/mods', modRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/overlays', overlayRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/loyalty', loyaltyRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'SeliGames API is running' });
});

const userSessions = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('auth', (data) => {
        try {
            const { token } = data;
            const decoded = jwt.verify(token, SECRET_KEY);
            const userId = decoded.userId;

            socket.userId = userId;
            socket.join(`user:${userId}`);
            userSessions.set(socket.id, userId);

            console.log(`🔐 Socket ${socket.id} authenticated as user ${userId}`);
            socket.emit('auth-success', { userId });
        } catch (err) {
            console.error(`🔐 Auth failed for ${socket.id}:`, err.message);
            socket.emit('auth-error', { error: 'Geçersiz token' });
        }
    });

    socket.on('join-overlay', async (overlayId) => {
        socket.join(`overlay:${overlayId}`);
        console.log(`🎯 ${socket.id} joined overlay: ${overlayId}`);

        try {
            const overlay = await Overlay.findOne({ overlayId });
            if (overlay) {
                socket.join(`user:${overlay.userId}`);
                socket.overlayUserId = overlay.userId.toString();
                console.log(`🎯 Overlay ${overlayId} linked to user ${overlay.userId}`);
            }
        } catch (err) {
            console.error('Overlay lookup error:', err.message);
        }
    });

    socket.on('start-session', (data) => {
        const userId = socket.userId;
        if (!userId) return socket.emit('error', { error: 'Auth gerekli' });

        const sessionId = data?.sessionId || `session_${userId}_${Date.now()}`;
        socket.sessionId = sessionId;
        socket.join(`session:${sessionId}`);

        console.log(`🎬 Session started: ${sessionId} for user ${userId}`);
        socket.emit('session-started', { sessionId });
    });

    socket.on('tiktok-event', async (data) => {
        const userId = socket.userId;
        if (!userId) {
            console.warn(`⚠️ Unauthenticated tiktok-event from ${socket.id}`);
            return;
        }

        let { eventType, username, nickname, giftName, giftId, count = 1, diamondCount = 0, comment, likeCount = 0, viewerCount = 0, profilePicture, text } = data;

        // Normalize aliases — TikTok "comment" is the same semantic event as "chat".
        // Without this, Event.create throws (enum doesn't include 'comment')
        // and the rest of this handler is silently swallowed by the catch block.
        if (eventType === 'comment') eventType = 'chat';

        console.log(`📥 tiktok-event: type=${eventType} user=${username || nickname || '?'} count=${count} likeCount=${likeCount} gift=${giftName || '-'}`);

        try {
            const eventDoc = await Event.create({
                userId,
                eventType,
                tiktokUsername: username || nickname,
                sessionId: socket.sessionId || null,
                data: {
                    user: username,
                    nickname: nickname || username,
                    profilePicture,
                    comment: comment || text,
                    giftName,
                    giftId,
                    giftCount: count,
                    diamondCount,
                    likeCount,
                    viewerCount
                }
            });

            const userOverlays = await Overlay.find({ userId, isActive: true });

            for (const overlay of userOverlays) {
                const ot = overlay.overlayType;
                const st = overlay.subType;
                const typeMap = { like: 'likes', follow: 'follows', share: 'shares', gift: 'gifts', comment: 'comments', chat: 'comments', viewer: 'viewer_count', member: 'members' };
                const subTypeMatch = typeMap[eventType] || eventType;

                if (ot === 'goal' && st === subTypeMatch) {
                    // Atomic $inc avoids the fetch-modify-save race that loses concurrent
                    // increments (all reads see the same snapshot → last save wins → only
                    // 1 of N events counted). Counter is allowed to grow past target;
                    // the frontend caps the bar at 100% visually.
                    const updated = await Overlay.findOneAndUpdate(
                        { _id: overlay._id },
                        { $inc: { currentValue: count } },
                        { new: true }
                    );
                    if (updated) {
                        console.log(`   🎯 goal/${st} overlay ${overlay.overlayId} → ${updated.currentValue}/${updated.targetValue}`);
                        io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                            overlayId: overlay.overlayId,
                            currentValue: updated.currentValue,
                            targetValue: updated.targetValue
                        });
                    }
                }

                if ((ot === 'leaderboard' || ot === 'chart') && st === subTypeMatch) {
                    if (!overlay.data) overlay.data = {};
                    if (!overlay.data.items) overlay.data.items = [];
                    const existing = overlay.data.items.find(i => i.user === (username || nickname));
                    if (existing) { existing.score += count; }
                    else { overlay.data.items.push({ user: username || nickname, score: count }); }
                    overlay.data.items.sort((a, b) => b.score - a.score);
                    overlay.markModified('data');
                    await overlay.save();
                    io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                        overlayId: overlay.overlayId, data: overlay.data
                    });
                }

                if (ot === 'last-x' && st === subTypeMatch) {
                    // Atomic $push prevents concurrent events from stomping each other's
                    // items[] snapshot (same fetch-modify-save race as goal above).
                    const newItem = { user: username || nickname, time: Date.now(), gift: giftName, count };
                    const updated = await Overlay.findOneAndUpdate(
                        { _id: overlay._id },
                        { $push: { 'data.items': { $each: [newItem], $position: 0, $slice: 20 } } },
                        { new: true }
                    );
                    if (updated) {
                        io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                            overlayId: overlay.overlayId, data: updated.data
                        });
                    }
                }

                // ─── Wheel of Actions — gift triggers a weighted random spin ───
                if (ot === 'wheel' && eventType === 'gift') {
                    const triggerGift = (overlay.config?.triggerGift || '').trim();
                    const triggers = !triggerGift || triggerGift === '*' || triggerGift === giftName;
                    const slices = Array.isArray(overlay.config?.slices) ? overlay.config.slices : [];
                    if (triggers && slices.length > 0) {
                        const total = slices.reduce((s, sl) => s + Math.max(1, Number(sl.weight || 1)), 0);
                        let pick = Math.random() * total;
                        let winnerIdx = 0;
                        for (let i = 0; i < slices.length; i++) {
                            pick -= Math.max(1, Number(slices[i].weight || 1));
                            if (pick <= 0) { winnerIdx = i; break; }
                        }
                        const winner = slices[winnerIdx];
                        // Update lastSpin atomically so connected overlays animate
                        // to the same slice. spinId makes each animation unique.
                        const lastSpin = {
                            spinId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            winnerIdx,
                            winnerLabel: winner?.label || `#${winnerIdx + 1}`,
                            user: username || nickname,
                            giftName,
                            spinAt: Date.now(),
                        };
                        const updated = await Overlay.findOneAndUpdate(
                            { _id: overlay._id },
                            { $set: { 'data.lastSpin': lastSpin } },
                            { new: true }
                        );
                        if (updated) {
                            console.log(`   🎡 wheel ${overlay.overlayId} → "${winner?.label}" (by ${lastSpin.user})`);
                            io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                                overlayId: overlay.overlayId, data: updated.data
                            });
                        }
                    }
                }

                // ─── Subathon Timer — gift adds seconds to the countdown ───
                if (ot === 'subathon' && eventType === 'gift' && overlay.data?.isRunning) {
                    const perGift = overlay.config?.perGift || {};
                    const perCoin = Number(overlay.config?.perCoin || 0);
                    // Match by gift name first; fall back to coin-based rate.
                    const secondsPerUnit = perGift[giftName] ?? 0;
                    let addSeconds = 0;
                    if (secondsPerUnit > 0) {
                        addSeconds = secondsPerUnit * count;
                    } else if (perCoin > 0) {
                        addSeconds = perCoin * diamondCount;
                    }
                    if (addSeconds > 0) {
                        // endsAt stored as ISO string — push it forward atomically by
                        // converting to ms, adding, and writing back. Single document
                        // so the race is small but use $set after read for clarity.
                        const cur = overlay.data?.endsAt ? new Date(overlay.data.endsAt).getTime() : Date.now();
                        const newEnds = new Date(cur + addSeconds * 1000).toISOString();
                        const updated = await Overlay.findOneAndUpdate(
                            { _id: overlay._id },
                            {
                                $set: { 'data.endsAt': newEnds },
                                $inc: { 'data.addedTotal': addSeconds }
                            },
                            { new: true }
                        );
                        if (updated) {
                            console.log(`   ⏱️ subathon ${overlay.overlayId} +${addSeconds}s (${giftName} x${count})`);
                            io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                                overlayId: overlay.overlayId, data: updated.data
                            });
                        }
                    }
                }

                if (ot === 'gift-alert' && eventType === 'gift') {
                    if (!overlay.data) overlay.data = {};
                    const giftEntry = {
                        user: username || nickname,
                        name: giftName,
                        count,
                        icon: '🎁',
                        diamonds: diamondCount,
                        time: Date.now()
                    };
                    overlay.data.lastGift = giftEntry;   // alert bunu okur
                    // Hediye Şeridi (subType 'ticker') için son 30 hediyenin listesi.
                    overlay.data.recentGifts = [giftEntry, ...(overlay.data.recentGifts || [])].slice(0, 30);
                    overlay.markModified('data');
                    await overlay.save();
                    io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                        overlayId: overlay.overlayId, data: overlay.data
                    });
                }

                // Raw event stream — consumed by chat/event-feed feeds AND
                // the particle overlays (gift-cannon / like-fountain / emoji-rain).
                if (ot === 'chat' || ot === 'event-feed' || ot === 'gift-cannon' || ot === 'like-fountain' || ot === 'emoji-rain') {
                    const eventIcons = { like: '❤️', follow: '➕', share: '🔁', gift: '🎁', comment: '💬', chat: '💬', viewer: '👁️', member: '👋' };
                    io.to(`overlay:${overlay.overlayId}`).emit('tiktok-live-event', {
                        type: eventType === 'chat' || eventType === 'comment' ? 'chat' : 'event',
                        user: username || nickname,
                        text: (eventType === 'chat' || eventType === 'comment') ? (comment || text || '') : `${eventType}${giftName ? ' - ' + giftName : ''}`,
                        icon: eventIcons[eventType] || '📌',
                        eventType,
                        giftName,
                        giftId,
                        count,
                        diamondCount,
                        likeCount,
                        profilePicture
                    });
                }
            }

            const goals = await Goal.find({ userId, isActive: true, type: eventType });
            for (const goal of goals) {
                if (eventType === 'gift' && goal.giftFilter && goal.giftFilter !== giftName) continue;
                goal.currentValue = Math.min(goal.currentValue + count, goal.targetValue);
                await goal.save();
                io.to(`overlay:${goal.overlayId}`).emit('goal-update', {
                    overlayId: goal.overlayId,
                    currentValue: goal.currentValue,
                    targetValue: goal.targetValue,
                    isCompleted: goal.isCompleted,
                    eventType,
                    username: username || nickname
                });
            }

            io.to(`user:${userId}`).emit('event-processed', {
                eventId: eventDoc._id,
                eventType,
                username: username || nickname
            });

            // ─── Actions & Events engine ───────────────────────────────
            // Run the user's automation rules against this event. Fires
            // overlay/sound/tts actions (→ MyActions overlay) and OS-level
            // keyboard/launch actions (→ Electron client). Wrapped so a
            // rule error never breaks the core overlay pipeline above.
            try {
                await ruleEngine.evaluate({ ...data, userId, eventType }, { io });
            } catch (ruleErr) {
                console.error('RuleEngine error:', ruleErr.message);
            }

        } catch (error) {
            console.error('Event processing error:', error);
        }
    });

    socket.on('disconnect', () => {
        userSessions.delete(socket.id);
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔌 WebSocket ready`);
        });
    } catch (error) {
        console.error('❌ Server başlatılamadı:', error);
        process.exit(1);
    }
};

startServer();
