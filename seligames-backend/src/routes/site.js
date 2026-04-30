// Public site config — pricing plans, contact info, download link.
// Read-only mirror of the admin SiteSettings doc.
const express = require('express');
const { SiteSettings } = require('./admin');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        let s = await SiteSettings.findOne({ key: 'site' });
        if (!s) s = await SiteSettings.create({ key: 'site' });
        // Strip nothing — these are intended for the public marketing page
        res.json(s);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
