/**
 * mcrcon — tiny self-contained Source-RCON client for the local Minecraft
 * server (127.0.0.1:25575, never public). Hardened for live streaming:
 *
 *  - Commands are SERIALISED through one persistent socket, so a gift combo
 *    that fires N commands at once can never have two in flight — a retry on
 *    a stale socket then only ever affects its own command, never siblings.
 *  - Every command is SANITISED (single line, no control chars, length cap)
 *    so viewer-controlled placeholders (%username% etc.) can't inject.
 *  - A DENYLIST blocks destructive/admin verbs (op/ban/stop/whitelist/…) so a
 *    rule command — even a malicious one — can't nuke the shared server.
 *
 * Env overrides: MC_RCON_HOST, MC_RCON_PORT, MC_RCON_PASSWORD, MC_RCON_ENABLED.
 */
const net = require('net');

const CFG = {
    host: process.env.MC_RCON_HOST || '127.0.0.1',
    port: Number(process.env.MC_RCON_PORT || 25575),
    password: process.env.MC_RCON_PASSWORD || 'SeliMC_rc0n_2026',
    enabled: process.env.MC_RCON_ENABLED !== 'false',
};

const TYPE_AUTH = 3, TYPE_EXEC = 2;

// Verbs that could grief the shared server or escape the "fun command" intent.
const BLOCKED = /^(op|deop|ban|ban-ip|banlist|pardon|pardon-ip|stop|restart|whitelist|kick|save-off|save-all|save-on|debug|reload|datapack|perm|permission|lp|luckperms|pex|setidletimeout|gamerule|publish|jfr|transfer)\b/i;

function sanitizeCommand(cmd) {
    // Single physical line (RCON is one command line); strip control chars so
    // a viewer name/comment with a newline can't mangle or inject; cap length.
    return String(cmd || '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/^\s*\/+/, '')
        .trim()
        .slice(0, 400);
}

let sock = null;
let connected = false;
let connecting = null;
let reqId = 0;
let rbuf = Buffer.alloc(0);
const pending = new Map(); // id -> { resolve, reject, timer }  (≤1 at a time)
let chain = Promise.resolve(); // serialisation tail

function pkt(id, type, body) {
    const b = Buffer.from(body, 'utf8');
    const len = 10 + b.length;
    const buf = Buffer.alloc(4 + len);
    buf.writeInt32LE(len, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    b.copy(buf, 12);
    buf.writeInt16LE(0, 12 + b.length);
    return buf;
}

function teardown(err) {
    connected = false;
    if (sock) { try { sock.destroy(); } catch (_) {} sock = null; }
    rbuf = Buffer.alloc(0);
    for (const [, p] of pending) { clearTimeout(p.timer); p.reject(err || new Error('RCON disconnected')); }
    pending.clear();
}

function connect() {
    if (connected) return Promise.resolve();
    if (connecting) return connecting;
    connecting = new Promise((resolve, reject) => {
        let authPending = true;
        const s = net.connect({ host: CFG.host, port: CFG.port });
        const to = setTimeout(() => { reject(new Error('RCON connect timeout')); s.destroy(); }, 5000);
        s.on('connect', () => { sock = s; s.write(pkt(++reqId, TYPE_AUTH, CFG.password)); });
        s.on('data', (d) => {
            rbuf = Buffer.concat([rbuf, d]);
            while (rbuf.length >= 4 && rbuf.length >= 4 + rbuf.readInt32LE(0)) {
                const len = rbuf.readInt32LE(0);
                const frame = rbuf.subarray(0, 4 + len);
                rbuf = rbuf.subarray(4 + len);
                const fid = frame.readInt32LE(4);
                const body = frame.subarray(12, Math.max(12, frame.length - 2)).toString('utf8');
                if (authPending) {
                    authPending = false;
                    clearTimeout(to);
                    if (fid === -1) { reject(new Error('RCON auth failed (wrong password?)')); s.destroy(); return; }
                    connected = true; connecting = null; resolve();
                } else {
                    const p = pending.get(fid);
                    if (p) { clearTimeout(p.timer); pending.delete(fid); p.resolve(body); }
                }
            }
        });
        s.on('error', (e) => { clearTimeout(to); connecting = null; teardown(e); reject(e); });
        s.on('close', () => { connecting = null; teardown(new Error('RCON closed')); });
    });
    return connecting;
}

function execOnce(cmd) {
    return new Promise((resolve, reject) => {
        const id = ++reqId;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('RCON command timeout')); }, 6000);
        pending.set(id, { resolve, reject, timer });
        try { sock.write(pkt(id, TYPE_EXEC, cmd)); }
        catch (e) { clearTimeout(timer); pending.delete(id); reject(e); }
    });
}

// One command at a time. Retries once with a fresh socket (Minecraft drops
// idle RCON connections); because commands are serialised, that retry can
// only ever affect its own command.
async function runSerial(cmd, _retry = true) {
    try {
        await connect();
        return await execOnce(cmd);
    } catch (e) {
        if (_retry) { teardown(e); return runSerial(cmd, false); }
        throw e;
    }
}

/** Run one Minecraft command, resolving with the server's text response. */
async function sendCommand(command) {
    if (!CFG.enabled) throw new Error('RCON disabled (MC_RCON_ENABLED=false)');
    const cmd = sanitizeCommand(command);
    if (!cmd) return '';
    if (BLOCKED.test(cmd)) throw new Error('Bu komuta izin verilmiyor: ' + cmd.split(/\s+/)[0]);
    const run = chain.then(() => runSerial(cmd), () => runSerial(cmd));
    chain = run.then(() => {}, () => {}); // keep the chain alive past failures
    return run;
}

function status() { return { enabled: CFG.enabled, connected, host: CFG.host, port: CFG.port }; }

module.exports = { sendCommand, status, config: CFG, _sanitize: sanitizeCommand, _blocked: (c) => BLOCKED.test(sanitizeCommand(c)) };
