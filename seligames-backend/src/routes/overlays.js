const express = require('express');
const jwt = require('jsonwebtoken');
const Overlay = require('../models/Overlay');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        req.userId = jwt.verify(token, SECRET_KEY).userId;
        next();
    } catch {
        return res.status(401).json({ error: 'Geçersiz token' });
    }
}

// Public: get overlay data for OBS rendering
router.get('/render/:overlayId', async (req, res) => {
    try {
        const overlay = await Overlay.findOne({ overlayId: req.params.overlayId });
        if (!overlay) return res.status(404).json({ error: 'Overlay bulunamadı' });
        res.json(overlay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public: serve overlay HTML page for OBS browser source
router.get('/page/:overlayId', async (req, res) => {
    try {
        const overlay = await Overlay.findOne({ overlayId: req.params.overlayId });
        if (!overlay) return res.status(404).send('Overlay not found');
        res.send(generateOverlayHTML(overlay, req));
    } catch (error) {
        res.status(500).send('Error');
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const filter = { userId: req.userId };
        if (req.query.type) filter.overlayType = req.query.type;
        if (req.query.subType) filter.subType = req.query.subType;
        const overlays = await Overlay.find(filter).sort({ createdAt: -1 });
        res.json(overlays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOne({ _id: req.params.id, userId: req.userId });
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });
        res.json(overlay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const overlay = await Overlay.create({ ...req.body, userId: req.userId });
        res.status(201).json(overlay);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });

        const io = req.app.get('io');
        if (io) {
            io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                overlayId: overlay.overlayId,
                ...overlay.toObject()
            });
        }
        res.json(overlay);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/:id/increment', auth, async (req, res) => {
    try {
        const { amount = 1 } = req.body;
        const overlay = await Overlay.findOne({ _id: req.params.id, userId: req.userId });
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });

        overlay.currentValue = Math.min(overlay.currentValue + amount, overlay.targetValue || Infinity);
        await overlay.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                overlayId: overlay.overlayId,
                currentValue: overlay.currentValue,
                targetValue: overlay.targetValue
            });
        }
        res.json(overlay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Subathon Timer controls ────────────────────────────────────────────
// All three endpoints write to overlay.data and emit overlay-update so any
// connected OBS browser source picks up the change in real time.

// Start (or restart): set endsAt = now + (startSeconds | remaining), isRunning=true
router.post('/:id/subathon/start', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOne({ _id: req.params.id, userId: req.userId });
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });
        if (overlay.overlayType !== 'subathon') return res.status(400).json({ error: 'Subathon değil' });

        const startSec = Number(overlay.config?.startSeconds || 0);
        const pausedRem = Number(overlay.data?.pausedRemaining || 0);
        const seedSec = pausedRem > 0 ? pausedRem : startSec;
        if (seedSec <= 0) return res.status(400).json({ error: 'startSeconds 0' });

        const endsAt = new Date(Date.now() + seedSec * 1000).toISOString();
        overlay.data = {
            ...(overlay.data || {}),
            isRunning: true,
            endsAt,
            pausedRemaining: null,
            startedAt: new Date().toISOString(),
            addedTotal: overlay.data?.addedTotal || 0,
        };
        overlay.markModified('data');
        await overlay.save();

        const io = req.app.get('io');
        if (io) io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', { overlayId: overlay.overlayId, data: overlay.data });
        res.json(overlay);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Pause: freeze the remaining time
router.post('/:id/subathon/pause', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOne({ _id: req.params.id, userId: req.userId });
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });
        if (overlay.overlayType !== 'subathon') return res.status(400).json({ error: 'Subathon değil' });

        const endsAtMs = overlay.data?.endsAt ? new Date(overlay.data.endsAt).getTime() : 0;
        const remaining = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
        overlay.data = { ...(overlay.data || {}), isRunning: false, pausedRemaining: remaining, endsAt: null };
        overlay.markModified('data');
        await overlay.save();

        const io = req.app.get('io');
        if (io) io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', { overlayId: overlay.overlayId, data: overlay.data });
        res.json(overlay);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Reset: clear all timer state
router.post('/:id/subathon/reset', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId, overlayType: 'subathon' },
            { data: { isRunning: false, endsAt: null, pausedRemaining: null, addedTotal: 0 } },
            { new: true }
        );
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });
        const io = req.app.get('io');
        if (io) io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', { overlayId: overlay.overlayId, data: overlay.data });
        res.json(overlay);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Wheel of Actions: manual / test spin — picks weighted random slice and
// broadcasts so connected overlays animate.
router.post('/:id/wheel/spin', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOne({ _id: req.params.id, userId: req.userId });
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });
        if (overlay.overlayType !== 'wheel') return res.status(400).json({ error: 'Wheel değil' });
        const slices = Array.isArray(overlay.config?.slices) ? overlay.config.slices : [];
        if (slices.length === 0) return res.status(400).json({ error: 'Dilim yok' });

        const total = slices.reduce((s, sl) => s + Math.max(1, Number(sl.weight || 1)), 0);
        let pick = Math.random() * total;
        let winnerIdx = 0;
        for (let i = 0; i < slices.length; i++) {
            pick -= Math.max(1, Number(slices[i].weight || 1));
            if (pick <= 0) { winnerIdx = i; break; }
        }
        const winner = slices[winnerIdx];
        const lastSpin = {
            spinId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            winnerIdx,
            winnerLabel: winner?.label || `#${winnerIdx + 1}`,
            user: 'Test',
            giftName: 'manual',
            spinAt: Date.now(),
        };
        overlay.data = { ...(overlay.data || {}), lastSpin };
        overlay.markModified('data');
        await overlay.save();

        const io = req.app.get('io');
        if (io) io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', { overlayId: overlay.overlayId, data: overlay.data });
        res.json(overlay);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/reset', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { currentValue: 0, data: {} },
            { new: true }
        );
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });

        const io = req.app.get('io');
        if (io) {
            io.to(`overlay:${overlay.overlayId}`).emit('overlay-update', {
                overlayId: overlay.overlayId,
                currentValue: 0,
                data: {}
            });
        }
        res.json(overlay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const overlay = await Overlay.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!overlay) return res.status(404).json({ error: 'Bulunamadı' });
        res.json({ message: 'Silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function generateOverlayHTML(overlay, req) {
    const wsUrl = `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}`;
    const s = overlay.style || {};
    const c = overlay.config || {};

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;overflow:hidden;font-family:'Inter','Segoe UI',sans-serif}
#overlay{display:flex;align-items:center;justify-content:center;width:100vw;height:100vh}

.goal-container{padding:16px 20px;border-radius:${s.borderRadius||12}px;min-width:320px;max-width:600px;
background:${s.theme==='glass'?'rgba(255,255,255,0.08)':s.theme==='gradient'?`linear-gradient(135deg,${s.barColor||'#00ff9d'}22,${s.barColor||'#00ff9d'}08)`:s.backgroundColor||'rgba(0,0,0,0.6)'};
${s.theme==='glass'?'backdrop-filter:blur(24px);':''}
border:${s.theme==='neon'?`1px solid ${s.barColor||'#00ff9d'}44`:s.theme==='gaming'?`2px solid ${s.barColor||'#00ff9d'}66`:'1px solid rgba(255,255,255,0.08)'};
${s.theme==='neon'?`box-shadow:0 0 20px ${s.barColor||'#00ff9d'}33,inset 0 0 20px ${s.barColor||'#00ff9d'}11;`:''}}

.goal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.goal-title{color:${s.textColor||'#fff'};font-size:${s.fontSize||18}px;font-weight:700;
${s.theme==='neon'?`text-shadow:0 0 8px ${s.barColor||'#00ff9d'}66;`:''}
${s.theme==='gaming'?'letter-spacing:1px;text-transform:uppercase;':''}}
.goal-numbers{color:${s.barColor||'#00ff9d'};font-size:${(s.fontSize||18)*0.75}px;font-weight:600;font-variant-numeric:tabular-nums;
${s.theme==='neon'?`text-shadow:0 0 6px ${s.barColor||'#00ff9d'}88;`:''}}

.bar-track{height:${s.theme==='gaming'?28:22}px;border-radius:${s.borderRadius||12}px;
background:${s.theme==='glass'?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.08)'};overflow:hidden;position:relative}
.bar-fill{height:100%;border-radius:${s.borderRadius||12}px;
background:linear-gradient(90deg,${s.barColor||'#00ff9d'},${s.barColor||'#00ff9d'}cc);
${s.theme==='neon'?`box-shadow:0 0 16px ${s.barColor||'#00ff9d'}88,0 0 4px ${s.barColor||'#00ff9d'};`:`box-shadow:0 0 8px ${s.barColor||'#00ff9d'}44;`}
transition:${s.animation==='smooth'?'width 1s cubic-bezier(0.4,0,0.2,1)':s.animation==='bounce'?'width 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)':'width 0.3s ease'};position:relative}
.bar-pct{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:12px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,0.9)}
.shimmer{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent,${s.barColor||'#00ff9d'}44,transparent);background-size:200% 100%;animation:shimmer 2s linear infinite}
.completed{text-align:center;margin-top:8px;color:${s.barColor||'#00ff9d'};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-shadow:0 0 10px ${s.barColor||'#00ff9d'}88}

.gift-alert{text-align:center;animation:giftIn 0.5s ease}
.gift-alert .gift-icon{font-size:${c.iconSize||64}px;margin-bottom:12px}
.gift-alert .gift-user{color:${s.textColor||'#fff'};font-size:${s.fontSize||20}px;font-weight:700;margin-bottom:4px}
.gift-alert .gift-name{color:${s.barColor||'#00ff9d'};font-size:${(s.fontSize||20)*0.8}px;font-weight:600}

.last-x-container{padding:16px 20px;border-radius:${s.borderRadius||12}px;min-width:280px;
background:${s.backgroundColor||'rgba(0,0,0,0.6)'};border:1px solid ${s.barColor||'#00ff9d'}44}
.last-x-label{color:${s.barColor||'#00ff9d'};font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px}
.last-x-value{color:${s.textColor||'#fff'};font-size:${s.fontSize||24}px;font-weight:700}

.leaderboard{padding:16px 20px;border-radius:${s.borderRadius||12}px;min-width:300px;
background:${s.backgroundColor||'rgba(0,0,0,0.6)'};border:1px solid ${s.barColor||'#00ff9d'}44}
.lb-title{color:${s.barColor||'#00ff9d'};font-size:14px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:12px}
.lb-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
.lb-rank{color:${s.barColor||'#00ff9d'};font-size:18px;font-weight:700;width:28px;text-align:center}
.lb-name{color:${s.textColor||'#fff'};font-size:15px;font-weight:600;flex:1}
.lb-score{color:${s.barColor||'#00ff9d'};font-size:15px;font-weight:700}

.chat-container{padding:12px;border-radius:${s.borderRadius||12}px;min-width:320px;max-width:400px;max-height:500px;overflow-y:auto;
background:${s.backgroundColor||'rgba(0,0,0,0.6)'};border:1px solid rgba(255,255,255,0.08)}
.chat-msg{padding:6px 0;display:flex;gap:8px}
.chat-user{color:${s.barColor||'#00ff9d'};font-weight:700;font-size:14px}
.chat-text{color:${s.textColor||'#fff'};font-size:14px}

@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes giftIn{0%{opacity:0;transform:scale(0.5)}100%{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes celebrate{0%,100%{filter:brightness(1)}50%{filter:brightness(1.3)}}
</style>
<script src="/socket.io/socket.io.js"></script>
</head><body>
<div id="overlay"></div>
<script>
const OVERLAY_ID = '${overlay.overlayId}';
const OVERLAY_TYPE = '${overlay.overlayType}';
const USER_ID = '${overlay.userId}';
const WS_URL = '${wsUrl}';
let overlayData = ${JSON.stringify(overlay.toObject())};

const socket = io(WS_URL, {transports:['websocket','polling']});
socket.on('connect', () => {
    socket.emit('join-overlay', OVERLAY_ID);
    console.log('Connected to overlay:', OVERLAY_ID, 'for user:', USER_ID);
});

socket.on('overlay-update', (data) => {
    if(data.overlayId === OVERLAY_ID) {
        Object.assign(overlayData, data);
        render();
    }
});

socket.on('tiktok-live-event', (data) => {
    if(OVERLAY_TYPE === 'chat' || OVERLAY_TYPE === 'event-feed') {
        handleLiveEvent(data);
    }
});

function render() {
    const el = document.getElementById('overlay');
    const s = overlayData.style || {};
    const c = overlayData.config || {};
    const d = overlayData.data || {};

    if(OVERLAY_TYPE === 'goal') {
        const pct = overlayData.targetValue > 0 ? Math.min((overlayData.currentValue / overlayData.targetValue) * 100, 100) : 0;
        const done = overlayData.currentValue >= overlayData.targetValue && overlayData.targetValue > 0;
        el.innerHTML = '<div class="goal-container"' + (done?' style="animation:celebrate 2s ease infinite"':'') + '>' +
            '<div class="goal-header">' +
                '<div class="goal-title">' + (overlayData.title||'Goal') + '</div>' +
                (s.showNumbers!==false ? '<div class="goal-numbers">' + overlayData.currentValue.toLocaleString() + ' / ' + overlayData.targetValue.toLocaleString() + '</div>' : '') +
            '</div>' +
            '<div class="bar-track">' +
                '<div class="bar-fill" style="width:'+pct+'%">' +
                    (s.theme==='neon'?'<div class="shimmer"></div>':'') +
                '</div>' +
                (s.showPercentage!==false ? '<div class="bar-pct">'+pct.toFixed(0)+'%</div>' : '') +
            '</div>' +
            (done?'<div class="completed">TAMAMLANDI!</div>':'') +
        '</div>';
    }
    else if(OVERLAY_TYPE === 'gift-alert') {
        const g = d.lastGift;
        if(g) {
            el.innerHTML = '<div class="gift-alert">' +
                '<div class="gift-icon">' + (g.icon||'🎁') + '</div>' +
                '<div class="gift-user">' + (g.user||'') + '</div>' +
                '<div class="gift-name">' + (g.name||'') + (g.count>1?' x'+g.count:'') + '</div>' +
            '</div>';
            if(c.duration) setTimeout(()=>{el.innerHTML='';}, (c.duration||5)*1000);
        } else { el.innerHTML = ''; }
    }
    else if(OVERLAY_TYPE === 'last-x') {
        const items = d.items || [];
        const last = items[0];
        el.innerHTML = '<div class="last-x-container">' +
            '<div class="last-x-label">' + (overlayData.title||'Last') + '</div>' +
            '<div class="last-x-value">' + (last?.user || 'Bekleniyor...') + '</div>' +
        '</div>';
    }
    else if(OVERLAY_TYPE === 'leaderboard') {
        const items = (d.items || []).slice(0, c.maxItems || 5);
        let rows = '';
        items.forEach((item, i) => {
            const medals = ['👑','🥈','🥉'];
            rows += '<div class="lb-row"><div class="lb-rank">'+(medals[i]||(i+1))+'</div><div class="lb-name">'+item.user+'</div><div class="lb-score">'+item.score+'</div></div>';
        });
        el.innerHTML = '<div class="leaderboard"><div class="lb-title">'+(overlayData.title||'Leaderboard')+'</div>'+rows+'</div>';
    }
    else if(OVERLAY_TYPE === 'chart') {
        const items = (d.items || []).slice(0, c.maxItems || 5);
        let rows = '';
        items.forEach((item, i) => {
            const maxScore = items[0]?.score || 1;
            const w = (item.score / maxScore) * 100;
            rows += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="color:'+(s.textColor||'#fff')+';font-size:13px;font-weight:600;width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+item.user+'</div><div style="flex:1;height:20px;border-radius:10px;background:rgba(255,255,255,0.08);overflow:hidden"><div style="width:'+w+'%;height:100%;border-radius:10px;background:linear-gradient(90deg,'+(s.barColor||'#00ff9d')+','+(s.barColor||'#00ff9d')+'cc);transition:width 0.5s ease"></div></div><div style="color:'+(s.barColor||'#00ff9d')+';font-size:13px;font-weight:700;width:50px;text-align:right">'+item.score+'</div></div>';
        });
        el.innerHTML = '<div class="leaderboard"><div class="lb-title">'+(overlayData.title||'Chart')+'</div>'+rows+'</div>';
    }
    else if(OVERLAY_TYPE === 'chat') {
        const msgs = (d.messages || []).slice(-(c.maxMessages||20));
        let html = '';
        msgs.forEach(m => {
            html += '<div class="chat-msg"><span class="chat-user">'+m.user+':</span><span class="chat-text">'+m.text+'</span></div>';
        });
        el.innerHTML = '<div class="chat-container" id="chatBox">'+html+'</div>';
        const box = document.getElementById('chatBox');
        if(box) box.scrollTop = box.scrollHeight;
    }
    else if(OVERLAY_TYPE === 'event-feed') {
        const events = (d.events || []).slice(-(c.maxEvents||15));
        let html = '';
        events.forEach(e => {
            html += '<div style="padding:6px 0;display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="font-size:16px">'+(e.icon||'📌')+'</span><span style="color:'+(s.textColor||'#fff')+';font-size:14px"><b style="color:'+(s.barColor||'#00ff9d')+'">'+e.user+'</b> '+e.text+'</span></div>';
        });
        el.innerHTML = '<div class="chat-container">'+html+'</div>';
    }
}

function handleLiveEvent(data) {
    if(!overlayData.data) overlayData.data = {};
    if(OVERLAY_TYPE === 'chat' && data.type === 'chat') {
        if(!overlayData.data.messages) overlayData.data.messages = [];
        overlayData.data.messages.push({user: data.user, text: data.text, time: Date.now()});
        if(overlayData.data.messages.length > 50) overlayData.data.messages.shift();
        render();
    }
    if(OVERLAY_TYPE === 'event-feed') {
        if(!overlayData.data.events) overlayData.data.events = [];
        overlayData.data.events.push({icon: data.icon||'📌', user: data.user||'?', text: data.text||'', time: Date.now()});
        if(overlayData.data.events.length > 30) overlayData.data.events.shift();
        render();
    }
}

render();
</script></body></html>`;
}

module.exports = router;
