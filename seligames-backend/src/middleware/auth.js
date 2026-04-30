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

module.exports = { requireAuth, requireAdmin };
