const express = require('express');
const TIKTOK_GIFTS = require('../data/tiktokGifts');

const router = express.Router();

// Public — gift catalog served to both Electron app and web overlays
router.get('/', (req, res) => {
    res.json(TIKTOK_GIFTS);
});

module.exports = router;
