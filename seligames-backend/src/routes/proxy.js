// Image proxy — fetches TikTok CDN images and serves them with permissive CORS
// headers so the gift-designer canvas can include them without taint.
const express = require('express');
const router = express.Router();

const ALLOWED_HOSTS = [
    'p16-webcast.tiktokcdn.com',
    'p19-webcast.tiktokcdn.com',
    'p9-webcast.tiktokcdn.com',
    'p77-webcast.tiktokcdn.com',
    'images.unsplash.com',
];

router.get('/image', async (req, res) => {
    const url = String(req.query.url || '');
    if (!url) return res.status(400).send('url required');

    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).send('invalid url'); }
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
        return res.status(403).send('host not allowed');
    }

    try {
        const upstream = await fetch(url);
        if (!upstream.ok) return res.status(upstream.status).send();
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
    } catch (e) {
        res.status(502).send(e.message || 'fetch failed');
    }
});

module.exports = router;
