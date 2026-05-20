const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Mod = require('../models/Mod');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

// Where uploaded mod ZIPs live on disk.
// `/var/seligames/mods` on the VPS, override with MOD_FILES_DIR for dev.
const MOD_FILES_DIR = process.env.MOD_FILES_DIR || '/var/seligames/mods';
const MOD_IMAGES_DIR = process.env.MOD_IMAGES_DIR || '/var/seligames/mod-images';
for (const dir of [MOD_FILES_DIR, MOD_IMAGES_DIR]) {
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
    catch (e) { console.warn(`⚠️ Could not create ${dir}:`, e.message); }
}

// Multer disk storage — streams large files (up to 5 GB) directly to disk
// instead of buffering in memory. Filename is always `<modId>.zip` so re-uploads
// overwrite the previous version.
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, MOD_FILES_DIR),
        filename: (req, file, cb) => cb(null, `${req.params.id}.zip`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB
    fileFilter: (req, file, cb) => {
        // Accept only .zip files (and a couple of permissive mime variants)
        const ok = file.originalname.toLowerCase().endsWith('.zip')
            || ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', 'application/octet-stream'].includes(file.mimetype);
        cb(ok ? null : new Error('Sadece .zip dosyası yüklenebilir'), ok);
    },
});

// Mod cover-image upload (PNG/JPG/WEBP, ≤10 MB). Filename always
// `<modId>.<ext>` so re-uploads overwrite. The mod's imageUrl is patched
// to point at the statically-served path after a successful upload.
const IMAGE_EXT_BY_MIME = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
const imageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, MOD_IMAGES_DIR),
        filename: (req, file, cb) => {
            const ext = IMAGE_EXT_BY_MIME[file.mimetype]
                || (path.extname(file.originalname || '').slice(1).toLowerCase())
                || 'png';
            cb(null, `${req.params.id}.${ext}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const ok = !!IMAGE_EXT_BY_MIME[file.mimetype] || /\.(png|jpe?g|webp|gif)$/i.test(file.originalname || '');
        cb(ok ? null : new Error('Sadece PNG / JPG / WEBP / GIF yüklenebilir'), ok);
    },
});

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

// ─── File upload (admin) + signed download (auth user) ────────────────

// Admin: upload a mod ZIP. The file lands at MOD_FILES_DIR/<modId>.zip.
// Existing file is overwritten. Updates the Mod doc with size/name/timestamp.
router.post('/:id/upload', requireAdmin, (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(400).json({ error: uploadErr.message });
        if (!req.file) return res.status(400).json({ error: 'Dosya gönderilmedi' });
        try {
            const mod = await Mod.findById(req.params.id);
            if (!mod) {
                try { fs.unlinkSync(req.file.path); } catch { }
                return res.status(404).json({ error: 'Mod bulunamadı' });
            }
            mod.fileName = req.file.originalname;
            mod.fileSize = req.file.size;
            mod.fileMimeType = req.file.mimetype;
            mod.fileUploadedAt = new Date();
            await mod.save();
            res.json({ message: 'Dosya yüklendi', mod });
        } catch (e) {
            try { fs.unlinkSync(req.file.path); } catch { }
            res.status(500).json({ error: e.message });
        }
    });
});

// Admin: upload a mod cover image. The file lands at MOD_IMAGES_DIR/<id>.<ext>
// and Mod.imageUrl is patched to point at the statically-served URL so the
// admin doesn't have to copy/paste anything.
router.post('/:id/image', requireAdmin, (req, res) => {
    imageUpload.single('image')(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(400).json({ error: uploadErr.message });
        if (!req.file) return res.status(400).json({ error: 'Görsel gönderilmedi' });
        try {
            const mod = await Mod.findById(req.params.id);
            if (!mod) {
                try { fs.unlinkSync(req.file.path); } catch { }
                return res.status(404).json({ error: 'Mod bulunamadı' });
            }
            // Strip stale images of any other extension for this mod so we
            // don't accumulate orphans when the user re-uploads a different
            // format (e.g. previously .jpg, now .png).
            const filename = path.basename(req.file.path);
            try {
                const others = fs.readdirSync(MOD_IMAGES_DIR).filter((f) =>
                    f.startsWith(`${req.params.id}.`) && f !== filename
                );
                for (const f of others) try { fs.unlinkSync(path.join(MOD_IMAGES_DIR, f)); } catch { }
            } catch { }

            mod.imageUrl = `/uploads/mod-images/${filename}`;
            await mod.save();
            res.json({ message: 'Görsel yüklendi', mod });
        } catch (e) {
            try { fs.unlinkSync(req.file.path); } catch { }
            res.status(500).json({ error: e.message });
        }
    });
});

// Admin: delete the uploaded file (keeps the mod metadata)
router.delete('/:id/file', requireAdmin, async (req, res) => {
    try {
        const filePath = path.join(MOD_FILES_DIR, `${req.params.id}.zip`);
        try { fs.unlinkSync(filePath); } catch { }
        await Mod.findByIdAndUpdate(req.params.id, {
            $unset: { fileName: 1, fileSize: 1, fileMimeType: 1, fileUploadedAt: 1, fileChecksum: 1 }
        });
        res.json({ message: 'Dosya silindi' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Authenticated user: get a short-lived signed URL for downloading.
// Token contains {userId, modId, type, exp}; valid 5 minutes.
router.get('/:id/download-token', requireAuth, async (req, res) => {
    try {
        const mod = await Mod.findById(req.params.id);
        if (!mod) return res.status(404).json({ error: 'Mod bulunamadı' });

        const filePath = path.join(MOD_FILES_DIR, `${mod._id}.zip`);
        const hasUploadedFile = mod.fileUploadedAt && fs.existsSync(filePath);

        // No uploaded file? Fall back to the external `downloadUrl` if set.
        if (!hasUploadedFile) {
            if (mod.downloadUrl) {
                return res.json({
                    url: mod.downloadUrl,
                    external: true,
                    expiresIn: null,
                    fileSize: null,
                    fileName: null
                });
            }
            return res.status(404).json({ error: 'Bu mod için yüklü dosya yok' });
        }

        const token = jwt.sign(
            { userId: req.userId, modId: mod._id.toString(), type: 'mod-download' },
            SECRET_KEY,
            { expiresIn: '5m' }
        );

        // Build absolute URL pointing back at us.
        // PUBLIC_BACKEND_URL lets prod use https://api.seligame.com if needed,
        // otherwise we reconstruct from the request.
        const baseUrl = process.env.PUBLIC_BACKEND_URL
            || `${req.protocol}://${req.get('host')}`;

        res.json({
            url: `${baseUrl}/api/mods/files/${mod._id}?t=${token}`,
            external: false,
            expiresIn: 300,
            fileSize: mod.fileSize,
            fileName: mod.fileName,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Public-but-signed: stream the ZIP. Token is verified per-request.
// `?t=<jwt>` instead of an Authorization header so download managers / browsers
// can hit the URL without extra wiring.
router.get('/files/:id', async (req, res) => {
    const token = req.query.t;
    if (!token) return res.status(401).send('no token');

    let payload;
    try { payload = jwt.verify(token, SECRET_KEY); }
    catch { return res.status(401).send('invalid or expired token'); }

    if (payload.type !== 'mod-download' || payload.modId !== req.params.id) {
        return res.status(403).send('token mismatch');
    }

    try {
        const filePath = path.join(MOD_FILES_DIR, `${req.params.id}.zip`);
        if (!fs.existsSync(filePath)) return res.status(404).send('file missing');

        const stat = fs.statSync(filePath);
        const mod = await Mod.findById(req.params.id);
        const safeTitle = (mod?.title || 'mod').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeTitle}.zip`;

        // Range-request support → resumable downloads + better UX for huge files
        const range = req.headers.range;
        if (range) {
            const m = /bytes=(\d+)-(\d+)?/.exec(range);
            const start = parseInt(m[1], 10);
            const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', end - start + 1);
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            fs.createReadStream(filePath).pipe(res);
        }

        // Fire-and-forget: increment download counter
        Mod.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }).catch(() => { });
    } catch (e) {
        if (!res.headersSent) res.status(500).send('error');
    }
});

module.exports = router;
