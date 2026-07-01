const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Mod = require('../models/Mod');
const Event = require('../models/Event');
const Overlay = require('../models/Overlay');
const { requireAdmin, requirePermission, requirePanelAccess } = require('../middleware/auth');

const router = express.Router();

// Every admin route requires at least panel access (full admin OR a user with
// any granted permission). Individual routes then gate on the exact page+action
// permission below. Granting permissions themselves stays admin-only.
router.use(requirePanelAccess);

// ─── Dashboard / Stats ────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalMods, totalEvents, totalOverlays, activeSubs, recentUsers, recentMods] = await Promise.all([
            User.countDocuments(),
            Mod.countDocuments({ isActive: true }),
            Event.countDocuments(),
            Overlay.countDocuments({ isActive: true }),
            User.countDocuments({ subscriptionStatus: 'active', subscriptionPlan: { $ne: 'free' } }),
            User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
            Mod.find().sort({ createdAt: -1 }).limit(5),
        ]);

        // Simple revenue snapshot (sum of plan prices for active paid users)
        const planPrices = { basic: 99, pro: 299, ultra: 599 };
        const paidUsers = await User.find({
            subscriptionStatus: 'active',
            subscriptionPlan: { $ne: 'free' }
        }).select('subscriptionPlan');
        const monthlyRevenue = paidUsers.reduce((sum, u) => sum + (planPrices[u.subscriptionPlan] || 0), 0);

        res.json({
            totals: { users: totalUsers, mods: totalMods, events: totalEvents, overlays: totalOverlays, activeSubs },
            revenue: { monthly: monthlyRevenue, currency: 'TRY' },
            recentUsers,
            recentMods,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Users CRUD ───────────────────────────────────────────────────────

router.get('/users', requirePermission('users', 'view'), async (req, res) => {
    try {
        const { q, plan, role, limit = 50, offset = 0 } = req.query;
        const filter = {};
        if (q) filter.$or = [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { tiktokUsername: { $regex: q, $options: 'i' } },
        ];
        if (plan && plan !== 'all') filter.subscriptionPlan = plan;
        if (role && role !== 'all') filter.role = role;

        const [users, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Math.min(Number(limit), 200)).select('-password'),
            User.countDocuments(filter),
        ]);
        res.json({ users, total, limit: Number(limit), offset: Number(offset) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/users/:id', requirePermission('users', 'view'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', requirePermission('users', 'edit'), async (req, res) => {
    try {
        const allowed = ['username', 'email', 'fullName', 'phoneNumber', 'tiktokUsername',
            'role', 'subscriptionPlan', 'subscriptionStatus', 'subscriptionEndDate',
            'paymentStatus', 'autoRenew'];
        const update = {};
        for (const k of allowed) if (k in (req.body || {})) update[k] = req.body[k];
        // Only full admins may change a user's role (prevents privilege escalation
        // by a permissioned non-admin editor).
        if ('role' in update && req.userRole !== 'admin') delete update.role;
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/users/:id/reset-password', requirePermission('users', 'edit'), async (req, res) => {
    try {
        const { newPassword } = req.body || {};
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'newPassword (>=6 chars) required' });
        const hash = await bcrypt.hash(newPassword, 10);
        const user = await User.findByIdAndUpdate(req.params.id, { password: hash }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Password reset', user });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', requirePermission('users', 'delete'), async (req, res) => {
    try {
        if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Grant/revoke a user's admin-panel permissions (page × action matrix).
// ADMIN-ONLY — a permissioned non-admin must never be able to escalate itself.
router.put('/users/:id/permissions', requireAdmin, async (req, res) => {
    try {
        const src = (req.body && req.body.permissions) || req.body || {};
        const pages = ['mods', 'users', 'subscriptions', 'settings'];
        const acts = ['view', 'add', 'edit', 'delete'];
        const clean = {};
        for (const pg of pages) { clean[pg] = {}; for (const a of acts) clean[pg][a] = !!(src[pg] && src[pg][a]); }
        const user = await User.findByIdAndUpdate(req.params.id, { permissions: clean }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Mods admin (CRUD already exists at /api/mods, but mirror admin-only writes here) ─

router.get('/mods', requirePermission('mods', 'view'), async (req, res) => {
    try {
        const mods = await Mod.find().sort({ createdAt: -1 });
        res.json(mods);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Site Settings (singleton document, key=site) ─────────────────────

const mongoose = require('mongoose');
const siteSettingsSchema = new mongoose.Schema({
    key: { type: String, default: 'site', unique: true },
    siteName: { type: String, default: 'SeliGames' },
    tagline: { type: String, default: 'TikTok Live ile Oyunlarını Kontrol Et' },
    heroSubtitle: { type: String, default: 'İzleyicilerinin hediyeleri oyununda gerçek aksiyonlara dönüşsün' },
    contactEmail: { type: String, default: 'destek@seligame.com' },
    discordUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    youtubeUrl: { type: String, default: '' },
    desktopDownloadUrl: { type: String, default: '' }, // signed VPS URL pointing at the latest Electron installer
    desktopVersion: { type: String, default: '1.0.0' },
    pricingPlans: {
        type: mongoose.Schema.Types.Mixed,
        default: [
            { id: 'free', name: 'Ücretsiz', price: 0, features: ['1 overlay', 'Temel hediye sesleri', 'Watermark'] },
            { id: 'basic', name: 'Basic', price: 99, features: ['10 overlay', 'Tüm hediye sesleri', 'MP3 upload'] },
            { id: 'pro', name: 'Pro', price: 299, features: ['Sınırsız overlay', 'Mod sistemi', 'Öncelikli destek'], featured: true },
            { id: 'ultra', name: 'Ultra', price: 599, features: ['Her şey + erken erişim', 'Custom CSS', 'API access'] },
        ]
    },
    bannerMessage: { type: String, default: '' },
}, { timestamps: true });

const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);

router.get('/settings', requirePermission('settings', 'view'), async (req, res) => {
    try {
        let s = await SiteSettings.findOne({ key: 'site' });
        if (!s) s = await SiteSettings.create({ key: 'site' });
        res.json(s);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', requirePermission('settings', 'edit'), async (req, res) => {
    try {
        const update = { ...req.body };
        delete update.key;
        const s = await SiteSettings.findOneAndUpdate({ key: 'site' }, update, { new: true, upsert: true });
        res.json(s);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
module.exports.SiteSettings = SiteSettings; // re-exported so a public /api/site route can read it
