const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

// Aggregate's $match does NOT auto-cast userId string → ObjectId the way Find does.
// Always wrap req.userId before passing to an aggregation pipeline.
const asObjectId = (id) => new mongoose.Types.ObjectId(id);

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

router.get('/', auth, async (req, res) => {
    try {
        const { type, sessionId, limit = 50, offset = 0 } = req.query;
        const filter = { userId: req.userId };
        if (type) filter.eventType = type;
        if (sessionId) filter.sessionId = sessionId;

        const events = await Event.find(filter)
            .sort({ createdAt: -1 })
            .skip(Number(offset))
            .limit(Math.min(Number(limit), 200));

        const total = await Event.countDocuments(filter);
        res.json({ events, total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/stats', auth, async (req, res) => {
    try {
        const { sessionId } = req.query;
        const filter = { userId: asObjectId(req.userId) };
        if (sessionId) filter.sessionId = sessionId;

        const stats = await Event.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 },
                    totalDiamonds: { $sum: '$data.diamondCount' },
                    totalGiftCount: { $sum: '$data.giftCount' },
                    totalLikes: { $sum: '$data.likeCount' }
                }
            }
        ]);

        const result = {};
        stats.forEach(s => {
            result[s._id] = {
                count: s.count,
                totalDiamonds: s.totalDiamonds,
                totalGiftCount: s.totalGiftCount,
                totalLikes: s.totalLikes
            };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/sessions', auth, async (req, res) => {
    try {
        const sessions = await Event.aggregate([
            { $match: { userId: asObjectId(req.userId), sessionId: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$sessionId',
                    startedAt: { $min: '$createdAt' },
                    endedAt: { $max: '$createdAt' },
                    eventCount: { $sum: 1 },
                    types: { $addToSet: '$eventType' }
                }
            },
            { $sort: { startedAt: -1 } },
            { $limit: 50 }
        ]);

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/', auth, async (req, res) => {
    try {
        const { sessionId } = req.query;
        const filter = { userId: req.userId };
        if (sessionId) filter.sessionId = sessionId;

        const result = await Event.deleteMany(filter);
        res.json({ deleted: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
