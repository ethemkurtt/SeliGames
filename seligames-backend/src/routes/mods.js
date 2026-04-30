const express = require('express');
const jwt = require('jsonwebtoken');
const Mod = require('../models/Mod');
const User = require('../models/User');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        req.userId = jwt.verify(token, SECRET_KEY).userId;
        next();
    } catch { return res.status(401).json({ error: 'Geçersiz token' }); }
}

// List all mods
router.get('/', async (req, res) => {
    try {
        const mods = await Mod.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(mods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get mod by ID
router.get('/:id', async (req, res) => {
    try {
        const mod = await Mod.findById(req.params.id);
        if (!mod) return res.status(404).json({ error: 'Mod not found' });
        res.json(mod);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a mod (for testing/admin)
router.post('/', async (req, res) => {
    try {
        const mod = await Mod.create(req.body);
        res.status(201).json(mod);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update a mod
router.put('/:id', async (req, res) => {
    try {
        const mod = await Mod.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!mod) return res.status(404).json({ error: 'Mod not found' });
        res.json(mod);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a mod (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const mod = await Mod.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!mod) return res.status(404).json({ error: 'Mod not found' });
        res.json({ message: 'Mod deleted successfully', mod });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Per-user mod config (gift→action mappings) ──────────────────────────

// Get the current user's config for a specific mod
router.get('/:id/config', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('settings.modConfigs');
        if (!user) return res.status(404).json({ error: 'User not found' });
        const config = (user.settings?.modConfigs || {})[req.params.id] || {
            installed: false, installPath: null, giftActions: {}
        };
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Replace the current user's config for a mod
router.post('/:id/config', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.settings) user.settings = {};
        if (!user.settings.modConfigs) user.settings.modConfigs = {};
        const { installed, installPath, giftActions } = req.body || {};
        const prev = user.settings.modConfigs[req.params.id] || {};
        user.settings.modConfigs[req.params.id] = {
            ...prev,
            ...(installed !== undefined ? { installed } : {}),
            ...(installPath !== undefined ? { installPath } : {}),
            ...(giftActions ? { giftActions } : {}),
            updatedAt: Date.now()
        };
        user.markModified('settings');
        await user.save();
        res.json({ message: 'Mod config saved', config: user.settings.modConfigs[req.params.id] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update one gift→action entry for a mod
router.post('/:id/config/gift-action', auth, async (req, res) => {
    try {
        const { giftName, action } = req.body || {};
        if (!giftName) return res.status(400).json({ error: 'giftName required' });
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.settings) user.settings = {};
        if (!user.settings.modConfigs) user.settings.modConfigs = {};
        if (!user.settings.modConfigs[req.params.id]) user.settings.modConfigs[req.params.id] = { giftActions: {} };
        if (!user.settings.modConfigs[req.params.id].giftActions) user.settings.modConfigs[req.params.id].giftActions = {};
        if (action === null || action === undefined) {
            delete user.settings.modConfigs[req.params.id].giftActions[giftName];
        } else {
            user.settings.modConfigs[req.params.id].giftActions[giftName] = action;
        }
        user.markModified('settings');
        await user.save();
        res.json({ message: 'Gift action updated', giftActions: user.settings.modConfigs[req.params.id].giftActions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mark mod installed / uninstalled (writes local install path for later use)
router.post('/:id/install', auth, async (req, res) => {
    try {
        const { installPath } = req.body || {};
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.settings) user.settings = {};
        if (!user.settings.modConfigs) user.settings.modConfigs = {};
        if (!user.settings.modConfigs[req.params.id]) user.settings.modConfigs[req.params.id] = { giftActions: {} };
        user.settings.modConfigs[req.params.id].installed = true;
        user.settings.modConfigs[req.params.id].installPath = installPath || null;
        user.settings.modConfigs[req.params.id].installedAt = Date.now();
        user.markModified('settings');
        await user.save();

        // also increment the mod's downloadCount
        await Mod.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });

        res.json({ message: 'Mod marked installed', config: user.settings.modConfigs[req.params.id] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/uninstall', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.settings?.modConfigs?.[req.params.id]) {
            user.settings.modConfigs[req.params.id].installed = false;
            user.settings.modConfigs[req.params.id].installPath = null;
            user.markModified('settings');
            await user.save();
        }
        res.json({ message: 'Uninstalled' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// List the current user's installed mods
router.get('/user/installed', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('settings.modConfigs');
        const configs = user?.settings?.modConfigs || {};
        const installedIds = Object.keys(configs).filter(id => configs[id]?.installed);
        if (!installedIds.length) return res.json([]);
        const mods = await Mod.find({ _id: { $in: installedIds } });
        res.json(mods.map(m => ({ ...m.toObject(), config: configs[m._id.toString()] })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
