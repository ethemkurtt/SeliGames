const express = require('express');
const jwt = require('jsonwebtoken');
const Goal = require('../models/Goal');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ error: 'Geçersiz token' });
    }
}

// Public endpoint - MUST be before /:id to avoid route conflict
router.get('/overlay/:overlayId', async (req, res) => {
    try {
        const goal = await Goal.findOne({ overlayId: req.params.overlayId });
        if (!goal) return res.status(404).json({ error: 'Overlay bulunamadı' });
        res.json({
            title: goal.title,
            type: goal.type,
            targetValue: goal.targetValue,
            currentValue: goal.currentValue,
            isCompleted: goal.isCompleted,
            isActive: goal.isActive,
            style: goal.style
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
        if (!goal) return res.status(404).json({ error: 'Goal bulunamadı' });
        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, type, targetValue, giftFilter, style } = req.body;
        if (!title || !type || !targetValue) {
            return res.status(400).json({ error: 'title, type ve targetValue zorunludur' });
        }

        const goal = await Goal.create({
            userId: req.userId,
            title,
            type,
            targetValue,
            giftFilter,
            style: style || {}
        });

        res.status(201).json(goal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, type, targetValue, giftFilter, style, isActive } = req.body;
        const goal = await Goal.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { title, type, targetValue, giftFilter, style, isActive },
            { new: true, runValidators: true }
        );
        if (!goal) return res.status(404).json({ error: 'Goal bulunamadı' });
        res.json(goal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/:id/reset', authMiddleware, async (req, res) => {
    try {
        const goal = await Goal.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { currentValue: 0, isCompleted: false, completedAt: null },
            { new: true }
        );
        if (!goal) return res.status(404).json({ error: 'Goal bulunamadı' });
        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual progress update (for testing)
router.post('/:id/increment', authMiddleware, async (req, res) => {
    try {
        const { amount = 1 } = req.body;
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
        if (!goal) return res.status(404).json({ error: 'Goal bulunamadı' });

        goal.currentValue = Math.min(goal.currentValue + amount, goal.targetValue);
        await goal.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`overlay:${goal.overlayId}`).emit('goal-update', {
                overlayId: goal.overlayId,
                currentValue: goal.currentValue,
                targetValue: goal.targetValue,
                isCompleted: goal.isCompleted,
                eventType: 'manual',
                username: 'test'
            });
        }

        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!goal) return res.status(404).json({ error: 'Goal bulunamadı' });
        res.json({ message: 'Goal silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
