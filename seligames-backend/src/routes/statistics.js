const express = require('express');
const jwt = require('jsonwebtoken');
const ModUsage = require('../models/ModUsage');

const router = express.Router();
const SECRET_KEY = 'super_secret_key_for_seligames';

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get user statistics
router.get('/', verifyToken, async (req, res) => {
    try {
        const stats = await ModUsage.find({ userId: req.userId })
            .sort({ lastUsed: -1 })
            .populate('modId', 'title imageUrl');

        const totalInteractions = stats.reduce((sum, stat) => sum + stat.totalInteractions, 0);
        const totalGifts = stats.reduce((sum, stat) => sum + stat.giftCount, 0);
        const totalComments = stats.reduce((sum, stat) => sum + stat.commentCount, 0);
        const totalLikes = stats.reduce((sum, stat) => sum + stat.likeCount, 0);

        res.json({
            mods: stats,
            summary: {
                totalMods: stats.length,
                totalInteractions,
                totalGifts,
                totalComments,
                totalLikes
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Record mod usage (simulated for now)
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { modId, modTitle, interactions } = req.body;

        let usage = await ModUsage.findOne({
            userId: req.userId,
            modId: modId
        });

        if (usage) {
            usage.totalInteractions += interactions.total || 0;
            usage.giftCount += interactions.gifts || 0;
            usage.commentCount += interactions.comments || 0;
            usage.likeCount += interactions.likes || 0;
            usage.lastUsed = new Date();
            await usage.save();
        } else {
            usage = await ModUsage.create({
                userId: req.userId,
                modId,
                modTitle,
                totalInteractions: interactions.total || 0,
                giftCount: interactions.gifts || 0,
                commentCount: interactions.comments || 0,
                likeCount: interactions.likes || 0
            });
        }

        res.json({ message: 'Usage recorded', usage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
