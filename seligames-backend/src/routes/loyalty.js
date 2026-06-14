const express = require('express');
const jwt = require('jsonwebtoken');
const ViewerPoints = require('../models/ViewerPoints');
const LoyaltyConfig = require('../models/LoyaltyConfig');
const loyalty = require('../services/loyalty');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try { req.userId = jwt.verify(token, SECRET_KEY).userId; next(); }
    catch { return res.status(401).json({ error: 'Geçersiz token' }); }
}

// ── Config ───────────────────────────────────────────────────────────────
router.get('/config', auth, async (req, res) => {
    try { res.json(await loyalty.getConfig(req.userId)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/config', auth, async (req, res) => {
    try {
        const b = req.body || {};
        const update = {};
        if (b.enabled != null) update.enabled = !!b.enabled;
        if (b.pointsName != null) update.pointsName = String(b.pointsName).slice(0, 24) || 'Puan';
        if (b.earn && typeof b.earn === 'object') {
            update.earn = {};
            for (const k of ['perChat', 'perLike', 'likeCap', 'perFollow', 'perShare', 'perGiftCoin', 'perMinute']) {
                if (b.earn[k] != null) update.earn[k] = Math.max(0, Number(b.earn[k]) || 0);
            }
        }
        const doc = await LoyaltyConfig.findOneAndUpdate(
            { userId: req.userId }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();
        loyalty.invalidate(req.userId);
        res.json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Leaderboard (app, authed) ─────────────────────────────────────────────
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const limit = Math.min(100, Number(req.query.limit) || 25);
        const sort = req.query.by === 'lifetime' ? { totalEarned: -1 } : { points: -1 };
        const rows = await ViewerPoints.find({ userId: req.userId }).sort(sort).limit(limit).lean();
        res.json({ items: rows.map((r, i) => ({ rank: i + 1, viewer: r.viewer, nickname: r.nickname, points: r.points, totalEarned: r.totalEarned })) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Public leaderboard (overlay, no auth — overlays load in OBS) ──────────
router.get('/leaderboard/:userId', async (req, res) => {
    try {
        const limit = Math.min(50, Number(req.query.limit) || 10);
        const rows = await ViewerPoints.find({ userId: req.params.userId }).sort({ points: -1 }).limit(limit).lean();
        res.json({ items: rows.map((r, i) => ({ rank: i + 1, user: r.nickname || r.viewer, score: r.points })) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Manual adjust + lookup ────────────────────────────────────────────────
router.post('/adjust', auth, async (req, res) => {
    try {
        const { viewer, delta, nickname } = req.body || {};
        if (!viewer || delta == null) return res.status(400).json({ error: 'viewer ve delta gerekli' });
        const doc = await loyalty.adjust(req.userId, String(viewer).trim(), Number(delta) || 0, nickname);
        const io = req.app.get('io');
        if (io) io.to(`user:${req.userId}`).emit('points-update', { viewer: doc.viewer, nickname: doc.nickname, points: doc.points, delta: Number(delta) || 0 });
        res.json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/viewer/:viewer', auth, async (req, res) => {
    try {
        const doc = await ViewerPoints.findOne({ userId: req.userId, viewer: req.params.viewer }).lean();
        res.json(doc || { viewer: req.params.viewer, points: 0, totalEarned: 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Total stats (for the app header)
router.get('/stats', auth, async (req, res) => {
    try {
        const agg = await ViewerPoints.aggregate([
            { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(String(req.userId)) } },
            { $group: { _id: null, viewers: { $sum: 1 }, totalPoints: { $sum: '$points' } } },
        ]);
        res.json(agg[0] ? { viewers: agg[0].viewers, totalPoints: agg[0].totalPoints } : { viewers: 0, totalPoints: 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
