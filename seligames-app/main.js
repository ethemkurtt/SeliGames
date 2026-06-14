const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const axios = require('axios');
const extractZip = require('extract-zip');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { io: ioClient } = require('socket.io-client');

// ────────────────────────────────────────────────────────────────────────
// OS-level input simulation — fires a keyboard shortcut / text / mouse
// click to whichever window currently has focus. User is expected to focus
// their game before starting to stream, so incoming gift-mapped shortcuts
// land in the game.
//
// Permissions:
//   macOS → System Settings → Privacy & Security → Accessibility → allow Electron/Terminal
//   Linux → requires `xdotool` installed (`apt install xdotool`)
//   Windows → PowerShell SendKeys, no extra setup
// ────────────────────────────────────────────────────────────────────────

// Parse a shortcut spec into modifiers + key.
//   "F2"          → { mods: [],          key: "F2"  }
//   "Shift+F2"    → { mods: ["shift"],   key: "F2"  }
//   "Ctrl+Shift+A"→ { mods: ["ctrl","shift"], key: "A" }
//   "+ö"          → { mods: ["shift"],   key: "ö"   }  (Tikfinity-style notation)
//   "++"          → { mods: ["shift"],   key: "+"   }
function parseShortcut(value) {
    let raw = String(value || '').trim();
    if (!raw) return { modifiers: [], key: '' };

    // Tikfinity-style leading "+" means Shift modifier. Strip it and prepend
    // an explicit Shift token so the regular split-by-+ logic still works.
    if (raw.startsWith('+') && raw.length > 1) {
        raw = 'shift+' + raw.slice(1);
    }

    // Split, but preserve a trailing "+" key (special case: shortcut for the
    // literal + key). "Shift++" → modifiers=[shift], key=+
    if (/\+$/.test(raw)) {
        const head = raw.slice(0, -1);
        const headParts = head.split('+').map((p) => p.trim()).filter(Boolean);
        return {
            modifiers: headParts.map((m) => m.toLowerCase()),
            key: '+',
        };
    }

    const parts = raw.split('+').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return { modifiers: [], key: '' };
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1).map((m) => m.toLowerCase());
    return { modifiers, key };
}

// Escape for AppleScript double-quoted strings.
//   "    → \"
//   \    → \\   (without this, a single \ kills the script)
function escShell(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

// SendKeys special chars must be wrapped in {} when used as a literal key.
// Otherwise + is interpreted as Shift, % as Alt, etc.
const SENDKEYS_SPECIAL = new Set(['+', '^', '%', '~', '(', ')', '{', '}', '[', ']']);
function sendKeysEscapeKey(k) {
    if (k.length === 1 && SENDKEYS_SPECIAL.has(k)) return `{${k}}`;
    if (k.length === 1) return k;
    return `{${k.toUpperCase()}}`;
}

function macKeyCode(key) {
    // Map common names to AppleScript key codes or the char itself
    const codes = {
        'enter': 36, 'return': 36, 'tab': 48, 'space': 49, 'delete': 51, 'backspace': 51,
        'escape': 53, 'esc': 53,
        'left': 123, 'right': 124, 'down': 125, 'up': 126,
        'f1': 122, 'f2': 120, 'f3': 99, 'f4': 118, 'f5': 96, 'f6': 97,
        'f7': 98, 'f8': 100, 'f9': 101, 'f10': 109, 'f11': 103, 'f12': 111
    };
    return codes[String(key).toLowerCase()] || null;
}

function execSim(bin, args) {
    return new Promise((resolve, reject) => {
        execFile(bin, args, { timeout: 3000 }, (err, stdout, stderr) => {
            // macOS Accessibility denied: osascript still exits 0 with empty
            // output. Inspect stderr for the well-known refusal strings and
            // surface a real error so the renderer can warn the user.
            const errText = (stderr || '').toString();
            const denied = /not authorized|not allowed to send keystrokes|errAEEventNotPermitted|-1719|-25211|assistive access/i.test(errText);
            if (err || denied) {
                const msg = denied
                    ? 'macOS Erişilebilirlik izni reddedildi — Sistem Ayarları → Gizlilik → Erişilebilirlik'
                    : (errText || err?.message || 'execSim hata');
                reject(new Error(msg));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function executeKeyboard(value) {
    const { modifiers, key } = parseShortcut(value);
    if (!key) throw new Error('empty shortcut');

    if (process.platform === 'darwin') {
        const modMap = { ctrl: 'control down', alt: 'option down', shift: 'shift down', cmd: 'command down', meta: 'command down' };
        const using = modifiers.map((m) => modMap[m]).filter(Boolean).join(', ');
        const usingPhrase = using ? ` using {${using}}` : '';
        const code = macKeyCode(key);
        const script = code !== null
            ? `tell application "System Events" to key code ${code}${usingPhrase}`
            : `tell application "System Events" to keystroke "${escShell(key.toLowerCase())}"${usingPhrase}`;
        return execSim('osascript', ['-e', script]);
    }
    if (process.platform === 'win32') {
        const mm = { ctrl: '^', alt: '%', shift: '+' };
        const prefix = modifiers.map((m) => mm[m] || '').join('');
        const k = sendKeysEscapeKey(key);
        const sendKeys = prefix + k;
        const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys.replace(/'/g, "''")}')`;
        return execSim('powershell.exe', ['-NoProfile', '-Command', script]);
    }
    // linux
    const mm = { ctrl: 'ctrl', alt: 'alt', shift: 'shift', cmd: 'super', meta: 'super' };
    const chain = [...modifiers.map((m) => mm[m] || m), key.toLowerCase()].join('+');
    return execSim('xdotool', ['key', chain]);
}

async function executeText(text) {
    if (process.platform === 'darwin') {
        return execSim('osascript', ['-e', `tell application "System Events" to keystroke "${escShell(text)}"`]);
    }
    if (process.platform === 'win32') {
        const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${String(text).replace(/'/g, "''").replace(/([+^%~{}()[\]])/g, '{$1}')}')`;
        return execSim('powershell.exe', ['-NoProfile', '-Command', script]);
    }
    return execSim('xdotool', ['type', '--', text]);
}

async function executeMouse(value) {
    const btn = String(value).toLowerCase();
    const map = { leftclick: 1, rightclick: 2, middleclick: 3 };
    if (process.platform === 'darwin') {
        // AppleScript click requires absolute coords; keeping mouse action off the MVP on macOS.
        throw new Error('mouse action not implemented on macOS');
    }
    if (process.platform === 'win32') {
        const mouseBtn = btn === 'rightclick' ? 'right' : 'left';
        const script = `Add-Type -Name U -Namespace W -MemberDefinition '[DllImport("user32.dll")]public static extern void mouse_event(uint f,int x,int y,uint d,int e);'; $d=${mouseBtn === 'right' ? '0x0008' : '0x0002'}; $u=${mouseBtn === 'right' ? '0x0010' : '0x0004'}; [W.U]::mouse_event($d,0,0,0,0); [W.U]::mouse_event($u,0,0,0,0)`;
        return execSim('powershell.exe', ['-NoProfile', '-Command', script]);
    }
    const bn = map[btn] || 1;
    return execSim('xdotool', ['click', String(bn)]);
}

async function executeAction(action) {
    if (!action || !action.value) throw new Error('empty action');
    if (action.type === 'keyboard') return await executeKeyboard(action.value);
    if (action.type === 'text') return await executeText(action.value);
    if (action.type === 'mouse') return await executeMouse(action.value);
    throw new Error(`unknown action type: ${action.type}`);
}

let mainWindow;
let tiktokConnection = null;
let backendSocket = null;
let backendAuthed = false;
let pendingEvents = [];
let currentSessionId = null;

// Runtime config — prefer config.json (gitignored, per-machine overrides)
// over config.default.json (committed). Renderer reads the same config via
// `window.api.getAppConfig()` so all URLs match.
function loadAppConfig() {
    // Look in both the dev/asar location (__dirname) AND the packaged
    // extraResources directory (process.resourcesPath). Without the latter,
    // packaged builds silently fell back to the hardcoded URLs below and
    // pointed at localhost — symptom was ECONNREFUSED ::1:3000 on launch.
    const candidates = [
        path.join(__dirname, 'config.json'),
        path.join(__dirname, 'config.default.json'),
    ];
    if (process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, 'config.json'));
        candidates.push(path.join(process.resourcesPath, 'config.default.json'));
    }
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
                console.log(`📦 Loaded config from ${p}: backend=${parsed.backendUrl} web=${parsed.webUrl}`);
                return parsed;
            }
        } catch (e) {
            console.warn(`Failed to read ${p}: ${e.message}`);
        }
    }
    // Defensive baseline → prod VPS, not localhost. If every config file is
    // missing the app still works against production instead of breaking.
    console.warn('⚠️  No config file found — using built-in prod baseline');
    return { backendUrl: 'http://187.124.29.94:3000', webUrl: 'http://187.124.29.94:5173' };
}

const APP_CONFIG = loadAppConfig();
const BACKEND_URL = APP_CONFIG.backendUrl;

function connectToBackendSocket(token) {
    if (backendSocket && backendSocket.connected) {
        console.log('🔌 Backend socket already connected');
        return;
    }

    backendSocket = ioClient(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10
    });

    backendSocket.on('connect', () => {
        console.log('✅ Connected to backend Socket.io');
        backendAuthed = false;
        backendSocket.emit('auth', { token });
    });

    backendSocket.on('auth-success', (data) => {
        console.log('🔐 Backend auth success:', data.userId);
        backendAuthed = true;
        // Flush any events that arrived during the connect→auth window so the
        // first gifts of a stream are never dropped server-side.
        if (pendingEvents.length) {
            for (const ev of pendingEvents.splice(0)) backendSocket.emit('tiktok-event', ev);
        }
        if (mainWindow) {
            mainWindow.webContents.send('backend-socket-status', { connected: true, userId: data.userId });
        }
    });

    backendSocket.on('auth-error', (data) => {
        console.error('🔐 Backend auth error:', data.error);
        backendAuthed = false;
        // Surface to renderer so it can clear stale token + force re-login.
        // Without this, the socket lives on without socket.userId and the
        // server silently drops every tiktok-event we forward.
        if (mainWindow) {
            mainWindow.webContents.send('backend-auth-error', { error: data.error });
        }
        try { backendSocket?.disconnect(); } catch {}
        backendSocket = null;
    });

    backendSocket.on('event-processed', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('event-processed', data);
        }
    });

    // Channel-points live updates → renderer (loyalty leaderboard refresh + toast).
    backendSocket.on('points-update', (data) => {
        if (mainWindow) mainWindow.webContents.send('points-update', data);
    });
    backendSocket.on('redeem-result', (data) => {
        if (mainWindow) mainWindow.webContents.send('redeem-result', data);
    });

    // Actions & Events engine — the backend fires OS-level actions
    // (keyboard / mouse / text / launch) by emitting 'execute-action' to
    // this user's room. Run them straight from the main process (it owns
    // executeAction + the launch handler). Honour repeatCount with a small
    // gap so games register discrete taps.
    backendSocket.on('execute-action', async (payload) => {
        try {
            const type = payload?.actionType || payload?.type;
            if (type === 'launch') {
                const parsed = _parseLaunch?.(payload.command);
                if (parsed) {
                    const child = spawn(parsed.bin, parsed.args, { detached: true, stdio: 'ignore', windowsHide: false });
                    child.unref?.();
                    console.log(`⚙️→🚀 rule-launched: ${payload.command}`);
                }
                return;
            }
            if (['keyboard', 'mouse', 'text'].includes(type)) {
                const action = { type, value: payload.value };
                const fires = Math.max(1, Math.min(20, Number(payload.repeatCount) || 1));
                for (let i = 0; i < fires; i++) {
                    try { await executeAction(action); }
                    catch (e) { console.warn('rule action failed:', e.message); break; }
                    if (i < fires - 1) await new Promise(r => setTimeout(r, 40));
                }
                console.log(`⚙️→⌨️ rule-fired ${type}:${payload.value} ×${fires}`);
                if (mainWindow) mainWindow.webContents.send('rule-action-fired', { type, value: payload.value, fires });
            }
        } catch (e) {
            console.warn('execute-action handler error:', e.message);
        }
    });

    backendSocket.on('disconnect', () => {
        console.log('🔌 Backend socket disconnected');
        backendAuthed = false;
        if (mainWindow) {
            mainWindow.webContents.send('backend-socket-status', { connected: false });
        }
    });

    backendSocket.on('connect_error', (err) => {
        console.error('🔌 Backend socket connection error:', err.message);
    });
}

function disconnectBackendSocket() {
    if (backendSocket) {
        backendSocket.disconnect();
        backendSocket = null;
    }
    backendAuthed = false;
    pendingEvents = [];
    currentSessionId = null;
}

// Open a URL in the system browser. Routed through IPC because the sandboxed
// preload cannot access `shell` directly. http/https only.
ipcMain.handle('open-external', (_e, url) => {
    try {
        const u = new URL(String(url));
        if (u.protocol === 'http:' || u.protocol === 'https:') { shell.openExternal(u.href); return { success: true }; }
        return { success: false, error: 'unsupported protocol' };
    } catch (e) { return { success: false, error: e.message }; }
});

function forwardEventToBackend(eventData) {
    if (!backendSocket || !backendSocket.connected) {
        console.warn('⚠️ Backend socket not connected, event not forwarded');
        return false;
    }
    // Server drops tiktok-event until the socket is authenticated. During the
    // brief connect→auth window, buffer instead of losing the event.
    if (!backendAuthed) {
        if (pendingEvents.length < 200) pendingEvents.push(eventData);
        return false;
    }
    backendSocket.emit('tiktok-event', eventData);
    return true;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0a0a0f',
        minWidth: 1200,
        minHeight: 700
    });

    mainWindow.loadFile('index.html');
}

// ─── Global hotkey: arm/disarm mod actions without bringing app to focus ─
// Default F8. Loaded from config.json (`modToggleHotkey`) so the user can
// override per machine. Renderer toggles via 'hotkey-toggle-mods' ipc.
let _registeredHotkey = null;
function registerModHotkey(accelerator) {
    if (_registeredHotkey) {
        try { globalShortcut.unregister(_registeredHotkey); } catch {}
        _registeredHotkey = null;
    }
    const acc = accelerator || APP_CONFIG.modToggleHotkey || 'F8';
    try {
        const ok = globalShortcut.register(acc, () => {
            if (mainWindow) mainWindow.webContents.send('hotkey-toggle-mods');
        });
        if (ok) {
            _registeredHotkey = acc;
            console.log(`⌨️  Global hotkey registered: ${acc} (toggle mod actions)`);
        } else {
            console.warn(`⌨️  Failed to register hotkey ${acc} — may be taken by another app`);
        }
    } catch (e) {
        console.warn(`⌨️  Hotkey error: ${e.message}`);
    }
}

app.whenReady().then(() => {
    createWindow();
    registerModHotkey();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch {}
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('set-mod-hotkey', async (event, accelerator) => {
    registerModHotkey(accelerator);
    return { success: !!_registeredHotkey, accelerator: _registeredHotkey };
});

ipcMain.handle('get-mod-hotkey', async () => ({ accelerator: _registeredHotkey || 'F8' }));

// ─── Launch a local game / arbitrary command ─────────────────────────────
// Accepts: full shell command, a single .exe / .app path, or a steam:// URI.
// Detached + stdio:ignore so the child outlives Electron and we don't leak
// pipes. Returns {success, pid} so the renderer can confirm visibly.
const { spawn } = require('child_process');
function _parseLaunch(input) {
    const cmd = (input || '').trim();
    if (!cmd) return null;
    // 1) steam:// or other URI — open via OS handler
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(cmd)) {
        if (process.platform === 'darwin') return { bin: 'open', args: [cmd] };
        if (process.platform === 'win32') return { bin: 'cmd', args: ['/c', 'start', '', cmd] };
        return { bin: 'xdg-open', args: [cmd] };
    }
    // 2) macOS .app bundle — must go through `open -a`
    if (process.platform === 'darwin' && /\.app(\/?)$/.test(cmd)) {
        return { bin: 'open', args: ['-a', cmd] };
    }
    // 3) Windows: a single .exe / .bat / .cmd / .lnk path (possibly quoted with
    //    spaces) — wrap in `cmd /c start "" "<path>"`. This opens the target
    //    in its own console session, so a long-running server-style .bat
    //    (Beyblade, Harita 2.1) keeps running after SeliGames quits.
    if (process.platform === 'win32' && /\.(exe|bat|cmd|lnk)"?$/i.test(cmd)) {
        const clean = cmd.replace(/^"|"$/g, '');
        return { bin: 'cmd', args: ['/c', 'start', '', clean] };
    }
    // 4) Otherwise: treat the whole thing as a shell command. Use the
    //    platform shell so quotes / args / pipes work as the user typed.
    if (process.platform === 'win32') return { bin: 'cmd', args: ['/c', cmd], shell: false };
    return { bin: '/bin/sh', args: ['-c', cmd] };
}

ipcMain.handle('launch-game', async (event, { command, cwd } = {}) => {
    try {
        const parsed = _parseLaunch(command);
        if (!parsed) return { success: false, error: 'Komut boş' };
        const opts = {
            detached: true,
            stdio: 'ignore',
            cwd: cwd || undefined,
            windowsHide: false,
        };
        const child = spawn(parsed.bin, parsed.args, opts);
        if (!child.pid) return { success: false, error: 'spawn pid yok' };
        child.unref();
        console.log(`🚀 Launched: ${command} (pid ${child.pid})`);
        return { success: true, pid: child.pid };
    } catch (error) {
        console.error('launch-game failed:', error);
        return { success: false, error: error.message };
    }
});

// Native picker for the launch path — narrower than the generic dialog,
// shows .exe/.app/.command/.sh and lets user pick a file (not a dir).
ipcMain.handle('pick-launch-file', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Oyun çalıştırılabiliri seç',
            buttonLabel: 'Seç',
            properties: ['openFile'],
            filters: process.platform === 'win32'
                ? [{ name: 'Çalıştırılabilir', extensions: ['exe', 'bat', 'cmd', 'lnk'] }, { name: 'Tümü', extensions: ['*'] }]
                : process.platform === 'darwin'
                    ? [{ name: 'macOS Uygulaması', extensions: ['app', 'command', 'sh'] }, { name: 'Tümü', extensions: ['*'] }]
                    : [{ name: 'Tümü', extensions: ['*'] }],
        });
        if (result.canceled || !result.filePaths?.length) return { success: false };
        return { success: true, path: result.filePaths[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC Handlers
ipcMain.handle('login', async (event, { email, password }) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('register', async (event, { username, email, password }) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, { username, email, password });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-mods', async () => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/mods`);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-profile', async (event, token) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('connect-tiktok', async (event, { token, tiktokUsername }) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/connect-tiktok`,
            { tiktokUsername },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('toggle-live', async (event, { token, isLive }) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/toggle-live`,
            { isLive },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('change-password', async (event, { token, currentPassword, newPassword }) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/change-password`,
            { currentPassword, newPassword },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-statistics', async (event, token) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/statistics`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

// Save mod configuration
ipcMain.handle('save-mod', async (event, { modTitle, modSettings, configContent }) => {
    try {
        // Use configContent if provided, otherwise generate basic config
        let finalConfig = configContent;

        if (!finalConfig) {
            // Fallback to basic config
            finalConfig = `===========================================\n`;
            finalConfig += `  ${modTitle} - Mod Yapılandırması\n`;
            finalConfig += `  Oluşturulma: ${new Date().toLocaleString('tr-TR')}\n`;
            finalConfig += `===========================================\n\n`;
            finalConfig += `TikTok Hediye Eşleştirmeleri:\n\n`;

            for (const [giftId, action] of Object.entries(modSettings)) {
                finalConfig += `${giftId} = ${action}\n`;
            }

            finalConfig += `\n===========================================\n`;
        }

        // Show save dialog
        const result = await dialog.showSaveDialog(mainWindow, {
            title: `${modTitle} - Oyun Dizinini Seç`,
            defaultPath: `${modTitle.replace(/\s+/g, '_')}_config.txt`,
            buttonLabel: 'Kaydet',
            message: 'Mod ayarlarını kaydetmek için oyun dizinini seçin',
            filters: [
                { name: 'Config Files', extensions: ['txt', 'ini', 'cfg'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) {
            return { success: false, error: 'İşlem iptal edildi' };
        }

        // Write config file
        fs.writeFileSync(result.filePath, finalConfig, 'utf-8');

        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('Save mod error:', error);
        return { success: false, error: error.message };
    }
});

function getGiftName(giftId) {
    const gifts = {
        'rose': '🌹 Gül (1 coin)',
        'heart': '❤️ Kalp (5 coin)',
        'finger_heart': '🫰 Parmak Kalp (5 coin)',
        'ice_cream': '🍦 Dondurma (10 coin)',
        'rainbow': '🌈 Gökkuşağı (20 coin)',
        'perfume': '💐 Parfüm (20 coin)',
        'swan': '🦢 Kuğu (25 coin)',
        'sports_car': '🏎️ Spor Araba (50 coin)',
        'lion': '🦁 Aslan (100 coin)',
        'fireworks': '🎆 Havai Fişek (100 coin)',
        'yacht': '🛥️ Yat (200 coin)',
        'rocket': '🚀 Roket (500 coin)',
        'castle': '🏰 Kale (1000 coin)',
        'planet': '🪐 Gezegen (5000 coin)',
        'universe': '🌌 Evren (10000 coin)'
    };
    return gifts[giftId] || giftId;
}

function getActionName(actionId) {
    if (actionId === 'none') return 'Hiçbir Şey';
    return actionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// TikTok Live Connection Handlers
ipcMain.handle('connect-tiktok-live', async (event, username) => {
    try {
        console.log('🔄 Connecting to TikTok Live:', username);

        // Close existing connection
        if (tiktokConnection) {
            try {
                tiktokConnection.disconnect();
            } catch (err) {
                console.log('Previous connection cleanup:', err.message);
            }
        }

        // Create new connection
        tiktokConnection = new WebcastPushConnection(username, {
            processInitialData: true,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            fetchRoomInfoOnConnect: true, // so connect() throws UserOfflineError on status=4
            requestPollingIntervalMs: 1000
        });

        // Pre-check: is the user ACTUALLY live right now? Without this, an offline
        // user often still has a (stale) roomId, so connect() resolves and the UI
        // falsely shows "connected" even though no events ever arrive. fetchIsLive()
        // checks HTML -> API -> Euler and returns false when the room status != live.
        // Only a definitive `false` blocks; if detection itself throws (transient
        // network), we fall through and let connect()'s own status=4 check decide.
        try {
            const isLive = await tiktokConnection.fetchIsLive();
            if (isLive === false) {
                tiktokConnection = null;
                return { success: false, error: '@' + username + ' şu anda canlı yayında değil. Yayın açıkken tekrar deneyin.' };
            }
        } catch (preErr) {
            console.log('fetchIsLive belirsiz, connect() kontrolüne bırakılıyor:', preErr.message);
        }

        // Connect
        const state = await tiktokConnection.connect();
        console.log('✅ Connected to TikTok Live!', state);

        // Send connection success to renderer
        mainWindow.webContents.send('tiktok-connected', {
            username: username,
            roomInfo: state.roomInfo,
            viewerCount: state.viewerCount || 0
        });

        // Event listeners — every event goes BOTH to the renderer (UI feed)
        // and to the backend socket (rules/overlays/points/Minecraft). The
        // backend forward lives here in main so it works no matter which page
        // the renderer is showing.
        const sendBoth = (type, rendererData, backendPayload) => {
            if (mainWindow) mainWindow.webContents.send('tiktok-event', { type, data: rendererData });
            if (backendPayload) forwardEventToBackend(backendPayload);
        };

        tiktokConnection.on('chat', (data) => {
            sendBoth('chat',
                { user: data.uniqueId, nickname: data.nickname, comment: data.comment, profilePicture: data.profilePictureUrl || '' },
                { eventType: 'chat', username: data.uniqueId, nickname: data.nickname, comment: data.comment, profilePicture: data.profilePictureUrl || '', count: 1 });
        });

        tiktokConnection.on('gift', (data) => {
            // streakEnd guard: for streakable gifts only count the final total
            // (giftType 1 && !repeatEnd means the combo is still running).
            if (data.giftType === 1 && !data.repeatEnd) {
                if (mainWindow) mainWindow.webContents.send('tiktok-event', {
                    type: 'gift-streak', data: { user: data.uniqueId, nickname: data.nickname, giftName: data.giftName, repeatCount: data.repeatCount }
                });
                return;
            }
            const count = data.repeatCount || 1;
            sendBoth('gift',
                { user: data.uniqueId, nickname: data.nickname, giftName: data.giftName, giftId: data.giftId, repeatCount: count, diamondCount: data.diamondCount },
                { eventType: 'gift', username: data.uniqueId, nickname: data.nickname, giftName: data.giftName, giftId: data.giftId, count, diamondCount: (data.diamondCount || 0) * count, profilePicture: data.profilePictureUrl || '' });
        });

        tiktokConnection.on('like', (data) => {
            sendBoth('like',
                { user: data.uniqueId, nickname: data.nickname, likeCount: data.likeCount, totalLikeCount: data.totalLikeCount },
                { eventType: 'like', username: data.uniqueId, nickname: data.nickname, likeCount: data.likeCount || 1, count: data.likeCount || 1 });
        });

        tiktokConnection.on('member', (data) => {
            sendBoth('member',
                { user: data.uniqueId, nickname: data.nickname },
                { eventType: 'member', username: data.uniqueId, nickname: data.nickname, count: 1 });
        });

        tiktokConnection.on('follow', (data) => {
            sendBoth('follow',
                { user: data.uniqueId, nickname: data.nickname },
                { eventType: 'follow', username: data.uniqueId, nickname: data.nickname, count: 1 });
        });

        tiktokConnection.on('share', (data) => {
            sendBoth('share',
                { user: data.uniqueId, nickname: data.nickname },
                { eventType: 'share', username: data.uniqueId, nickname: data.nickname, count: 1 });
        });

        tiktokConnection.on('roomUser', (data) => {
            sendBoth('roomUser',
                { viewerCount: data.viewerCount },
                { eventType: 'viewer', viewerCount: data.viewerCount || 0, count: 1 });
        });

        tiktokConnection.on('streamEnd', () => {
            mainWindow.webContents.send('tiktok-disconnected', {
                reason: 'Canlı yayın sona erdi'
            });
        });

        tiktokConnection.on('disconnect', () => {
            mainWindow.webContents.send('tiktok-disconnected', {
                reason: 'Bağlantı kesildi'
            });
        });

        return { success: true, message: 'Bağlantı başarılı' };
    } catch (error) {
        console.error('❌ TikTok Live connection error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('disconnect-tiktok-live', async (event) => {
    try {
        if (tiktokConnection) {
            tiktokConnection.disconnect();
            tiktokConnection = null;
        }
        return { success: true, message: 'Bağlantı kesildi' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Settings Handlers
ipcMain.handle('get-settings', async (event) => {
    try {
        const token = mainWindow.webContents.executeJavaScript('localStorage.getItem("token")');
        const response = await axios.get(`${BACKEND_URL}/api/auth/settings`, {
            headers: { Authorization: `Bearer ${await token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('update-settings', async (event, settings) => {
    try {
        const token = await mainWindow.webContents.executeJavaScript('localStorage.getItem("token")');
        const response = await axios.post(`${BACKEND_URL}/api/auth/settings`,
            { settings },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('update-gift-sound', async (event, { category, sound }) => {
    try {
        const token = await mainWindow.webContents.executeJavaScript('localStorage.getItem("token")');
        const response = await axios.post(`${BACKEND_URL}/api/auth/settings/gift-sounds`,
            { category, sound },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('update-tiktok-username', async (event, username) => {
    try {
        const token = await mainWindow.webContents.executeJavaScript('localStorage.getItem("token")');
        const response = await axios.post(`${BACKEND_URL}/api/auth/settings`,
            { tiktokUsername: username },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('update-profile', async (event, profileData) => {
    try {
        const token = await mainWindow.webContents.executeJavaScript('localStorage.getItem("token")');
        const response = await axios.post(`${BACKEND_URL}/api/auth/profile`,
            profileData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

// Overlay CRUD Handlers
async function getAuthToken() {
    return await mainWindow.webContents.executeJavaScript('localStorage.getItem("token")');
}

ipcMain.handle('get-overlays', async (event, query = {}) => {
    try {
        const token = await getAuthToken();
        const params = new URLSearchParams(query).toString();
        const response = await axios.get(`${BACKEND_URL}/api/overlays?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-overlay', async (event, id) => {
    try {
        const token = await getAuthToken();
        const response = await axios.get(`${BACKEND_URL}/api/overlays/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('create-overlay', async (event, data) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/overlays`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('update-overlay', async (event, id, data) => {
    try {
        const token = await getAuthToken();
        const response = await axios.put(`${BACKEND_URL}/api/overlays/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('delete-overlay', async (event, id) => {
    try {
        const token = await getAuthToken();
        const response = await axios.delete(`${BACKEND_URL}/api/overlays/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('reset-overlay', async (event, id) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/overlays/${id}/reset`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('wheel-spin', async (event, id) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/overlays/${id}/wheel/spin`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('subathon-control', async (event, id, action) => {
    try {
        const token = await getAuthToken();
        const valid = ['start', 'pause', 'reset'];
        if (!valid.includes(action)) return { success: false, error: 'invalid action' };
        const response = await axios.post(`${BACKEND_URL}/api/overlays/${id}/subathon/${action}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('increment-overlay', async (event, id, amount = 1) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/overlays/${id}/increment`, { amount }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

// Backend Socket Bridge
ipcMain.handle('connect-backend-socket', async () => {
    try {
        const token = await getAuthToken();
        if (!token) return { success: false, error: 'Token bulunamadı' };
        connectToBackendSocket(token);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('disconnect-backend-socket', async () => {
    disconnectBackendSocket();
    return { success: true };
});

ipcMain.handle('forward-tiktok-event', async (event, eventData) => {
    const sent = forwardEventToBackend(eventData);
    return { success: sent };
});

ipcMain.handle('start-live-session', async () => {
    if (!backendSocket || !backendSocket.connected) {
        return { success: false, error: 'Backend socket bağlı değil' };
    }
    currentSessionId = `session_${Date.now()}`;
    backendSocket.emit('start-session', { sessionId: currentSessionId });
    return { success: true, sessionId: currentSessionId };
});

ipcMain.handle('get-backend-socket-status', async () => {
    return {
        connected: backendSocket?.connected || false,
        sessionId: currentSessionId
    };
});

ipcMain.handle('get-events', async (event, query = {}) => {
    try {
        const token = await getAuthToken();
        const params = new URLSearchParams(query).toString();
        const response = await axios.get(`${BACKEND_URL}/api/events?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-event-stats', async (event, query = {}) => {
    try {
        const token = await getAuthToken();
        const params = new URLSearchParams(query).toString();
        const response = await axios.get(`${BACKEND_URL}/api/events/stats?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-event-sessions', async () => {
    try {
        const token = await getAuthToken();
        const response = await axios.get(`${BACKEND_URL}/api/events/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

// Gift catalog (public, no auth)
ipcMain.handle('get-gift-catalog', async () => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/gifts`);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Per-gift sound mapping
ipcMain.handle('set-gift-sound-mapping', async (event, giftName, entry) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/auth/settings/gift-sound-map`,
            { giftName, entry },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

// ─── Mods CRUD + per-user config ─────────────────────────────────────────
ipcMain.handle('create-mod', async (event, data) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/mods`, data);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('update-mod', async (event, id, data) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/mods/${id}`, data);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('delete-mod', async (event, id) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/mods/${id}`);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-mod-config', async (event, modId) => {
    try {
        const token = await getAuthToken();
        const response = await axios.get(`${BACKEND_URL}/api/mods/${modId}/config`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('save-mod-config', async (event, modId, data) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/mods/${modId}/config`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('set-mod-gift-action', async (event, modId, giftName, action) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/mods/${modId}/config/gift-action`,
            { giftName, action },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('install-mod', async (event, modId, installPath) => {
    const sendProgress = (payload) => {
        if (mainWindow) mainWindow.webContents.send('install-progress', { modId, ...payload });
    };

    try {
        const token = await getAuthToken();

        // 1. Fetch mod metadata + user's current gift-action config in parallel
        sendProgress({ phase: 'metadata', percentage: 0 });
        const [modResp, cfgResp] = await Promise.all([
            axios.get(`${BACKEND_URL}/api/mods/${modId}`),
            axios.get(`${BACKEND_URL}/api/mods/${modId}/config`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);
        const mod = modResp.data;
        const userConfig = cfgResp.data || { giftActions: {} };

        // 2. Get short-lived signed download URL. Backend returns either
        //    a signed `/api/mods/files/...?t=<jwt>` URL (uploaded file)
        //    or the legacy public `downloadUrl` (external CDN fallback).
        sendProgress({ phase: 'token', percentage: 5 });
        let downloadUrl = null;
        let expectedSize = null;
        try {
            const dlResp = await axios.get(`${BACKEND_URL}/api/mods/${modId}/download-token`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            downloadUrl = dlResp.data.url;
            expectedSize = dlResp.data.fileSize || null;
        } catch (e) {
            console.warn(`⚠️ download-token failed: ${e.response?.data?.error || e.message}`);
        }

        let archiveDownloaded = false;
        let archiveError = null;
        let archivePath = null;
        let archiveBytes = 0;

        // 3. Stream-download — pipes straight to disk so 2GB+ files don't
        //    blow up renderer memory. Throttled progress events.
        if (downloadUrl && installPath) {
            try {
                if (!fs.existsSync(installPath)) fs.mkdirSync(installPath, { recursive: true });
                archivePath = path.join(installPath, `${mod.title.replace(/\s+/g, '_')}.zip`);

                sendProgress({ phase: 'download', percentage: 5, downloadedBytes: 0, totalBytes: expectedSize || 0 });

                const dlResp = await axios.get(downloadUrl, {
                    responseType: 'stream',
                    timeout: 0,
                    validateStatus: (s) => s >= 200 && s < 300,
                });

                const totalBytes = expectedSize
                    || parseInt(dlResp.headers['content-length'] || '0', 10) || 0;

                let lastReport = Date.now();
                dlResp.data.on('data', (chunk) => {
                    archiveBytes += chunk.length;
                    const now = Date.now();
                    if (now - lastReport > 100 || archiveBytes === totalBytes) {
                        lastReport = now;
                        sendProgress({
                            phase: 'download',
                            downloadedBytes: archiveBytes,
                            totalBytes,
                            percentage: totalBytes ? Math.min(99, Math.round(5 + (archiveBytes / totalBytes) * 90)) : 50,
                        });
                    }
                });

                const writer = fs.createWriteStream(archivePath);
                dlResp.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                    dlResp.data.on('error', reject);
                });

                archiveDownloaded = true;
                console.log(`✓ Archive downloaded: ${archivePath} (${archiveBytes} bytes)`);
            } catch (dlErr) {
                archiveError = dlErr.message;
                console.warn(`⚠️ Archive download failed: ${dlErr.message}`);
                if (archivePath) try { fs.unlinkSync(archivePath); } catch { }
            }
        } else if (!downloadUrl) {
            archiveError = 'Bu mod için yüklü dosya yok ya da erişim reddedildi';
        }

        // 3.5. Auto-extract — install path is the user's GAME directory, so
        //      we unzip directly into it. ZIP authors structure their archives
        //      as if rooted at the game dir (e.g. `scripts/foo.asi` lands at
        //      `<gameDir>/scripts/foo.asi`). Existing files are overwritten.
        let extracted = false;
        let extractedFiles = 0;
        let extractError = null;

        if (archiveDownloaded && archivePath) {
            try {
                sendProgress({ phase: 'extract', percentage: 95, message: 'ZIP açılıyor...' });
                console.log(`→ Extracting ${archivePath} → ${installPath}`);

                // Count files first for progress
                const yauzl = require('yauzl');
                const fileCount = await new Promise((resolve) => {
                    yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
                        if (err) return resolve(0);
                        let count = 0;
                        zipfile.on('entry', () => { count++; zipfile.readEntry(); });
                        zipfile.on('end', () => resolve(count));
                        zipfile.readEntry();
                    });
                }).catch(() => 0);

                let processed = 0;
                await extractZip(archivePath, {
                    dir: installPath,
                    onEntry: (entry) => {
                        processed++;
                        if (fileCount && processed % 5 === 0) {
                            sendProgress({
                                phase: 'extract',
                                percentage: 95 + Math.min(3, Math.round((processed / fileCount) * 3)),
                                message: `Açılıyor: ${entry.fileName} (${processed}/${fileCount})`,
                            });
                        }
                    },
                });
                extractedFiles = processed || fileCount;
                extracted = true;
                console.log(`✓ Extracted ${extractedFiles} entries to ${installPath}`);

                // Optional: read manifest.json if mod author included one
                const manifestPath = path.join(installPath, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        console.log(`📋 Manifest detected:`, manifest.modId || '(unnamed)');
                        // Future: relocate files based on manifest.files mapping
                    } catch (mfErr) {
                        console.warn(`⚠️ manifest.json invalid: ${mfErr.message}`);
                    }
                }

                // Clean up the zip — files are now extracted and the archive is
                // pure overhead. Delete unless mod ships a `keep-archive` flag.
                try { fs.unlinkSync(archivePath); } catch { }
            } catch (exErr) {
                extractError = exErr.message;
                console.warn(`⚠️ Extract failed: ${exErr.message}`);
            }
        }

        // (Removed: seligames-config.json side-car write. Gift-action mappings
        //  already live in the backend per-user config; nothing on this client
        //  reads the file at runtime. Keystroke dispatch fires straight from
        //  the in-memory armedGiftIndex built by armModActions().)

        // Mark installed in backend
        sendProgress({ phase: 'finalize', percentage: 99 });
        const response = await axios.post(`${BACKEND_URL}/api/mods/${modId}/install`,
            { installPath },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        sendProgress({ phase: 'done', percentage: 100, archiveDownloaded, extracted, extractedFiles });
        return {
            success: true,
            data: response.data,
            meta: { archiveDownloaded, archiveError, archivePath, archiveBytes, extracted, extractedFiles, extractError, installPath }
        };
    } catch (error) {
        sendProgress({ phase: 'error', percentage: 0, error: error.message });
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

// Admin: delete uploaded mod file (keeps mod metadata)
ipcMain.handle('delete-mod-file', async (event, modId) => {
    try {
        const token = await getAuthToken();
        const response = await axios.delete(`${BACKEND_URL}/api/mods/${modId}/file`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('uninstall-mod', async (event, modId) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/mods/${modId}/uninstall`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-installed-mods', async () => {
    try {
        const token = await getAuthToken();
        const response = await axios.get(`${BACKEND_URL}/api/mods/user/installed`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-app-config', () => APP_CONFIG);

// Launch-on-startup toggle (Settings page). macOS/Windows native.
ipcMain.handle('set-launch-on-startup', (event, enabled) => {
    try {
        app.setLoginItemSettings({ openAtLogin: !!enabled, openAsHidden: false });
        return { success: true, enabled: !!enabled };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('get-launch-on-startup', () => {
    try { return { enabled: app.getLoginItemSettings().openAtLogin }; }
    catch { return { enabled: false }; }
});

// Save a data: URL (e.g. exported PNG) to disk via native save dialog
ipcMain.handle('save-data-url', async (event, { dataUrl, suggestedName }) => {
    try {
        if (!dataUrl || typeof dataUrl !== 'string') {
            return { success: false, error: 'Geçersiz dataUrl' };
        }
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return { success: false, error: 'dataUrl formatı tanınmadı' };
        const mime = match[1];
        const buf = Buffer.from(match[2], 'base64');
        const ext = mime.split('/')[1] || 'png';
        const defaultName = suggestedName || `seligames-export.${ext}`;

        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'PNG Olarak Kaydet',
            defaultPath: defaultName,
            buttonLabel: 'Kaydet',
            filters: [
                { name: 'PNG', extensions: ['png'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled || !result.filePath) {
            return { success: false, error: 'İptal edildi' };
        }
        fs.writeFileSync(result.filePath, buf);
        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('save-data-url error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('execute-action', async (event, action) => {
    try {
        await executeAction(action);
        return { success: true };
    } catch (e) {
        console.warn('executeAction failed:', e.message);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('pick-install-directory', async (event, modTitle) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: `${modTitle} — Oyun Dizinini Seç`,
            buttonLabel: 'Bu Klasöre Kur',
            message: `"${modTitle}" için oyunun yüklü olduğu klasörü seçin (örn. C:\\Program Files\\GTA V).\n\nMod ZIP'i bu klasöre otomatik açılacak.`,
            properties: ['openDirectory', 'createDirectory']
        });
        if (result.canceled || !result.filePaths?.length) {
            return { success: false, error: 'İptal edildi' };
        }
        return { success: true, data: { installPath: result.filePaths[0] } };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('replace-gift-sound-map', async (event, map) => {
    try {
        const token = await getAuthToken();
        const response = await axios.post(`${BACKEND_URL}/api/auth/settings/gift-sound-map/bulk`,
            { map },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});
