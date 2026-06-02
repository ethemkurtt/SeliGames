/**
 * RuleEngine — evaluates incoming TikTok events against the user's Rules
 * and dispatches the matched Actions.
 *
 * Dispatch channels (all via the `user:<userId>` socket.io room, which both
 * the streamer's Electron client AND their OBS overlays have joined):
 *   - 'action-fire'    → visual/audio actions, rendered by the MyActions
 *                        overlay (overlay-alert / sound / tts / confetti /
 *                        media / wheel-spin).
 *   - 'execute-action' → OS-level actions, run by the Electron client
 *                        (keyboard / mouse / text / launch).
 *
 * Cooldowns are tracked in-memory (single server instance). Keys:
 *   global:  ruleId
 *   peruser: ruleId + '|' + viewerKey
 */

const Rule = require('../models/Rule');
const Action = require('../models/Action');

// ── In-memory cooldown state ────────────────────────────────────────────
const globalCooldown = new Map();   // ruleId -> lastFiredMs
const perUserCooldown = new Map();  // ruleId|user -> lastFiredMs

// Periodically prune stale per-user cooldown entries so the Map doesn't
// grow unbounded across a long stream.
setInterval(() => {
    const now = Date.now();
    for (const [k, t] of perUserCooldown) {
        if (now - t > 10 * 60 * 1000) perUserCooldown.delete(k);
    }
}, 5 * 60 * 1000).unref?.();

// ── Event normalisation ─────────────────────────────────────────────────
// Turns the raw socket payload into a canonical shape the rules test
// against. Derives viewer roles from whatever TikTok/Eulerstream exposes.
function normalizeEvent(raw) {
    const data = raw || {};
    let eventType = data.eventType || data.type || '';
    if (eventType === 'comment') eventType = 'chat';

    const user = data.username || data.user || data.nickname || '';
    const nickname = data.nickname || data.username || user;
    const comment = data.comment || data.text || '';

    // Roles — best effort from common payload shapes.
    const roles = new Set(['everyone']);
    if (data.isModerator || data.isMod || data.role === 'moderator') roles.add('moderator');
    if (data.isSubscriber || data.isSub || data.subscriber) roles.add('subscriber');
    if (data.isNewGifter || data.firstGift) roles.add('newGifter');
    if (data.followRole >= 1 || data.isFollower || data.following) roles.add('follower');
    if (data.topGifterRank > 0 || data.isTopGifter) roles.add('topGifter');

    return {
        userId: data.userId,
        eventType,
        user,
        nickname,
        profilePicture: data.profilePicture || '',
        comment,
        giftName: data.giftName || '',
        giftId: data.giftId != null ? String(data.giftId) : '',
        repeatCount: Number(data.count ?? data.repeatCount ?? 1) || 1,
        coins: Number(data.diamondCount ?? data.coins ?? 0) || 0,
        likeCount: Number(data.likeCount ?? 0) || 0,
        viewerCount: Number(data.viewerCount ?? 0) || 0,
        roles,
        raw: data,
    };
}

// ── Condition evaluation ────────────────────────────────────────────────
function coerce(v) {
    if (v == null) return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n;
}
function evalCondition(cond, ev) {
    const fieldVal = ev[cond.field];
    const a = coerce(fieldVal);
    const b = coerce(cond.value);
    switch (cond.op) {
        case '==': return String(a).toLowerCase() === String(b).toLowerCase();
        case '!=': return String(a).toLowerCase() !== String(b).toLowerCase();
        case '>=': return Number(a) >= Number(b);
        case '<=': return Number(a) <= Number(b);
        case '>': return Number(a) > Number(b);
        case '<': return Number(a) < Number(b);
        case 'includes': return String(a).toLowerCase().includes(String(b).toLowerCase());
        case 'startsWith': return String(a).toLowerCase().startsWith(String(b).toLowerCase());
        case 'regex': {
            try { return new RegExp(cond.value, 'i').test(String(fieldVal ?? '')); }
            catch { return false; }
        }
        default: return false;
    }
}

// ── Trigger matching ────────────────────────────────────────────────────
function triggerMatches(rule, ev) {
    const t = rule.trigger || {};
    if (t.type === 'any') return { ok: true };
    if (t.type !== ev.eventType) {
        // 'command' is a sub-type of chat
        if (!(t.type === 'command' && ev.eventType === 'chat')) return { ok: false };
    }

    if (t.type === 'gift') {
        const wantId = (t.giftId || '').trim();
        const wantName = (t.giftName || '').trim();
        if (wantId && wantId !== '*' && wantId !== ev.giftId) return { ok: false };
        if (wantName && wantName !== '*'
            && wantName.toLocaleLowerCase('tr-TR') !== ev.giftName.toLocaleLowerCase('tr-TR')) {
            return { ok: false };
        }
        return { ok: true };
    }

    if (t.type === 'command') {
        const prefix = t.commandPrefix || '!';
        const cmd = (t.command || '').trim().toLowerCase();
        const text = (ev.comment || '').trim();
        if (!text.startsWith(prefix)) return { ok: false };
        const firstWord = text.slice(prefix.length).split(/\s+/)[0].toLowerCase();
        if (cmd && firstWord !== cmd) return { ok: false };
        const params = text.slice(prefix.length).split(/\s+/).slice(1).join(' ');
        return { ok: true, commandParams: params };
    }

    return { ok: true };
}

// ── Role gating ─────────────────────────────────────────────────────────
function roleAllowed(rule, ev) {
    const allowed = rule.roles && rule.roles.length ? rule.roles : ['everyone'];
    if (allowed.includes('everyone')) return true;
    for (const r of allowed) if (ev.roles.has(r)) return true;
    return false;
}

// ── Cooldown checks ─────────────────────────────────────────────────────
function cooldownOk(rule, ev, now) {
    const id = String(rule._id);
    const g = Number(rule.cooldown?.globalMs || 0);
    if (g > 0) {
        const last = globalCooldown.get(id) || 0;
        if (now - last < g) return false;
    }
    const pu = Number(rule.cooldown?.perUserMs || 0);
    if (pu > 0 && ev.user) {
        const key = id + '|' + ev.user;
        const last = perUserCooldown.get(key) || 0;
        if (now - last < pu) return false;
    }
    return true;
}
function markCooldown(rule, ev, now) {
    const id = String(rule._id);
    if (Number(rule.cooldown?.globalMs || 0) > 0) globalCooldown.set(id, now);
    if (Number(rule.cooldown?.perUserMs || 0) > 0 && ev.user) {
        perUserCooldown.set(id + '|' + ev.user, now);
    }
}

// ── Placeholder substitution for action payload strings ─────────────────
function applyPlaceholders(str, ev, commandParams) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/%username%/gi, ev.user || '')
        .replace(/%nickname%/gi, ev.nickname || '')
        .replace(/%giftName%/gi, ev.giftName || '')
        .replace(/%repeatCount%/gi, String(ev.repeatCount))
        .replace(/%coins%/gi, String(ev.coins))
        .replace(/%likeCount%/gi, String(ev.likeCount))
        .replace(/%comment%/gi, ev.comment || '')
        .replace(/%params%/gi, commandParams || '');
}
function hydrateConfig(config, ev, commandParams) {
    const out = {};
    for (const [k, v] of Object.entries(config || {})) {
        out[k] = typeof v === 'string' ? applyPlaceholders(v, ev, commandParams) : v;
    }
    return out;
}

// ── Action dispatch ─────────────────────────────────────────────────────
const ELECTRON_TYPES = new Set(['keyboard', 'mouse', 'text', 'launch']);

function dispatchAction(io, userId, action, ev, commandParams) {
    const room = `user:${userId}`;
    const cfg = hydrateConfig(action.config, ev, commandParams);
    const ctx = {
        user: ev.user, nickname: ev.nickname, giftName: ev.giftName,
        repeatCount: ev.repeatCount, coins: ev.coins, profilePicture: ev.profilePicture,
    };

    if (ELECTRON_TYPES.has(action.type)) {
        // OS-level — only the Electron client acts on this.
        io.to(room).emit('execute-action', {
            actionType: action.type,
            // Electron's executeAction expects {type, value}
            type: action.type,
            value: cfg.value,
            command: cfg.command,
            cwd: cfg.cwd,
            repeatCount: action.type === 'keyboard' ? (cfg.repeatCount || 1) : 1,
            _ruleCtx: ctx,
        });
        return;
    }

    // Everything else is visual/audio — the MyActions overlay renders it.
    io.to(room).emit('action-fire', {
        actionId: String(action._id),
        actionType: action.type,
        name: action.name,
        config: cfg,
        context: ctx,
        fireId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
}

// ── Main entry ──────────────────────────────────────────────────────────
/**
 * @param {Object} rawEvent  the socket 'tiktok-event' payload (must carry userId)
 * @param {Object} ctx       { io }
 * @returns {Promise<{matched:number, fired:number}>}
 */
async function evaluate(rawEvent, ctx) {
    const io = ctx?.io;
    const ev = normalizeEvent(rawEvent);
    if (!ev.userId || !ev.eventType || !io) return { matched: 0, fired: 0 };

    // Pull candidate rules: enabled, this user, matching trigger type
    // (or 'any', or 'command' when the event is chat).
    const triggerTypes = [ev.eventType, 'any'];
    if (ev.eventType === 'chat') triggerTypes.push('command');
    const rules = await Rule.find({
        userId: ev.userId,
        enabled: true,
        'trigger.type': { $in: triggerTypes },
    }).sort({ sortOrder: 1, createdAt: 1 }).lean();

    if (!rules.length) return { matched: 0, fired: 0 };

    // Collect all action ids we may need, fetch once.
    const allActionIds = new Set();
    for (const r of rules) (r.actionIds || []).forEach((id) => allActionIds.add(String(id)));
    const actionDocs = await Action.find({
        _id: { $in: [...allActionIds] }, enabled: true,
    }).lean();
    const actionMap = new Map(actionDocs.map((a) => [String(a._id), a]));

    const now = Date.now();
    let matched = 0, fired = 0;

    for (const rule of rules) {
        const tm = triggerMatches(rule, ev);
        if (!tm.ok) continue;
        if (!roleAllowed(rule, ev)) continue;
        if (rule.conditions && rule.conditions.length
            && !rule.conditions.every((c) => evalCondition(c, ev))) continue;
        if (!cooldownOk(rule, ev, now)) continue;

        matched++;

        // Combo: how many times to fire the action set.
        let fires = 1;
        if (rule.combo === 'perGift' && ev.eventType === 'gift') {
            fires = Math.max(1, Math.min(Number(rule.comboCap || 50), ev.repeatCount));
        }

        const actions = (rule.actionIds || [])
            .map((id) => actionMap.get(String(id)))
            .filter(Boolean);
        if (!actions.length) continue;

        for (let i = 0; i < fires; i++) {
            for (const action of actions) {
                try {
                    dispatchAction(io, ev.userId, action, ev, tm.commandParams);
                    fired++;
                } catch (e) {
                    console.warn(`RuleEngine dispatch failed (${action.type}):`, e.message);
                }
            }
        }

        markCooldown(rule, ev, now);

        // Best-effort stats update (don't block the hot path).
        Rule.updateOne(
            { _id: rule._id },
            { $inc: { 'stats.fireCount': fires }, $set: { 'stats.lastFiredAt': new Date(), 'stats.lastUser': ev.user } }
        ).catch(() => {});
    }

    if (matched) {
        console.log(`   ⚙️  rules: ${matched} matched, ${fired} action(s) fired for ${ev.eventType}`);
    }
    return { matched, fired };
}

module.exports = { evaluate, normalizeEvent, _internals: { evalCondition, triggerMatches, roleAllowed } };
