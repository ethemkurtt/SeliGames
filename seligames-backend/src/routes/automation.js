const express = require('express');
const jwt = require('jsonwebtoken');
const Action = require('../models/Action');
const Rule = require('../models/Rule');
const ruleEngine = require('../services/ruleEngine');
const mcrcon = require('../services/mcrcon');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        const dec = jwt.verify(token, SECRET_KEY);
        req.userId = dec.userId;
        req.userRole = dec.role || 'user';
        next();
    } catch {
        return res.status(401).json({ error: 'Geçersiz token' });
    }
}

// ════════════════════════ ACTIONS ════════════════════════
router.get('/actions', auth, async (req, res) => {
    try {
        const actions = await Action.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(actions);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/actions', auth, async (req, res) => {
    try {
        const { name, type, config, enabled } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'name ve type gerekli' });
        const action = await Action.create({
            userId: req.userId, name, type, config: config || {}, enabled: enabled !== false,
        });
        res.status(201).json(action);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/actions/:id', auth, async (req, res) => {
    try {
        const { name, type, config, enabled } = req.body;
        const patch = {};
        if (name !== undefined) patch.name = name;
        if (type !== undefined) patch.type = type;
        if (config !== undefined) patch.config = config;
        if (enabled !== undefined) patch.enabled = enabled;
        const action = await Action.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId }, patch, { new: true }
        );
        if (!action) return res.status(404).json({ error: 'Bulunamadı' });
        res.json(action);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/actions/:id', auth, async (req, res) => {
    try {
        const action = await Action.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!action) return res.status(404).json({ error: 'Bulunamadı' });
        // Detach from any rules that referenced it.
        await Rule.updateMany(
            { userId: req.userId, actionIds: action._id },
            { $pull: { actionIds: action._id } }
        );
        res.json({ message: 'Silindi' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fire a single action immediately (test button in the UI).
router.post('/actions/:id/test', auth, async (req, res) => {
    try {
        const action = await Action.findOne({ _id: req.params.id, userId: req.userId });
        if (!action) return res.status(404).json({ error: 'Bulunamadı' });
        const io = req.app.get('io');
        if (!io) return res.status(500).json({ error: 'socket yok' });
        // Reuse the engine's dispatch by simulating a minimal event.
        const fakeEvent = {
            userId: req.userId, eventType: action.type === 'keyboard' ? 'gift' : 'gift',
            username: 'Test', nickname: 'Test', giftName: 'Test', count: 1,
        };
        // Build a one-off rule-less dispatch:
        const ev = ruleEngine.normalizeEvent(fakeEvent);
        // Inline minimal dispatch (mirrors engine.dispatchAction visibility).
        const ELECTRON = new Set(['keyboard', 'mouse', 'text', 'launch']);
        const room = `user:${req.userId}`;
        if (action.type === 'minecraft') {
            const cmd = (action.config?.command || '').toString();
            try {
                const resp = await mcrcon.sendCommand(cmd);
                return res.json({ message: 'Minecraft komutu çalıştı', actionType: 'minecraft', command: cmd, response: String(resp).trim() });
            } catch (e) {
                return res.status(502).json({ error: 'RCON: ' + e.message });
            }
        }
        if (ELECTRON.has(action.type)) {
            io.to(room).emit('execute-action', {
                actionType: action.type, type: action.type,
                value: action.config?.value, command: action.config?.command,
                cwd: action.config?.cwd, repeatCount: action.config?.repeatCount || 1,
            });
        } else {
            io.to(room).emit('action-fire', {
                actionId: String(action._id), actionType: action.type, name: action.name,
                config: action.config || {}, context: { user: 'Test', nickname: 'Test' },
                fireId: `test-${Date.now()}`,
            });
        }
        res.json({ message: 'Test gönderildi', actionType: action.type });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ RULES ════════════════════════
router.get('/rules', auth, async (req, res) => {
    try {
        const rules = await Rule.find({ userId: req.userId })
            .sort({ sortOrder: 1, createdAt: 1 })
            .populate('actionIds', 'name type config enabled');
        res.json(rules);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rules', auth, async (req, res) => {
    try {
        const b = req.body;
        if (!b.name || !b.trigger?.type) return res.status(400).json({ error: 'name ve trigger.type gerekli' });
        const rule = await Rule.create({
            userId: req.userId,
            name: b.name,
            enabled: b.enabled !== false,
            trigger: b.trigger,
            conditions: b.conditions || [],
            roles: b.roles && b.roles.length ? b.roles : ['everyone'],
            cooldown: b.cooldown || { globalMs: 0, perUserMs: 0 },
            combo: b.combo || 'once',
            comboCap: b.comboCap || 50,
            actionIds: b.actionIds || [],
            pointsCost: Math.max(0, Number(b.pointsCost) || 0),
            sortOrder: b.sortOrder || 0,
        });
        res.status(201).json(rule);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/rules/:id', auth, async (req, res) => {
    try {
        const allowed = ['name', 'enabled', 'trigger', 'conditions', 'roles', 'cooldown', 'combo', 'comboCap', 'actionIds', 'pointsCost', 'sortOrder'];
        const patch = {};
        for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
        const rule = await Rule.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId }, patch, { new: true }
        );
        if (!rule) return res.status(404).json({ error: 'Bulunamadı' });
        res.json(rule);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/rules/:id', auth, async (req, res) => {
    try {
        const rule = await Rule.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!rule) return res.status(404).json({ error: 'Bulunamadı' });
        res.json({ message: 'Silindi' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ TEST-FIRE ════════════════════════
// Simulate a TikTok event server-side and run it through the engine.
// Lets the user verify their whole rule set without a live stream.
router.post('/test-event', auth, async (req, res) => {
    try {
        const io = req.app.get('io');
        if (!io) return res.status(500).json({ error: 'socket yok' });
        const payload = { ...req.body, userId: req.userId };
        const result = await ruleEngine.evaluate(payload, { io });
        res.json({ message: 'Event işlendi', ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ MINECRAFT (RCON) ════════════════════════
// Status of the SeliGames Minecraft server + a live player ping.
router.get('/minecraft/status', auth, async (req, res) => {
    const st = mcrcon.status();
    let online = false, players = '';
    try { players = String(await mcrcon.sendCommand('list')).trim(); online = true; } catch (_) {}
    res.json({ ...st, online, players, joinHost: process.env.MC_PUBLIC_HOST || '187.124.29.94', joinPort: 25565 });
});

// Run an ad-hoc console command. Admin-only — this is a raw RCON console on
// the shared server; normal rule/test paths go through the denylisted action
// dispatch instead. (mcrcon also blocks destructive verbs as a backstop.)
router.post('/minecraft/run', auth, async (req, res) => {
    if (req.userRole !== 'admin') return res.status(403).json({ error: 'Sadece admin' });
    const cmd = (req.body?.command || '').toString();
    if (!cmd.trim()) return res.status(400).json({ error: 'command gerekli' });
    try {
        const resp = await mcrcon.sendCommand(cmd);
        res.json({ ok: true, command: cmd, response: String(resp).trim() });
    } catch (e) { res.status(502).json({ error: 'RCON: ' + e.message }); }
});

// Public read for the Interaction Slider overlay: returns the user's
// gift→action mapping (derived from rules with gift triggers) so the
// slider can render "this gift does X" without auth.
router.get('/slider/:userId', async (req, res) => {
    try {
        const rules = await Rule.find({
            userId: req.params.userId, enabled: true, 'trigger.type': 'gift',
        }).populate('actionIds', 'name type config').lean();
        const items = rules.map((r) => ({
            giftId: r.trigger.giftId || '',
            giftName: r.trigger.giftName || '',
            label: r.name,
            actions: (r.actionIds || []).map((a) => ({ type: a.type, name: a.name })),
        })).filter((i) => i.giftName || i.giftId);
        res.json({ items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
