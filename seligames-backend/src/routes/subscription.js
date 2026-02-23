const express = require('express');
const User = require('../models/User');
const PaymentHistory = require('../models/PaymentHistory');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get subscription status
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Calculate days remaining
        let daysRemaining = null;
        if (user.subscriptionEndDate) {
            const now = new Date();
            const endDate = new Date(user.subscriptionEndDate);
            daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        }

        res.json({
            subscription: {
                plan: user.subscriptionPlan,
                status: user.subscriptionStatus,
                startDate: user.subscriptionStartDate,
                endDate: user.subscriptionEndDate,
                daysRemaining,
                paymentStatus: user.paymentStatus,
                autoRenew: user.autoRenew,
                trialUsed: user.trialUsed,
                nextBillingDate: user.nextBillingDate
            },
            user: {
                email: user.email,
                fullName: user.fullName,
                tiktokUsername: user.tiktokUsername
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upgrade/Change subscription plan
router.post('/upgrade', authMiddleware, async (req, res) => {
    try {
        const { plan } = req.body;

        if (!['free', 'basic', 'pro', 'ultra'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Calculate subscription dates
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

        // Plan prices
        const prices = {
            free: 0,
            basic: 99,
            pro: 299,
            ultra: 599
        };

        // Update user subscription
        user.subscriptionPlan = plan;
        user.subscriptionStatus = plan === 'free' ? 'active' : 'pending';
        user.subscriptionStartDate = now;
        user.subscriptionEndDate = plan === 'free' ? null : endDate;
        user.paymentStatus = plan === 'free' ? 'none' : 'pending';
        user.nextBillingDate = plan === 'free' ? null : endDate;
        await user.save();

        // Create payment record if not free
        if (plan !== 'free') {
            await PaymentHistory.create({
                userId: user._id,
                amount: prices[plan],
                currency: 'TRY',
                plan: plan,
                status: 'pending',
                description: `Subscription upgrade to ${plan} plan`
            });
        }

        res.json({
            message: 'Subscription updated successfully',
            subscription: {
                plan: user.subscriptionPlan,
                status: user.subscriptionStatus,
                endDate: user.subscriptionEndDate
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel subscription
router.post('/cancel', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.subscriptionStatus = 'cancelled';
        user.autoRenew = false;
        await user.save();

        res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Renew subscription
router.post('/renew', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);

        user.subscriptionStatus = 'active';
        user.subscriptionEndDate = endDate;
        user.nextBillingDate = endDate;
        user.autoRenew = true;
        await user.save();

        res.json({
            message: 'Subscription renewed successfully',
            endDate: endDate
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get payment history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const payments = await PaymentHistory.find({ userId: req.userId })
            .sort({ paymentDate: -1 })
            .limit(50);

        res.json({ payments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle auto-renew
router.post('/auto-renew', authMiddleware, async (req, res) => {
    try {
        const { autoRenew } = req.body;
        const user = await User.findById(req.userId);

        if (!user) return res.status(404).json({ error: 'User not found' });

        user.autoRenew = autoRenew;
        await user.save();

        res.json({
            message: 'Auto-renew setting updated',
            autoRenew: user.autoRenew
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
