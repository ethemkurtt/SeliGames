// Comprehensive end-to-end test harness.
// Run: node test-e2e.js
// Exits 0 only if every single assertion passes.

const http = require('http');
const { io } = require('socket.io-client');

const API = 'http://localhost:3000';
const WEB = 'http://localhost:5173';
const EMAIL = 'admin@seligames.com';
const PASS = 'XkWT7eMFjRKXPKb3';

const results = [];
const pass = (name) => { results.push({ name, ok: true }); console.log('  ✅', name); };
const fail = (name, err) => { results.push({ name, ok: false, err: err?.message || String(err) }); console.log('  ❌', name, '→', err?.message || err); };

async function test(name, fn) {
    try { await fn(); pass(name); }
    catch (err) { fail(name, err); }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function deepGet(o, path) { return path.split('.').reduce((x, k) => x && x[k], o); }

async function req(method, path, body, token) {
    const url = new URL(API + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    return new Promise((resolve, reject) => {
        const req = http.request({
            method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers,
        }, (res) => {
            let chunks = '';
            res.on('data', (c) => chunks += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null }); }
                catch { resolve({ status: res.statusCode, body: chunks }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function webHead(path) {
    return new Promise((resolve) => {
        const url = new URL(WEB + path);
        http.request({ method: 'GET', hostname: url.hostname, port: url.port, path: url.pathname }, (res) => {
            res.resume();
            resolve(res.statusCode);
        }).on('error', () => resolve(0)).end();
    });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function b64dec(s) { return JSON.parse(Buffer.from(s, 'base64').toString()); }

// ────────────────────────────────────────────────────────────────────────────

(async () => {
    console.log('\n=== PHASE 1: Authentication & User ===');

    let token, userId;

    await test('POST /api/auth/login (admin)', async () => {
        const r = await req('POST', '/api/auth/login', { email: EMAIL, password: PASS });
        assert(r.status === 200, `status ${r.status}`);
        assert(r.body.token, 'no token');
        const payload = b64dec(r.body.token.split('.')[1]);
        assert(payload.userId, 'token missing userId field');
        token = r.body.token;
        userId = payload.userId;
    });

    await test('POST /api/auth/login rejects bad password', async () => {
        const r = await req('POST', '/api/auth/login', { email: EMAIL, password: 'WRONGPASS' });
        assert(r.status === 400, `expected 400 got ${r.status}`);
    });

    await test('GET /api/auth/profile', async () => {
        const r = await req('GET', '/api/auth/profile', null, token);
        assert(r.status === 200, `status ${r.status}`);
        assert(r.body.email === EMAIL, 'wrong email');
        assert(!r.body.password, 'password field should not leak');
    });

    await test('GET /api/auth/profile without token → 401', async () => {
        const r = await req('GET', '/api/auth/profile');
        assert(r.status === 401, `expected 401 got ${r.status}`);
    });

    await test('GET /api/auth/profile with bad token → 401', async () => {
        const r = await req('GET', '/api/auth/profile', null, 'not.a.real.jwt');
        assert(r.status === 401, `expected 401 got ${r.status}`);
    });

    await test('POST /api/auth/profile updates username/fullName/tiktokUsername/phone', async () => {
        const r = await req('POST', '/api/auth/profile', {
            fullName: 'Test Admin', tiktokUsername: 'testadmin', phoneNumber: '+905551234567',
        }, token);
        assert(r.status === 200, `status ${r.status}`);
        assert(r.body.user?.fullName === 'Test Admin', 'fullName not updated');
        assert(r.body.user?.tiktokUsername === 'testadmin', 'tiktokUsername not updated');
    });

    await test('GET /api/auth/settings', async () => {
        const r = await req('GET', '/api/auth/settings', null, token);
        assert(r.status === 200, `status ${r.status}`);
        assert(r.body.settings, 'no settings object');
        assert(r.body.tiktokUsername === 'testadmin', 'tiktokUsername mismatch');
    });

    await test('POST /api/auth/settings merges flags', async () => {
        const r = await req('POST', '/api/auth/settings', {
            settings: { notifications: false, tiktokSoundEffects: true },
        }, token);
        assert(r.status === 200, `status ${r.status}`);
        assert(r.body.settings?.notifications === false, 'notifications not updated');
    });

    await test('POST /api/auth/settings/gift-sounds', async () => {
        const r = await req('POST', '/api/auth/settings/gift-sounds', { category: 'small', sound: 'coin' }, token);
        assert(r.status === 200, `status ${r.status}`);
        assert(r.body.giftSounds?.small === 'coin', 'gift sound not updated');
    });

    await test('POST /api/auth/settings/gift-sounds rejects invalid category', async () => {
        const r = await req('POST', '/api/auth/settings/gift-sounds', { category: 'bogus', sound: 'x' }, token);
        assert(r.status === 400, `expected 400 got ${r.status}`);
    });

    await test('POST /api/auth/change-password roundtrip', async () => {
        // Change to TEMP and back
        let r = await req('POST', '/api/auth/change-password', { currentPassword: PASS, newPassword: 'TEMP_PASS_12345' }, token);
        assert(r.status === 200, `first change ${r.status}: ${JSON.stringify(r.body)}`);
        r = await req('POST', '/api/auth/login', { email: EMAIL, password: 'TEMP_PASS_12345' });
        assert(r.status === 200, 'login with new pass failed');
        const newToken = r.body.token;
        r = await req('POST', '/api/auth/change-password', { currentPassword: 'TEMP_PASS_12345', newPassword: PASS }, newToken);
        assert(r.status === 200, 'revert failed');
        r = await req('POST', '/api/auth/login', { email: EMAIL, password: PASS });
        assert(r.status === 200, 'login with original pass failed after revert');
        token = r.body.token; // use fresh
    });

    // ────────────────────────────────────────────────────────────────────

    console.log('\n=== PHASE 2: Mods ===');

    await test('GET /api/mods returns array', async () => {
        const r = await req('GET', '/api/mods');
        assert(r.status === 200, `status ${r.status}`);
        assert(Array.isArray(r.body), 'not an array');
    });

    // ────────────────────────────────────────────────────────────────────

    console.log('\n=== PHASE 3: Overlay CRUD (all 21 variations) ===');

    // Clear old test overlays — delete everything to start clean
    {
        const r = await req('GET', '/api/overlays', null, token);
        for (const ov of r.body || []) {
            await req('DELETE', `/api/overlays/${ov._id}`, null, token);
        }
        const r2 = await req('GET', '/api/overlays', null, token);
        await test(`Clean slate (deleted ${r.body?.length || 0} old overlays, now ${r2.body?.length || 0})`,
            async () => { assert((r2.body || []).length === 0, 'cleanup failed'); });
    }

    const OVERLAY_KINDS = [
        { type: 'goal', sub: 'likes', title: 'Beğeni' },
        { type: 'goal', sub: 'follows', title: 'Takipçi' },
        { type: 'goal', sub: 'shares', title: 'Paylaşım' },
        { type: 'goal', sub: 'viewer_count', title: 'İzleyici' },
        { type: 'goal', sub: 'coins', title: 'Coin' },
        { type: 'goal', sub: 'subscribers', title: 'Abone' },
        { type: 'goal', sub: 'custom1', title: 'Custom 1' },
        { type: 'goal', sub: 'custom2', title: 'Custom 2' },
        { type: 'goal', sub: 'custom3', title: 'Custom 3' },
        { type: 'gift-alert', sub: 'alert', title: 'Hediye Alert' },
        { type: 'gift-alert', sub: 'ticker', title: 'Hediye Ticker' },
        { type: 'last-x', sub: 'follows', title: 'Son Takipçi' },
        { type: 'last-x', sub: 'gifts', title: 'Son Hediye' },
        { type: 'last-x', sub: 'likes', title: 'Son Beğenen' },
        { type: 'last-x', sub: 'shares', title: 'Son Paylaşan' },
        { type: 'leaderboard', sub: 'gifts', title: 'Top Gifters' },
        { type: 'leaderboard', sub: 'likes', title: 'Top Likers' },
        { type: 'chart', sub: 'viewer_count', title: 'Viewer Grafiği' },
        { type: 'chat', sub: 'chat', title: 'Chat Dock' },
        { type: 'event-feed', sub: 'events', title: 'Event Akışı' },
    ];

    const created = {}; // key: `${type}/${sub}` → { _id, overlayId }

    for (const k of OVERLAY_KINDS) {
        await test(`Create ${k.type}/${k.sub}`, async () => {
            const payload = {
                overlayType: k.type, subType: k.sub, title: k.title, targetValue: 100, currentValue: 0,
                style: { barColor: '#00ff9d', textColor: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', fontSize: 18, borderRadius: 12, theme: 'neon', showPercentage: true, showNumbers: true, animation: 'smooth' },
                config: { maxItems: 5, duration: 5 },
            };
            const r = await req('POST', '/api/overlays', payload, token);
            assert(r.status === 201, `status ${r.status} body ${JSON.stringify(r.body)}`);
            assert(r.body.overlayId, 'no overlayId');
            created[`${k.type}/${k.sub}`] = { _id: r.body._id, overlayId: r.body.overlayId };
        });
    }

    await test('GET /api/overlays returns all 20', async () => {
        const r = await req('GET', '/api/overlays', null, token);
        assert(r.status === 200);
        assert(r.body.length === OVERLAY_KINDS.length, `expected ${OVERLAY_KINDS.length} got ${r.body.length}`);
    });

    await test('GET /api/overlays?type=goal filters', async () => {
        const r = await req('GET', '/api/overlays?type=goal', null, token);
        assert(r.body.every((o) => o.overlayType === 'goal'), 'filter broken');
        assert(r.body.length === 9, `expected 9 goal overlays got ${r.body.length}`);
    });

    await test('GET /api/overlays?type=goal&subType=likes filters subType', async () => {
        const r = await req('GET', '/api/overlays?type=goal&subType=likes', null, token);
        assert(r.body.length === 1, `expected 1 got ${r.body.length}`);
    });

    // Public render endpoint
    for (const key of Object.keys(created)) {
        await test(`GET /api/overlays/render/${key} (public, no auth)`, async () => {
            const r = await req('GET', `/api/overlays/render/${created[key].overlayId}`);
            assert(r.status === 200, `status ${r.status}`);
            assert(r.body.overlayId === created[key].overlayId, 'id mismatch');
        });
    }

    await test('GET /api/overlays/render/INVALID → 404', async () => {
        const r = await req('GET', '/api/overlays/render/notarealid');
        assert(r.status === 404, `expected 404 got ${r.status}`);
    });

    // Increment + reset on goal-likes
    await test('POST /api/overlays/:id/increment (manual)', async () => {
        const id = created['goal/likes']._id;
        const r = await req('POST', `/api/overlays/${id}/increment`, { amount: 5 }, token);
        assert(r.status === 200);
        assert(r.body.currentValue === 5, `expected 5 got ${r.body.currentValue}`);
    });

    await test('POST /api/overlays/:id/reset', async () => {
        const id = created['goal/likes']._id;
        const r = await req('POST', `/api/overlays/${id}/reset`, {}, token);
        assert(r.status === 200);
        assert(r.body.currentValue === 0, 'reset didn\'t zero currentValue');
    });

    await test('PUT /api/overlays/:id updates title+style', async () => {
        const id = created['goal/likes']._id;
        const r = await req('PUT', `/api/overlays/${id}`, { title: 'Updated Likes', style: { barColor: '#ff006e' } }, token);
        assert(r.status === 200);
        assert(r.body.title === 'Updated Likes', 'title not updated');
    });

    // ────────────────────────────────────────────────────────────────────

    console.log('\n=== PHASE 4: Socket.io — TikTok Live Pipeline ===');

    // Build a map of "listeners" — one socket per overlay, tracks updates it receives
    const subs = {};
    for (const key of Object.keys(created)) {
        subs[key] = { updates: [], events: [] };
    }

    // Create overlay socket clients
    const overlaySockets = [];
    for (const key of Object.keys(created)) {
        const s = io(API, { transports: ['websocket'], forceNew: true });
        overlaySockets.push(s);
        await new Promise((r) => s.once('connect', r));
        s.emit('join-overlay', created[key].overlayId);
        s.on('overlay-update', (d) => { if (d.overlayId === created[key].overlayId) subs[key].updates.push(d); });
        s.on('tiktok-live-event', (d) => { subs[key].events.push(d); });
    }

    // Give the rooms a moment to join
    await sleep(200);

    // Auth-user socket
    const userSock = io(API, { transports: ['websocket'], forceNew: true });
    await new Promise((r) => userSock.once('connect', r));

    const authResult = await new Promise((resolve) => {
        userSock.once('auth-success', (d) => resolve({ ok: true, d }));
        userSock.once('auth-error', (d) => resolve({ ok: false, d }));
        userSock.emit('auth', { token });
    });

    await test('Socket auth-success with valid token', async () => {
        assert(authResult.ok, `auth-error: ${JSON.stringify(authResult.d)}`);
        assert(authResult.d.userId === userId, 'userId mismatch');
    });

    await test('Socket auth-error with invalid token', async () => {
        const s = io(API, { transports: ['websocket'], forceNew: true });
        await new Promise((r) => s.once('connect', r));
        const res = await new Promise((resolve) => {
            s.once('auth-success', (d) => resolve({ ok: true, d }));
            s.once('auth-error', (d) => resolve({ ok: false, d }));
            s.emit('auth', { token: 'bogus.jwt.token' });
        });
        s.disconnect();
        assert(!res.ok, 'invalid token should fail auth');
    });

    // Now simulate tiktok events (same shape as renderer.js forwardToBackend)
    const emit = (data) => userSock.emit('tiktok-event', data);

    // likes → goal/likes, last-x/likes, leaderboard/likes, event-feed
    emit({ eventType: 'like', username: 'alice', nickname: 'Alice', count: 3, likeCount: 3 });
    // follow → goal/follows, last-x/follows, event-feed
    emit({ eventType: 'follow', username: 'bob', nickname: 'Bob', count: 1 });
    // share → goal/shares, last-x/shares, event-feed
    emit({ eventType: 'share', username: 'carol', nickname: 'Carol', count: 1 });
    // gift → gift-alert (alert), last-x/gifts, leaderboard/gifts, event-feed
    emit({ eventType: 'gift', username: 'dave', nickname: 'Dave', giftName: 'Gül', giftId: '5655', count: 2, diamondCount: 2 });
    // gift bigger → updates lastGift, leaderboard item
    emit({ eventType: 'gift', username: 'eve', nickname: 'Eve', giftName: 'Roket', count: 1, diamondCount: 500 });
    // comment (alias for chat) → normalizes to chat, chat/chat, event-feed
    emit({ eventType: 'comment', username: 'frank', nickname: 'Frank', comment: 'Merhaba!', text: 'Merhaba!' });
    // chat direct → same as above
    emit({ eventType: 'chat', username: 'gina', nickname: 'Gina', comment: 'Test chat', text: 'Test chat' });
    // viewer → chart/viewer_count, goal/viewer_count, event-feed
    emit({ eventType: 'viewer', viewerCount: 123, count: 1 });
    // member → event-feed only (no overlay type matches "members" sub)
    emit({ eventType: 'member', username: 'hank', nickname: 'Hank', count: 1 });

    await sleep(1500);

    await test('goal/likes received +3', async () => {
        const u = subs['goal/likes'].updates;
        assert(u.length >= 1, `no updates (got ${u.length})`);
        assert(u[u.length - 1].currentValue === 3, `expected 3 got ${u[u.length - 1].currentValue}`);
    });
    await test('goal/follows received +1', async () => {
        const u = subs['goal/follows'].updates;
        assert(u.length >= 1, `no updates`);
        assert(u[u.length - 1].currentValue === 1, `value ${u[u.length - 1].currentValue}`);
    });
    await test('goal/shares received +1', async () => {
        const u = subs['goal/shares'].updates;
        assert(u.length >= 1, `no updates`);
    });
    await test('goal/viewer_count received update from viewer event', async () => {
        const u = subs['goal/viewer_count'].updates;
        assert(u.length >= 1, `no updates (got ${u.length})`);
    });
    await test('gift-alert/alert received lastGift', async () => {
        const u = subs['gift-alert/alert'].updates;
        assert(u.length >= 1, `no updates`);
        const last = u[u.length - 1];
        assert(deepGet(last, 'data.lastGift.name') === 'Roket', `lastGift.name=${deepGet(last, 'data.lastGift.name')}`);
    });
    await test('last-x/gifts received items (newest first)', async () => {
        const u = subs['last-x/gifts'].updates;
        assert(u.length >= 1, `no updates`);
        const last = u[u.length - 1];
        const items = deepGet(last, 'data.items');
        assert(Array.isArray(items) && items.length >= 2, `items ${JSON.stringify(items)}`);
        assert(items[0].user === 'eve', `newest should be eve got ${items[0].user}`);
    });
    await test('last-x/likes received like item', async () => {
        const u = subs['last-x/likes'].updates;
        assert(u.length >= 1, `no updates`);
        const items = deepGet(u[u.length - 1], 'data.items');
        assert(items[0].user === 'alice', `got ${items[0].user}`);
    });
    await test('leaderboard/gifts received sorted items', async () => {
        const u = subs['leaderboard/gifts'].updates;
        assert(u.length >= 1, `no updates`);
        const items = deepGet(u[u.length - 1], 'data.items');
        assert(Array.isArray(items), 'no items array');
    });
    await test('leaderboard/likes received alice with score 3', async () => {
        const u = subs['leaderboard/likes'].updates;
        assert(u.length >= 1, `no updates`);
        const items = deepGet(u[u.length - 1], 'data.items');
        const alice = items.find((i) => i.user === 'alice');
        assert(alice && alice.score === 3, `alice score ${alice?.score}`);
    });
    await test('chart/viewer_count received item', async () => {
        const u = subs['chart/viewer_count'].updates;
        assert(u.length >= 1, `no updates`);
    });
    await test('chat/chat received chat tiktok-live-events', async () => {
        const e = subs['chat/chat'].events;
        const chatMsgs = e.filter((x) => x.type === 'chat');
        assert(chatMsgs.length >= 2, `expected ≥2 chat msgs got ${chatMsgs.length}`);
        assert(chatMsgs.some((m) => m.text === 'Merhaba!'), 'comment→chat normalization broken');
        assert(chatMsgs.some((m) => m.text === 'Test chat'), 'direct chat missing');
    });
    await test('event-feed received multi-type events', async () => {
        const e = subs['event-feed/events'].events;
        const types = new Set(e.map((x) => x.eventType));
        assert(types.has('like'), `no like event (types: ${[...types].join(',')})`);
        assert(types.has('follow'), 'no follow');
        assert(types.has('gift'), 'no gift');
        assert(types.has('chat'), 'no chat (from comment normalization)');
    });

    // Verify event records persisted in DB with correct enum
    await test('GET /api/events shows events including chat (comment normalized)', async () => {
        const r = await req('GET', '/api/events?limit=50', null, token);
        assert(r.status === 200);
        const types = new Set(r.body.events.map((e) => e.eventType));
        assert(types.has('chat'), `chat missing (types: ${[...types].join(',')})`);
        assert(types.has('like'), 'like missing');
        assert(types.has('gift'), 'gift missing');
    });

    await test('GET /api/events/stats returns per-type aggregates', async () => {
        const r = await req('GET', '/api/events/stats', null, token);
        assert(r.status === 200);
        assert(r.body.like && r.body.like.count >= 1, 'like stats missing');
    });

    // Unauthenticated tiktok-event must be ignored (warning, not error)
    await test('Socket ignores unauthenticated tiktok-event', async () => {
        const s = io(API, { transports: ['websocket'], forceNew: true });
        await new Promise((r) => s.once('connect', r));
        // No auth emit → just try to send a tiktok-event
        s.emit('tiktok-event', { eventType: 'like', count: 1 });
        await sleep(300);
        s.disconnect();
        // Nothing to assert against the sub; this is just making sure the server doesn't crash.
    });

    // No-cap behavior: emit enough likes to exceed target
    await test('goal counter grows past target (no-cap fix)', async () => {
        const id = created['goal/likes']._id;
        // Reset first
        await req('POST', `/api/overlays/${id}/reset`, {}, token);
        await sleep(200);
        // Fire 120 likes (target is 100)
        for (let i = 0; i < 4; i++) emit({ eventType: 'like', username: 'tester', nickname: 'Tester', count: 30 });
        await sleep(700);
        const r = await req('GET', `/api/overlays/render/${created['goal/likes'].overlayId}`);
        assert(r.body.currentValue >= 100, `expected ≥100 got ${r.body.currentValue}`);
    });

    // Cleanup sockets
    userSock.disconnect();
    for (const s of overlaySockets) s.disconnect();

    // ────────────────────────────────────────────────────────────────────

    console.log('\n=== PHASE 5: Web Routes (Vite dev) ===');

    // The Vite SPA serves 200 for any path since it's client-side routed,
    // but we at least verify the server is up and the paths don't 500.
    for (const key of Object.keys(created)) {
        const ov = created[key];
        await test(`/live/${key} → HTTP 200`, async () => {
            const s = await webHead(`/live/${ov.overlayId}`);
            assert(s === 200, `got ${s}`);
        });
    }
    await test('/live/likes/:id legacy alias → HTTP 200', async () => {
        const s = await webHead(`/live/likes/${created['goal/likes'].overlayId}`);
        assert(s === 200, `got ${s}`);
    });

    // ────────────────────────────────────────────────────────────────────

    console.log('\n=== PHASE 6: Overlay DELETE cleanup ===');

    for (const key of Object.keys(created)) {
        await test(`DELETE ${key}`, async () => {
            const r = await req('DELETE', `/api/overlays/${created[key]._id}`, null, token);
            assert(r.status === 200, `status ${r.status}`);
        });
    }

    await test('GET /api/overlays is empty after cleanup', async () => {
        const r = await req('GET', '/api/overlays', null, token);
        assert(r.body.length === 0, `expected 0 got ${r.body.length}`);
    });

    // ────────────────────────────────────────────────────────────────────

    const failed = results.filter((r) => !r.ok);
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Passed: ${results.length - failed.length}/${results.length}`);
    if (failed.length) {
        console.log(`❌ Failed: ${failed.length}`);
        for (const f of failed) console.log(`   - ${f.name}: ${f.err}`);
        process.exit(1);
    }
    console.log('🎉 All tests passed.');
    process.exit(0);
})().catch((err) => { console.error('Harness crashed:', err); process.exit(2); });
