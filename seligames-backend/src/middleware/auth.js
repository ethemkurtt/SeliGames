// Shared auth middleware — all routes should pull from here so we don't
// keep duplicating jwt.verify boilerplate (and so the admin gate is one fix).
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_seligames';

function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.userId;
        req.userRole = decoded.role || 'user';
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Geçersiz token' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, (err) => {
        if (err) return next(err);
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin yetkisi gerekli' });
        }
        next();
    });
}

// Lazy require to avoid any circular-import surprises at module load time.
function _User() { return require('../models/User'); }

// Gate a route on a granular permission (page + action). Full admins always
// pass; otherwise the user's stored permissions matrix is consulted from DB.
function requirePermission(page, action) {
    return (req, res, next) => {
        requireAuth(req, res, async () => {
            if (req.userRole === 'admin') return next();
            try {
                const u = await _User().findById(req.userId).select('role permissions');
                req.userPermissions = u?.permissions || {};
                if (u && (u.role === 'admin' || u.permissions?.[page]?.[action])) return next();
            } catch (e) { /* fall through to 403 */ }
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        });
    };
}

// Allow anyone who can access the admin panel at all: a full admin OR a user
// holding at least one permission flag anywhere in the matrix.
function requirePanelAccess(req, res, next) {
    requireAuth(req, res, async () => {
        if (req.userRole === 'admin') return next();
        try {
            const u = await _User().findById(req.userId).select('role permissions');
            const perms = u?.permissions ? (u.permissions.toObject ? u.permissions.toObject() : u.permissions) : {};
            const any = u?.role === 'admin' || Object.values(perms).some((p) => p && (p.view || p.add || p.edit || p.delete));
            if (any) return next();
        } catch (e) { /* fall through */ }
        return res.status(403).json({ error: 'Panel erişim yetkiniz yok' });
    });
}

module.exports = { requireAuth, requireAdmin, requirePermission, requirePanelAccess };
