const express = require('express');
const Mod = require('../models/Mod');

const router = express.Router();

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

module.exports = router;
