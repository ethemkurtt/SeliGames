const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
        }
        const existing = await User.findOne({ $or: [{ email: String(email).toLowerCase() }, { username }] });
        if (existing) {
            return res.status(409).json({ error: 'Bu e-posta veya kullanıcı adı zaten kayıtlı' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        // Return the same { token, user } shape as /login so the app signs in immediately.
        const token = jwt.sign({ userId: user._id, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role, permissions: user.permissions } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.post('/profile', verifyToken, async (req, res) => {
    try {
        const { username, fullName, phoneNumber, tiktokUsername, birthDate } = req.body;
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields if provided
        if (username) {
            // Check if username is already taken by another user
            const existingUser = await User.findOne({ username, _id: { $ne: req.userId } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            user.username = username;
        }
        if (fullName !== undefined) user.fullName = fullName;
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
        if (tiktokUsername !== undefined) user.tiktokUsername = tiktokUsername;
        if (birthDate !== undefined) user.birthDate = birthDate;

        await user.save();

        const updatedUser = await User.findById(req.userId).select('-password');
        res.json({ 
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update TikTok username (Electron app compatibility)
router.post('/connect-tiktok', verifyToken, async (req, res) => {
    try {
        const { tiktokUsername } = req.body;
        if (!tiktokUsername) {
            return res.status(400).json({ error: 'TikTok username is required' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.tiktokUsername = tiktokUsername;
        await user.save();

        res.json({ message: 'TikTok connected successfully', tiktokUsername });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start/Stop live stream (Electron app compatibility)
router.post('/toggle-live', verifyToken, async (req, res) => {
    try {
        const { isLive } = req.body;

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.tiktokUsername && isLive) {
            return res.status(400).json({ error: 'TikTok username not set' });
        }

        user.isLive = isLive;
        await user.save();

        res.json({
            message: isLive ? 'Live stream started' : 'Live stream stopped',
            isLive,
            liveUrl: isLive ? `https://tiktok.com/@${user.tiktokUsername}/live` : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change password (Electron app compatibility)
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword, currentPassword } = req.body;
        // Support both oldPassword and currentPassword for compatibility
        const passwordToCheck = oldPassword || currentPassword;

        if (!passwordToCheck || !newPassword) {
            return res.status(400).json({ error: 'Old and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(passwordToCheck, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Old password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user settings
router.get('/settings', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('settings tiktokUsername');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ 
            settings: user.settings || {},
            tiktokUsername: user.tiktokUsername 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user settings
router.post('/settings', verifyToken, async (req, res) => {
    try {
        const { settings, tiktokUsername } = req.body;
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update settings if provided.
        // `user.settings` is a Mongoose typed subdoc — direct spread produces garbage
        // and "Cast to Object failed for value undefined at path settings.giftSounds".
        // Use Object.assign on the subdoc so Mongoose's setters handle each field.
        if (settings) {
            if (!user.settings) user.settings = {};
            Object.entries(settings).forEach(([k, v]) => {
                if (k === 'giftSounds' && v && typeof v === 'object') {
                    if (!user.settings.giftSounds) user.settings.giftSounds = {};
                    Object.assign(user.settings.giftSounds, v);
                } else {
                    user.settings[k] = v;
                }
            });
            user.markModified('settings');
        }

        // Update TikTok username if provided
        if (tiktokUsername !== undefined) {
            user.tiktokUsername = tiktokUsername;
        }

        await user.save();

        res.json({ 
            message: 'Settings updated successfully',
            settings: user.settings,
            tiktokUsername: user.tiktokUsername
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Per-gift sound mapping (overrides tier defaults)
router.post('/settings/gift-sound-map', verifyToken, async (req, res) => {
    try {
        const { giftName, entry } = req.body;
        if (!giftName) return res.status(400).json({ error: 'giftName required' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.settings) user.settings = {};
        if (!user.settings.giftSoundMap) user.settings.giftSoundMap = {};

        if (entry === null || entry === undefined) {
            delete user.settings.giftSoundMap[giftName];
        } else {
            user.settings.giftSoundMap[giftName] = entry;
        }
        user.markModified('settings');
        await user.save();

        res.json({ message: 'Gift sound map updated', giftSoundMap: user.settings.giftSoundMap });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk replace the whole gift sound map
router.post('/settings/gift-sound-map/bulk', verifyToken, async (req, res) => {
    try {
        const { map } = req.body;
        if (typeof map !== 'object' || map === null) return res.status(400).json({ error: 'map object required' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.settings) user.settings = {};
        user.settings.giftSoundMap = map;
        user.markModified('settings');
        await user.save();

        res.json({ message: 'Gift sound map replaced', count: Object.keys(map).length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update gift sound mapping
router.post('/settings/gift-sounds', verifyToken, async (req, res) => {
    try {
        const { category, sound } = req.body;
        
        if (!category || !sound) {
            return res.status(400).json({ error: 'Category and sound are required' });
        }

        if (!['small', 'medium', 'large', 'epic'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize settings.giftSounds if not exists
        if (!user.settings) {
            user.settings = {};
        }
        if (!user.settings.giftSounds) {
            user.settings.giftSounds = {};
        }

        user.settings.giftSounds[category] = sound;
        user.markModified('settings'); // Important for nested objects
        await user.save();

        res.json({ 
            message: 'Gift sound updated successfully',
            giftSounds: user.settings.giftSounds
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
