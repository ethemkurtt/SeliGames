// ─── Theme (dark / light) ──────────────────────────────────────────────────
// Apply the saved theme as early as possible so there is no dark→light flash
// on startup. Default is dark (no class).
(function applySavedThemeEarly() {
    try {
        if (localStorage.getItem('seli-theme') === 'light') {
            document.body.classList.add('light-theme');
        }
    } catch (e) { /* localStorage unavailable */ }
})();

// Toggle the light theme on/off and persist the choice. `isLight` true = light.
function applyTheme(isLight) {
    document.body.classList.toggle('light-theme', !!isLight);
    try { localStorage.setItem('seli-theme', isLight ? 'light' : 'dark'); } catch (e) {}
    // Keep every theme control in sync (settings checkbox is "Dark Theme")
    const darkCb = document.getElementById('dark-theme');
    if (darkCb) darkCb.checked = !isLight;
    const sideBtn = document.getElementById('theme-quick-toggle');
    if (sideBtn) {
        sideBtn.classList.toggle('is-light', !!isLight);
        const ic = sideBtn.querySelector('i');
        if (ic) ic.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
        const lbl = sideBtn.querySelector('span');
        if (lbl) lbl.textContent = isLight ? 'Açık Tema' : 'Koyu Tema';
    }
}

// Quick toggle used by the sidebar button — flips current state.
function toggleTheme() {
    const nowLight = !document.body.classList.contains('light-theme');
    applyTheme(nowLight);
    // Persist to backend too (mirrors the Settings "Karanlık Tema" switch)
    if (typeof updateSetting === 'function') updateSetting('darkTheme', !nowLight);
}

// Login functionality
const loginForm = document.getElementById('login-form');
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');

// The gift-picker modal is authored inside the gift-designer page; reparent it to
// <body> so it works from ANY page (mod detail, "Yeni Oyun Ekle" template, etc.).
// A page div is display:none when inactive, which hid the modal (0×0) elsewhere.
(function liftGiftPickerModal() {
    const m = document.getElementById('gd-picker-modal');
    if (m && m.parentElement !== document.body) document.body.appendChild(m);
})();

// Shared post-auth flow — used by BOTH login and register (register returns the
// same { token, user } shape as login, so the user is signed in immediately).
function applyAuthSuccess(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.user?.email) localStorage.setItem('lastEmail', data.user.email);

    loginOverlay.classList.add('hidden');
    appContainer.classList.add('active');

    loadUserInfo(data.user);
    loadDashboard();

    window.api.connectBackendSocket().then(res => {
        if (res.success) console.log('✅ Backend socket bridge connected');
        else console.warn('⚠️ Backend socket bridge failed:', res.error);
    });
}

// Tab switching between Login / Register
function switchAuthTab(which) {
    const isLogin = which === 'login';
    const lf = document.getElementById('login-form');
    const rf = document.getElementById('register-form');
    if (lf) lf.style.display = isLogin ? '' : 'none';
    if (rf) rf.style.display = isLogin ? 'none' : '';
    document.getElementById('tab-login')?.classList.toggle('active', isLogin);
    document.getElementById('tab-register')?.classList.toggle('active', !isLogin);
}
window.switchAuthTab = switchAuthTab;

// Prefill the last successfully used e-mail (convenience; no password is stored).
(function prefillLastEmail() {
    const last = localStorage.getItem('lastEmail');
    const emailEl = document.getElementById('email');
    if (last && emailEl) emailEl.value = last;
})();

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const result = await window.api.login({ email, password });
        if (result.success) {
            applyAuthSuccess(result.data);
        } else {
            alert('Giriş başarısız: ' + (result.error || 'Bilinmeyen hata'));
        }
    } catch (error) {
        alert('Bağlantı hatası');
    }
});

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        if (!username || !email || !password) { alert('Lütfen tüm alanları doldurun'); return; }
        if (password.length < 6) { alert('Şifre en az 6 karakter olmalı'); return; }

        try {
            const result = await window.api.register({ username, email, password });
            if (result.success && result.data?.token) {
                applyAuthSuccess(result.data);
            } else {
                alert('Kayıt başarısız: ' + (result.error || 'Bilinmeyen hata'));
            }
        } catch (error) {
            alert('Bağlantı hatası');
        }
    });
}

// Load user info
function loadUserInfo(user) {
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    const userNameDisplay = document.getElementById('user-name-display');

    // Profile page elements
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileUsernameDetail = document.getElementById('profile-username-detail');
    const profileEmailDetail = document.getElementById('profile-email-detail');

    const email = user.email || '';
    const username = user.username || (email ? email.split('@')[0] : 'Kullanıcı');

    if (userNameEl) userNameEl.textContent = username;
    if (userEmailEl) userEmailEl.textContent = email;
    if (userNameDisplay) userNameDisplay.textContent = username;

    if (profileUsername) profileUsername.textContent = username;
    if (profileEmail) profileEmail.textContent = email;
    if (profileAvatar) profileAvatar.textContent = username.charAt(0).toUpperCase();
    if (profileUsernameDetail) profileUsernameDetail.textContent = username;
    if (profileEmailDetail) profileEmailDetail.textContent = email;
}

// Navigation
function navigateTo(page) {
    // Remove active from all nav items and sub items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-sub-item').forEach(item => item.classList.remove('active'));

    // Add active to clicked nav item
    if (event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) navItem.classList.add('active');
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const pageEl = document.getElementById(page + '-page');
    if (pageEl) pageEl.classList.add('active');
    
    // Load page-specific data
    if (page === 'dashboard') loadDashboard();
    else if (page === 'tiktok') loadTikTokUsername();
    else if (page === 'settings') loadSettings();
    else if (page === 'profile') loadProfile();
    else if (page === 'mods') loadMods();
    else if (page === 'statistics') loadStatistics();
    else if (page === 'overlay-gallery') {
        document.getElementById('overlay-gallery-page')?.classList.add('active');
        if (typeof showGalleryTab === 'function') showGalleryTab('templates');
    }
    else if (page === 'gift-scanner') {
        document.getElementById('gift-scanner-page')?.classList.add('active');
    }
    else if (page === 'gift-sounds') {
        document.getElementById('gift-sounds-page')?.classList.add('active');
        renderGiftSoundMap();
    }
    else if (page === 'gift-designer') {
        document.getElementById('gift-designer-page')?.classList.add('active');
        initGiftDesigner();
    }
    else if (page === 'automation') {
        document.getElementById('automation-page')?.classList.add('active');
        initAutomation();
    }
    else if (page === 'loyalty') {
        document.getElementById('loyalty-page')?.classList.add('active');
        initLoyalty();
    }
}

// ═══════════════════ DASHBOARD ═══════════════════

async function loadDashboard() {
    try {
        const [modsRes, overlaysRes, statsRes, profileRes, eventsRes] = await Promise.all([
            window.api.getMods(),
            window.api.getOverlays({}),
            window.api.getEventStats(),
            window.api.getProfile(localStorage.getItem('token')),
            window.api.getEvents({ limit: '15' }),
        ]);

        // Mod count
        if (modsRes.success) setText('stat-mods', (modsRes.data || []).length);
        // Overlay count
        if (overlaysRes.success) setText('stat-overlays', (overlaysRes.data || []).length);

        // Event aggregates
        if (statsRes.success) {
            const s = statsRes.data || {};
            const totalGifts = (s.gift?.totalGiftCount || s.gift?.count || 0);
            const totalDiamonds = s.gift?.totalDiamonds || 0;
            const totalLikes = s.like?.totalLikes || s.like?.count || 0;
            setText('stat-total-gifts', totalGifts.toLocaleString('tr-TR'));
            setText('stat-total-diamonds', totalDiamonds.toLocaleString('tr-TR'));
            setText('stat-total-likes', totalLikes.toLocaleString('tr-TR'));
        }

        // TikTok username / live status
        if (profileRes.success) {
            const u = profileRes.data;
            const statusEl = document.getElementById('stat-tiktok-status');
            if (statusEl) {
                if (u.tiktokUsername) {
                    statusEl.innerHTML = u.isLive
                        ? `<span style="color:#ff2eb8">● CANLI</span><br><small style="color:#9d8bbf">@${u.tiktokUsername}</small>`
                        : `<span style="color:#9d8bbf">● OFFLINE</span><br><small style="color:#9d8bbf">@${u.tiktokUsername}</small>`;
                } else {
                    statusEl.innerHTML = `<span style="color:#ff2eb8;font-size:0.75rem">Profilden bağla</span>`;
                }
            }
        }

        // Recent activity feed
        if (eventsRes.success) renderRecentActivity(eventsRes.data?.events || []);
    } catch (err) {
        console.error('loadDashboard error:', err);
    }
}

function renderRecentActivity(events) {
    const el = document.getElementById('recent-activity');
    if (!el) return;
    if (!events.length) {
        el.innerHTML = `<i class="fas fa-inbox" style="font-size: 1.8rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
            <p style="font-size: 0.78rem;">Henüz aktivite yok. TikTok Canlı'ya bağlanınca burada görünecek.</p>`;
        el.style.textAlign = 'center';
        el.style.padding = '1.25rem';
        return;
    }
    el.style.textAlign = 'left';
    el.style.padding = '0';
    el.innerHTML = events.slice(0, 10).map(e => {
        const d = e.data || {};
        const user = d.nickname || d.user || '—';
        const time = new Date(e.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        let desc = '';
        if (e.eventType === 'gift') desc = `<b>${escapeHtml(d.giftName || 'hediye')}</b> × ${d.giftCount || 1} ${d.diamondCount ? `(💎 ${d.diamondCount})` : ''}`;
        else if (e.eventType === 'like') desc = `${d.likeCount || 1} ❤️`;
        else if (e.eventType === 'chat' || e.eventType === 'comment') desc = escapeHtml((d.comment || '').slice(0, 60));
        else if (e.eventType === 'follow') desc = 'takip etti';
        else if (e.eventType === 'share') desc = 'paylaştı';
        else if (e.eventType === 'member') desc = 'yayına katıldı';
        else if (e.eventType === 'viewer') desc = `${d.viewerCount || 0} izleyici`;
        return `
            <div style="padding:0.55rem 0.8rem;display:flex;gap:0.6rem;align-items:center;border-bottom:1px solid rgba(255,255,255,0.03);">
                <span style="font-size:1rem;width:22px;text-align:center;flex-shrink:0;">${typeIcon(e.eventType)}</span>
                <div style="flex:1;min-width:0;font-size:0.78rem;color:#d0d0d0;">
                    <b style="color:#ff2eb8;">${escapeHtml(user)}</b> <span style="color:#9d8bbf;">${desc}</span>
                </div>
                <span style="color:#9d8bbf;font-size:0.68rem;flex-shrink:0;">${time}</span>
            </div>`;
    }).join('');
}

// ═══════════════════ GIFT DESIGNER (Hediye Tasarımı) ═══════════════════
//
// Streamlabs/TikFinity tarzı bir tool — kullanıcı hediyeleri grid üzerinde
// konumlandırır, font/renk/border ayarlarını yapar, transparent PNG indirir.
// PNG'yi yayında "şu hediyeleri at" diye göstermek için kullanır.

const GD_LAYOUTS = {
    'classic': { slots: ['top', 'left', 'right'], cols: {} },
    'top-only': { slots: ['top'], cols: {} },
    'sides-only': { slots: ['left', 'right'], cols: {} },
    'two-sides': { slots: ['left', 'right'], cols: {} },
    'double-side-cols': { slots: ['left', 'right'], cols: { left: 2, right: 2 } },
    'double-top-rows': { slots: ['top'], cols: { top: 2 } },
    'four-corners': { slots: ['top', 'left', 'right', 'bottom'], cols: {} },
};

const GD_FONTS_GOOGLE = {
    'Luckiest Guy': 'Luckiest+Guy',
    'Bangers': 'Bangers',
    'Bebas Neue': 'Bebas+Neue',
    'Anton': 'Anton',
    'Russo One': 'Russo+One',
    'Permanent Marker': 'Permanent+Marker',
    'Press Start 2P': 'Press+Start+2P',
    'Pacifico': 'Pacifico',
    'Lobster': 'Lobster',
};

const GD_DEFAULT = {
    name: '',
    type: 'classic',
    font: 'Luckiest Guy',
    giftSize: 50,
    giftGap: 24,
    textGap: -6,
    lineHeight: 12,
    fontSize: 18,
    textColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 4,
    autoBlur: 0,
    grayscale: false,
    slots: { top: [], left: [], right: [], bottom: [] },
};

let giftDesign = JSON.parse(JSON.stringify(GD_DEFAULT));
let _gdInitialized = false;
let _gdPickerCtx = null; // { slot, itemId }
let _gdLoadedFonts = new Set();

const BACKEND_PROXY_BASE = () => `${BACKEND_URL}/api/proxy/image?url=`;
const gdProxify = (url) => url ? (BACKEND_PROXY_BASE() + encodeURIComponent(url)) : '';
const gdId = () => `gd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function initGiftDesigner() {
    if (!_gdInitialized) {
        // Load saved design from localStorage (if any)
        try {
            const saved = localStorage.getItem('giftDesign');
            if (saved) giftDesign = { ...GD_DEFAULT, ...JSON.parse(saved) };
        } catch {}
        // Load gift catalog (cached after first call)
        if (!giftCatalogCache.length) await loadGiftCatalog();
        _gdInitialized = true;
        // Push state to form fields
        gdSyncFormFromState();
    }
    gdLoadFont(giftDesign.font);
    renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    try { setGdPreviewBg(localStorage.getItem('gdPreviewBg') || 'transparent'); } catch {}
}

function gdSyncFormFromState() {
    const set = (id, prop, val) => { const el = document.getElementById(id); if (el) el[prop] = val; };
    set('gd-name', 'value', giftDesign.name);
    set('gd-type', 'value', giftDesign.type);
    set('gd-font', 'value', giftDesign.font);
    set('gd-giftSize', 'value', giftDesign.giftSize);
    set('gd-giftGap', 'value', giftDesign.giftGap);
    set('gd-textGap', 'value', giftDesign.textGap);
    set('gd-lineHeight', 'value', giftDesign.lineHeight);
    set('gd-fontSize', 'value', giftDesign.fontSize);
    set('gd-textColor', 'value', giftDesign.textColor);
    set('gd-borderColor', 'value', giftDesign.borderColor);
    set('gd-borderWidth', 'value', giftDesign.borderWidth);
    set('gd-autoBlur', 'value', giftDesign.autoBlur);
    set('gd-grayscale', 'checked', giftDesign.grayscale);
}

function gdLoadFont(family) {
    const slug = GD_FONTS_GOOGLE[family];
    if (!slug || _gdLoadedFonts.has(slug)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;
    document.head.appendChild(link);
    _gdLoadedFonts.add(slug);
}

function updateGiftDesign(layoutChanged) {
    const get = (id, prop = 'value') => document.getElementById(id)?.[prop];
    giftDesign.name = get('gd-name') || '';
    giftDesign.type = get('gd-type') || 'classic';
    giftDesign.font = get('gd-font') || 'Luckiest Guy';
    giftDesign.giftSize = Number(get('gd-giftSize')) || 75;
    giftDesign.giftGap = Number(get('gd-giftGap')) || 0;
    giftDesign.textGap = Number(get('gd-textGap')) || 0;
    giftDesign.lineHeight = Number(get('gd-lineHeight')) || 0;
    giftDesign.fontSize = Number(get('gd-fontSize')) || 24;
    giftDesign.textColor = get('gd-textColor') || '#FFFFFF';
    giftDesign.borderColor = get('gd-borderColor') || '#000000';
    giftDesign.borderWidth = Number(get('gd-borderWidth')) || 0;
    giftDesign.autoBlur = Number(get('gd-autoBlur')) || 0;
    giftDesign.grayscale = !!get('gd-grayscale', 'checked');

    gdLoadFont(giftDesign.font);
    if (layoutChanged) renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
}

function renderGiftDesignerSlots() {
    const wrap = document.getElementById('gd-slots');
    if (!wrap) return;
    const layout = GD_LAYOUTS[giftDesign.type] || GD_LAYOUTS.classic;
    const meta = {
        top:    { label: 'Üst Hediyeler',  icon: '↑', color: '#a855f7' },
        left:   { label: 'Sol Hediyeler',  icon: '←', color: '#a855f7' },
        right:  { label: 'Sağ Hediyeler',  icon: '→', color: '#ff2eb8' },
        bottom: { label: 'Alt Hediyeler',  icon: '↓', color: '#ffd700' },
    };

    wrap.innerHTML = layout.slots.map((slot) => {
        const items = giftDesign.slots[slot] || [];
        const m = meta[slot];
        return `
            <div class="gd-slot-card">
                <div class="gd-slot-header" style="color:${m.color};">
                    <span style="font-size:0.95rem;">${m.icon}</span> ${m.label}
                </div>
                ${items.map((item) => `
                    <div class="gd-slot-row" data-id="${item.id}">
                        <div class="gd-handle">⋮⋮</div>
                        ${item.iconUrl
                            ? `<img class="gd-icon" src="${gdProxify(item.iconUrl)}" alt="" onclick="openGiftPicker('${slot}','${item.id}')">`
                            : `<div class="gd-icon-placeholder" onclick="openGiftPicker('${slot}','${item.id}')">🎁</div>`}
                        <textarea rows="1" placeholder="${escapeHtml(item.giftName || 'metin')} — 2. satır için Enter"
                               title="2. satır için Enter'a bas (ör. GÜL ⏎ 100). | de kullanılabilir."
                               oninput="patchGiftItem('${slot}','${item.id}','text',this.value)">${escapeHtml(item.text || '')}</textarea>
                        <input type="color" value="${item.color || giftDesign.textColor}"
                               onchange="patchGiftItem('${slot}','${item.id}','color',this.value)">
                        <button class="gd-slot-btn add" title="Hediye seç" onclick="openGiftPicker('${slot}','${item.id}')">
                            <i class="fas fa-plus" style="font-size:0.65rem;"></i>
                        </button>
                        <button class="gd-slot-btn del" title="Sil" onclick="removeGiftItem('${slot}','${item.id}')">
                            <i class="fas fa-trash" style="font-size:0.65rem;"></i>
                        </button>
                    </div>
                `).join('')}
                <button class="gd-slot-add-all" onclick="addGiftItem('${slot}')">
                    <i class="fas fa-plus-circle"></i> Yeni Hediye Ekle
                </button>
            </div>
        `;
    }).join('');
}

function addGiftItem(slot) {
    if (!giftDesign.slots[slot]) giftDesign.slots[slot] = [];
    giftDesign.slots[slot].push({ id: gdId(), giftName: '', iconUrl: '', text: '', color: '' });
    renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
}

function removeGiftItem(slot, id) {
    if (!giftDesign.slots[slot]) return;
    giftDesign.slots[slot] = giftDesign.slots[slot].filter((i) => i.id !== id);
    renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
}

function patchGiftItem(slot, id, key, val) {
    const arr = giftDesign.slots[slot] || [];
    const item = arr.find((i) => i.id === id);
    if (!item) return;
    item[key] = val;
    renderGiftDesignerPreview();
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
}

// ─── Gift picker modal ────────────────────────────────────────────────

function openGiftPicker(slot, itemId) {
    _gdPickerCtx = { slot, itemId };
    document.getElementById('gd-picker-modal').classList.add('active');
    document.getElementById('gd-picker-search').value = '';
    renderGiftPickerList();
    setTimeout(() => document.getElementById('gd-picker-search')?.focus(), 50);
}

function closeGiftPicker() {
    _gdPickerCtx = null;
    document.getElementById('gd-picker-modal').classList.remove('active');
}

function renderGiftPickerList() {
    const list = document.getElementById('gd-picker-list');
    const countEl = document.getElementById('gd-picker-count');
    if (!list) return;
    const q = (document.getElementById('gd-picker-search')?.value || '').toLocaleLowerCase('tr-TR').trim();

    let items = [...giftCatalogCache];
    if (q) items = items.filter((g) => g.name.toLocaleLowerCase('tr-TR').includes(q) || String(g.coins).includes(q));
    items.sort((a, b) => a.coins - b.coins);

    if (countEl) countEl.textContent = `${items.length} / ${giftCatalogCache.length} hediye`;

    if (!items.length) {
        list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9d8bbf;padding:2rem;">Eşleşen hediye yok</div>';
        return;
    }

    list.innerHTML = items.map((g) => `
        <div class="gd-picker-card" onclick="pickGiftForSlot('${escapeHtml(g.name).replace(/'/g, "\\'")}', '${encodeURIComponent(g.icon)}')">
            <img src="${gdProxify(g.icon)}" alt="">
            <div class="name" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</div>
            <div class="coins">💎 ${g.coins}</div>
        </div>
    `).join('');
}

// When set, the gift picker hands the selection to this callback instead
// of the gift-designer slot logic. Used by the rule editor.
let _giftPickCallback = null;
function openGiftPickerFor(callback) {
    _giftPickCallback = callback;
    _gdPickerCtx = { slot: '__cb__', itemId: null };
    document.getElementById('gd-picker-modal').classList.add('active');
    document.getElementById('gd-picker-search').value = '';
    renderGiftPickerList();
    setTimeout(() => document.getElementById('gd-picker-search')?.focus(), 50);
}

function pickGiftForSlot(giftName, iconUrlEncoded) {
    if (_giftPickCallback) {
        const cb = _giftPickCallback;
        _giftPickCallback = null;
        closeGiftPicker();
        cb(giftName, decodeURIComponent(iconUrlEncoded));
        return;
    }
    if (!_gdPickerCtx) return;
    const { slot, itemId } = _gdPickerCtx;
    const arr = giftDesign.slots[slot] || [];
    const item = arr.find((i) => i.id === itemId);
    if (item) {
        item.giftName = giftName;
        item.iconUrl = decodeURIComponent(iconUrlEncoded);
    }
    closeGiftPicker();
    renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
}

// ─── Live preview rendering ────────────────────────────────────────────

function renderGiftDesignerPreview() {
    const preview = document.getElementById('gd-preview');
    if (!preview) return;
    const layout = GD_LAYOUTS[giftDesign.type] || GD_LAYOUTS.classic;
    preview.innerHTML = '';
    preview.style.fontFamily = `'${giftDesign.font}', sans-serif`;
    preview.style.color = giftDesign.textColor;

    // Reset wrapper height to its 16:9 baseline before measuring; JS will
    // expand below if content overflows downward.
    const wrap = preview.parentElement;
    if (wrap) {
        const baseH = Math.round(wrap.clientWidth * 9 / 16);
        wrap.style.height = baseH + 'px';
    }

    layout.slots.forEach((slot) => {
        const items = giftDesign.slots[slot] || [];
        if (!items.length) return;
        const cols = layout.cols[slot] || 1;
        const isHorizontal = slot === 'top' || slot === 'bottom';

        const container = document.createElement('div');
        container.style.position = 'absolute';
        const PAD = 24;
        // Height reserved for the top row — used to vertically push left/right
        // columns so they always start "one below" the top slot, even when top
        // is empty. Keeps slot positions tertipli + predictable.
        const TOP_RESERVED = giftDesign.giftSize + giftDesign.textGap + giftDesign.fontSize + PAD
            + (giftDesign.autoBlur > 0 ? giftDesign.autoBlur * 2 : 0); // icon blur margin reserves extra height

        // Corner-anchored layout:
        //   top    → top-left corner, items extend right
        //   right  → top-right corner, items extend down
        //   left   → top-left, but pushed down past the top row
        //   bottom → bottom-left corner, items extend right
        container.dataset.gdSlot = slot;
        if (slot === 'top') {
            container.style.top = PAD + 'px';
            container.style.left = PAD + 'px';
        } else if (slot === 'right') {
            container.style.top = PAD + 'px';
            container.style.right = PAD + 'px';
        } else if (slot === 'left') {
            // First-paint estimate; corrected below to the top row's REAL
            // height once layout settles (wrapped labels make it taller).
            container.style.top = (PAD + TOP_RESERVED) + 'px';
            container.style.left = PAD + 'px';
        } else if (slot === 'bottom') {
            container.style.bottom = PAD + 'px';
            container.style.left = PAD + 'px';
        }

        // Group items into rows/cols
        let rows = [items];
        if (cols > 1) {
            const per = Math.ceil(items.length / cols);
            rows = [];
            for (let i = 0; i < cols; i++) rows.push(items.slice(i * per, (i + 1) * per));
        }

        container.style.display = 'flex';
        container.style.flexDirection = isHorizontal ? (cols > 1 ? 'column' : 'row') : (cols > 1 ? 'row' : 'column');
        // Clear spacing model: giftGap = HORIZONTAL spacing ("Hediye Mesafesi"),
        // lineHeight = VERTICAL spacing ("Satır Arası"). Flex gaps can't be negative.
        const hGap = Math.max(0, giftDesign.giftGap);
        const vGap = Math.max(0, giftDesign.lineHeight);
        container.style.gap = (isHorizontal ? vGap : hGap) + 'px';
        // Anchor cards to the start edge of the slot — keeps multi-card rows
        // flush at the corner instead of drifting toward center.
        const startAlign = (slot === 'right') ? 'flex-end' : 'flex-start';
        container.style.alignItems = startAlign;
        container.style.justifyContent = 'flex-start';

        rows.forEach((rowItems) => {
            const rowEl = document.createElement('div');
            rowEl.style.display = 'flex';
            rowEl.style.flexDirection = isHorizontal ? 'row' : 'column';
            rowEl.style.gap = (isHorizontal ? hGap : vGap) + 'px';
            rowEl.style.alignItems = startAlign;
            rowEl.style.justifyContent = 'flex-start';

            rowItems.forEach((item) => {
                rowEl.appendChild(renderGiftCardEl(item));
            });
            container.appendChild(rowEl);
        });

        preview.appendChild(container);
    });

    // After layout: grow wrap if any top-anchored slot extends past the 16:9
    // baseline. Measured on next frame so flex/img sizes have settled.
    requestAnimationFrame(() => {
        if (!wrap) return;
        // Second pass: drop the LEFT column below the TOP row's actual
        // rendered height (wrapped labels can exceed the one-line estimate).
        const topC = preview.querySelector('[data-gd-slot="top"]');
        const leftC = preview.querySelector('[data-gd-slot="left"]');
        if (topC && leftC) {
            const PAD = 24;
            // Fixed gap below the top row — must NOT depend on lineHeight, otherwise
            // changing "Satır Arası" shifted the whole left column up/down (R3-7).
            leftC.style.top = Math.round(PAD + topC.getBoundingClientRect().height + 18) + 'px';
        }
        const wrapRect = wrap.getBoundingClientRect();
        const wrapTop = wrapRect.top;
        let maxBottom = 0;
        for (const child of preview.children) {
            const r = child.getBoundingClientRect();
            const localBottom = r.bottom - wrapTop;
            if (localBottom > maxBottom) maxBottom = localBottom;
        }
        const baseH = Math.round(wrap.clientWidth * 9 / 16);
        const PAD_BOTTOM = 24;
        const needed = Math.max(baseH, Math.ceil(maxBottom + PAD_BOTTOM));
        if (Math.abs(needed - wrap.clientHeight) > 1) {
            wrap.style.height = needed + 'px';
        }
    });
}

// Preview-only background (transparent / dark / white / green). The exported PNG
// is ALWAYS transparent (export captures #gd-preview, the bg lives on the wrapper).
function setGdPreviewBg(mode, _btn) {
    const wrap = document.querySelector('.gd-preview-wrap');
    if (wrap) {
        if (mode === 'transparent') { wrap.style.background = ''; wrap.style.backgroundColor = ''; }
        else { wrap.style.background = mode; }
    }
    document.querySelectorAll('.gd-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg === mode));
    try { localStorage.setItem('gdPreviewBg', mode); } catch {}
}

// Measure-fit: find the largest font size (≤ base) at which the label fits
// the card width in at most 2 lines without breaking words mid-word.
// Uses canvas measureText with the real font; +4% pads for letter-spacing.
const _gdMeasureCanvas = document.createElement('canvas');
// Normalize a label into explicit lines: a "|" or a literal newline forces a
// line break (so the user can put e.g. "GÜL|100" → "GÜL" over "100"). Returns
// an array of line strings (empty lines dropped).
function gdLabelLines(text) {
    return (text || '')
        .replace(/\s*\|\s*/g, '\n')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
}

function gdFitFontSize(text, baseFs, cardW, fontFamily) {
    const ctx = _gdMeasureCanvas.getContext('2d');
    const segments = gdLabelLines(text).map((s) => s.toLocaleUpperCase('tr-TR'));
    const allWords = segments.flatMap((s) => s.split(/\s+/).filter(Boolean));
    if (!allWords.length) return baseFs;
    for (let fs = baseFs; fs >= 9; fs--) {
        ctx.font = `${fs}px '${fontFamily}', sans-serif`;
        const longestWord = Math.max(...allWords.map((w) => ctx.measureText(w).width)) * 1.04;
        if (longestWord > cardW) continue;            // longest word must fit one line
        const spaceW = ctx.measureText(' ').width * 1.04;
        // Each explicit segment wraps independently; total lines is their sum.
        let totalLines = 0;
        for (const seg of segments) {
            const words = seg.split(/\s+/).filter(Boolean);
            if (!words.length) continue;
            let lines = 1, lineW = 0;
            for (const w of words) {
                const ww = ctx.measureText(w).width * 1.04;
                if (lineW > 0 && lineW + spaceW + ww > cardW) { lines++; lineW = ww; }
                else lineW += (lineW > 0 ? spaceW : 0) + ww;
            }
            totalLines += lines;
        }
        if (totalLines <= 2) return fs;
    }
    return 9;
}

function renderGiftCardEl(item) {
    const card = document.createElement('div');
    card.className = 'gd-card';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'flex-start';
    card.style.textAlign = 'center';
    // Uniform card width (a bit wider than the icon) keeps icons aligned
    // pixel-perfect across rows while giving labels room to breathe; the
    // label is measure-fitted below so it never spills over neighbours.
    const cardW = Math.round(giftDesign.giftSize * 1.7);
    card.style.width = cardW + 'px';
    card.style.flex = '0 0 auto';

    const img = document.createElement('img');
    img.src = item.iconUrl ? gdProxify(item.iconUrl) : 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="rgba(168, 85, 247,0.3)"/><text x="50%" y="58%" text-anchor="middle" font-size="44" fill="#a855f7" font-weight="bold">♪</text></svg>'
    );
    img.crossOrigin = 'anonymous';
    img.style.width = giftDesign.giftSize + 'px';
    img.style.height = giftDesign.giftSize + 'px';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.flex = '0 0 auto';
    const filters = [];
    if (giftDesign.grayscale) filters.push('grayscale(100%)');
    if (giftDesign.autoBlur > 0) filters.push(`blur(${giftDesign.autoBlur}px)`);
    img.style.filter = filters.join(' ') || 'none';
    // CSS blur bleeds ~N px beyond the element's box without enlarging its layout
    // box, so blurred icons used to smear over neighbours/text. Reserve that bleed
    // as margin so the layout accounts for it and nothing overlaps.
    if (giftDesign.autoBlur > 0) img.style.margin = giftDesign.autoBlur + 'px';
    card.appendChild(img);

    const text = item.text || item.giftName || '';
    if (text) {
        const txtEl = document.createElement('div');
        txtEl.className = 'gd-card-text';
        // Honor explicit line breaks ("|" or newline) so labels can be two lines
        // (e.g. name over coin value). pre-line collapses runs of spaces but keeps \n.
        txtEl.textContent = gdLabelLines(text).join('\n');
        txtEl.style.whiteSpace = 'pre-line';
        txtEl.style.textAlign = 'center';
        txtEl.style.marginTop = giftDesign.textGap + 'px';
        // Measure-fit the label: largest size (≤ chosen size) that fits the
        // card width in ≤2 lines without mid-word breaks. Short words like
        // "GÜL" stay full-size; long phrases shrink just enough.
        const fs = gdFitFontSize(text, giftDesign.fontSize, cardW, giftDesign.font);
        txtEl.style.fontSize = fs + 'px';
        txtEl.style.color = item.color || giftDesign.textColor;
        txtEl.style.fontFamily = `'${giftDesign.font}', sans-serif`;
        // Constrain text to the card width — wraps (≤2 lines by measure-fit)
        // instead of spilling over neighbouring cards.
        txtEl.style.width = cardW + 'px';
        txtEl.style.maxWidth = cardW + 'px';
        txtEl.style.overflowWrap = 'break-word'; // last-resort safety only
        txtEl.style.lineHeight = '1.12';
        // Smooth outline: 8 directions left visible gaps/smear at thick widths
        // (R3-5). Sample many angles across two radii so the outline merges into a
        // clean, even stroke like a sticker border.
        if (giftDesign.borderWidth > 0) {
            const w = giftDesign.borderWidth;
            const c = giftDesign.borderColor;
            const shadows = [];
            const N = 16;
            for (const rr of [w, w * 0.5]) {
                for (let a = 0; a < N; a++) {
                    const ang = (a / N) * Math.PI * 2;
                    shadows.push(`${(Math.cos(ang) * rr).toFixed(1)}px ${(Math.sin(ang) * rr).toFixed(1)}px 0 ${c}`);
                }
            }
            txtEl.style.textShadow = shadows.join(', ');
        }
        card.appendChild(txtEl);
    }

    return card;
}

// ─── Actions ──────────────────────────────────────────────────────────

function resetGiftDesign() {
    if (!confirm('Tüm tasarım sıfırlansın mı?')) return;
    giftDesign = JSON.parse(JSON.stringify(GD_DEFAULT));
    try { localStorage.removeItem('giftDesign'); } catch {}
    gdSyncFormFromState();
    renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    showToast('Tasarım sıfırlandı');
}

function saveGiftDesign() {
    try {
        localStorage.setItem('giftDesign', JSON.stringify(giftDesign));
        showToast('Tasarım kaydedildi ✓');
    } catch (e) {
        showToast('Kaydedilemedi: ' + e.message, true);
    }
}

// ── "Kaydedilenler": named, multi-slot gift-design library ──────────────
// Previously only ONE design persisted (the 'giftDesign' key got overwritten on
// every change). Now designs can be saved under names and reloaded any time.
const GD_LIB_KEY = 'giftDesigns';
function gdGetLibrary() {
    try { return JSON.parse(localStorage.getItem(GD_LIB_KEY) || '[]'); } catch { return []; }
}
function gdSetLibrary(arr) {
    try { localStorage.setItem(GD_LIB_KEY, JSON.stringify(arr)); } catch {}
}
function gdNewId() {
    return 'gd_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function saveGiftDesignAs() {
    const name = (prompt('Tasarım adı:', giftDesign.name || 'Tasarım') || '').trim();
    if (!name) return;
    const lib = gdGetLibrary();
    const clone = JSON.parse(JSON.stringify(giftDesign));
    clone.name = name;
    const stamp = new Date().toLocaleString('tr-TR');
    const existing = lib.find(d => (d.name || '').toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'));
    if (existing) {
        if (!confirm(`"${name}" zaten var. Üzerine yazılsın mı?`)) return;
        existing.design = clone; existing.savedAt = stamp;
    } else {
        lib.unshift({ id: gdNewId(), name, savedAt: stamp, design: clone });
    }
    gdSetLibrary(lib);
    giftDesign.name = name;
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
    showToast(`"${name}" kaydedildi ✓`);
}

function openGiftDesignsModal() {
    renderSavedGiftDesigns();
    const m = document.getElementById('gd-saved-modal');
    if (m) m.style.display = 'flex';
}
function closeGiftDesignsModal() {
    const m = document.getElementById('gd-saved-modal');
    if (m) m.style.display = 'none';
}
function renderSavedGiftDesigns() {
    const list = document.getElementById('gd-saved-list');
    if (!list) return;
    const lib = gdGetLibrary();
    if (!lib.length) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1.5rem;">Henüz kayıtlı tasarım yok. “Farklı Kaydet” ile ekleyin.</div>';
        return;
    }
    list.innerHTML = lib.map(d => `
        <div style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.8rem;border:1px solid var(--ov-04);border-radius:10px;background:rgba(255,255,255,0.02);">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.name)}</div>
                <div style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(d.savedAt || '')}</div>
            </div>
            <button class="btn-success" onclick="loadGiftDesignById('${d.id}')" style="padding:0.35rem 0.7rem;font-size:0.75rem;"><i class="fas fa-upload"></i> Yükle</button>
            <button class="btn-secondary" onclick="deleteGiftDesignById('${d.id}')" style="padding:0.35rem 0.6rem;font-size:0.75rem;color:#ff6b6b;" title="Sil"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}
function loadGiftDesignById(id) {
    const entry = gdGetLibrary().find(d => d.id === id);
    if (!entry) return;
    giftDesign = { ...GD_DEFAULT, ...JSON.parse(JSON.stringify(entry.design)) };
    if (!giftDesign.slots) giftDesign.slots = { top: [], left: [], right: [], bottom: [] };
    try { localStorage.setItem('giftDesign', JSON.stringify(giftDesign)); } catch {}
    gdSyncFormFromState();
    gdLoadFont(giftDesign.font);
    renderGiftDesignerSlots();
    renderGiftDesignerPreview();
    closeGiftDesignsModal();
    showToast(`"${entry.name}" yüklendi`);
}
function deleteGiftDesignById(id) {
    const entry = gdGetLibrary().find(d => d.id === id);
    if (!entry) return;
    if (!confirm(`"${entry.name}" silinsin mi?`)) return;
    gdSetLibrary(gdGetLibrary().filter(d => d.id !== id));
    renderSavedGiftDesigns();
    showToast('Silindi');
}

async function exportGiftDesignPng() {
    const preview = document.getElementById('gd-preview');
    if (!preview) return;
    if (typeof window.htmlToImage === 'undefined') {
        showToast('html-to-image yüklenmedi (script tag eksik)', true);
        return;
    }

    const btn = document.getElementById('gd-export-btn');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...'; }

    try {
        const dataUrl = await window.htmlToImage.toPng(preview, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: undefined, // transparent
            fetchRequestInit: { mode: 'cors' },
        });
        const filename = `${(giftDesign.name || 'hediye-tasarim').replace(/\s+/g, '_')}.png`;

        // Native save dialog via main process
        if (window.api?.saveDataUrl) {
            const result = await window.api.saveDataUrl({ dataUrl, suggestedName: filename });
            if (result.success) {
                showToast(`PNG kaydedildi → ${result.filePath}`);
            } else if (result.error !== 'cancelled') {
                showToast('Kaydedilemedi: ' + result.error, true);
            }
        } else {
            // Fallback: browser download
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            a.click();
        }
    } catch (e) {
        console.error('PNG export error:', e);
        showToast('PNG hatası: ' + e.message, true);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

// ═══════════════════ STATISTICS PAGE ═══════════════════

let statEventsCache = [];
let statEventFilter = 'all';

async function loadStatistics() {
    try {
        // 1. Per-type aggregates
        const statsResult = await window.api.getEventStats();
        if (statsResult.success) {
            const s = statsResult.data || {};
            const bySubtype = (type) => s[type] || { count: 0, totalDiamonds: 0, totalGiftCount: 0, totalLikes: 0 };

            const gift = bySubtype('gift');
            const like = bySubtype('like');
            const follow = bySubtype('follow');
            const chat = bySubtype('chat');
            const share = bySubtype('share');
            const totalDiamonds = gift.totalDiamonds || 0;

            setText('stat-gifts', (gift.totalGiftCount || gift.count || 0).toLocaleString('tr-TR'));
            setText('stat-gifts-sub', `${gift.count || 0} hediye olayı`);
            setText('stat-diamonds', totalDiamonds.toLocaleString('tr-TR'));
            setText('stat-likes', (like.totalLikes || like.count || 0).toLocaleString('tr-TR'));
            setText('stat-likes-sub', `${like.count || 0} beğeni olayı`);
            setText('stat-follows', (follow.count || 0).toLocaleString('tr-TR'));
            setText('stat-chat', (chat.count || 0).toLocaleString('tr-TR'));
            setText('stat-chat-sub', `${chat.count || 0} yorum`);
            setText('stat-shares', (share.count || 0).toLocaleString('tr-TR'));
            setText('stat-shares-sub', `${share.count || 0} paylaşım`);
        }

        // 2. Sessions
        const sessionsResult = await window.api.getEventSessions();
        renderSessions(sessionsResult.success ? sessionsResult.data : []);

        // 3. Recent events (last 200)
        const eventsResult = await window.api.getEvents({ limit: '200', offset: '0' });
        if (eventsResult.success) {
            statEventsCache = eventsResult.data?.events || [];
            renderStatEvents();
            renderTopGifters(statEventsCache);
        }

        // 4. Completed goals
        const overlaysResult = await window.api.getOverlays({});
        if (overlaysResult.success) {
            const goals = (overlaysResult.data || []).filter(ov =>
                ov.overlayType === 'goal' && ov.targetValue > 0 && ov.currentValue >= ov.targetValue
            );
            renderCompletedGoals(goals);
        }
    } catch (err) {
        console.error('loadStatistics error:', err);
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function renderSessions(sessions) {
    const el = document.getElementById('stats-sessions');
    const countEl = document.getElementById('stats-sessions-count');
    if (!el) return;
    if (countEl) countEl.textContent = sessions.length;

    if (!sessions.length) {
        el.innerHTML = '<div class="stats-empty">Henüz yayın yapılmamış</div>';
        return;
    }

    el.innerHTML = sessions.slice(0, 15).map(s => {
        const start = new Date(s.startedAt);
        const end = new Date(s.endedAt);
        const durMin = Math.round((end - start) / 60000);
        const dateStr = start.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const types = (s.types || []).map(t => typeIcon(t)).join(' ');
        return `
            <div class="session-row">
                <div class="session-dot"></div>
                <div class="session-main">
                    <div class="session-date">${dateStr} · ${timeStr}</div>
                    <div class="session-info">
                        <span>⏱ <b>${durMin}</b> dk</span>
                        <span>📊 <b>${s.eventCount.toLocaleString('tr-TR')}</b> event</span>
                        <span>${types || '—'}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderTopGifters(events) {
    const el = document.getElementById('stats-top-gifters');
    if (!el) return;

    const gifters = new Map();
    for (const e of events) {
        if (e.eventType !== 'gift') continue;
        const user = e.data?.nickname || e.data?.user || 'Bilinmeyen';
        const diamonds = e.data?.diamondCount || 0;
        const count = e.data?.giftCount || 1;
        const entry = gifters.get(user) || { user, diamonds: 0, gifts: 0 };
        entry.diamonds += diamonds;
        entry.gifts += count;
        gifters.set(user, entry);
    }

    const top = [...gifters.values()].sort((a, b) => b.diamonds - a.diamonds).slice(0, 10);
    if (!top.length) {
        el.innerHTML = '<div class="stats-empty">Henüz hediye alınmadı</div>';
        return;
    }

    const medals = ['👑', '🥈', '🥉'];
    el.innerHTML = top.map((g, i) => `
        <div class="stat-row">
            <div class="sr-rank">${medals[i] || (i + 1)}</div>
            <div class="sr-main">
                <div class="sr-user">${escapeHtml(g.user)}</div>
                <div class="sr-sub">${g.gifts.toLocaleString('tr-TR')} hediye</div>
            </div>
            <div class="sr-value gold">💎 ${g.diamonds.toLocaleString('tr-TR')}</div>
        </div>`).join('');
}

function typeIcon(t) {
    const m = { gift: '🎁', like: '❤️', follow: '➕', share: '🔁', chat: '💬', comment: '💬', member: '👋', viewer: '👁️' };
    return m[t] || '·';
}

function renderStatEvents() {
    const el = document.getElementById('stats-events-list');
    if (!el) return;

    const filtered = statEventFilter === 'all'
        ? statEventsCache
        : statEventsCache.filter(e => e.eventType === statEventFilter);

    if (!filtered.length) {
        el.innerHTML = '<div class="stats-empty">Bu tipte event bulunamadı</div>';
        return;
    }

    el.innerHTML = filtered.slice(0, 100).map(e => {
        const d = e.data || {};
        const user = d.nickname || d.user || '—';
        const time = new Date(e.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = new Date(e.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
        let sub = '';
        let value = '';
        if (e.eventType === 'gift') {
            sub = `${d.giftName || 'hediye'} × ${d.giftCount || 1}`;
            value = d.diamondCount ? `💎 ${d.diamondCount.toLocaleString('tr-TR')}` : '';
        } else if (e.eventType === 'like') {
            sub = `${d.likeCount || 1} kalp`;
        } else if (e.eventType === 'chat' || e.eventType === 'comment') {
            sub = d.comment || '';
        } else if (e.eventType === 'viewer') {
            sub = `${d.viewerCount || 0} izleyici`;
        } else {
            sub = e.eventType;
        }
        return `
            <div class="stat-row">
                <div class="sr-icon">${typeIcon(e.eventType)}</div>
                <div class="sr-main">
                    <div class="sr-user">${escapeHtml(user)}</div>
                    <div class="sr-sub">${escapeHtml(sub).slice(0, 80)}</div>
                </div>
                ${value ? `<div class="sr-value gold">${value}</div>` : ''}
                <div class="sr-time">${date}<br>${time}</div>
            </div>`;
    }).join('');
}

function filterStatEvents(type) {
    statEventFilter = type;
    document.querySelectorAll('[data-statfilter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.statfilter === type);
    });
    renderStatEvents();
}

function renderCompletedGoals(goals) {
    const el = document.getElementById('stats-completed-goals');
    const countEl = document.getElementById('stats-goals-count');
    if (!el) return;
    if (countEl) countEl.textContent = goals.length;

    if (!goals.length) {
        el.innerHTML = '<div class="stats-empty">Henüz tamamlanan hedef yok</div>';
        return;
    }

    const subTypeNames = { likes: 'Beğeni', follows: 'Takipçi', shares: 'Paylaşım', viewer_count: 'İzleyici', coins: 'Coin', subscribers: 'Abone', custom1: 'Özel 1', custom2: 'Özel 2', custom3: 'Özel 3' };
    el.innerHTML = goals.slice(0, 20).map(g => {
        const finishedAt = new Date(g.updatedAt || g.createdAt).toLocaleString('tr-TR');
        const sub = subTypeNames[g.subType] || g.subType;
        return `
            <div class="stat-row">
                <div class="sr-icon">🏆</div>
                <div class="sr-main">
                    <div class="sr-user">${escapeHtml(g.title)}</div>
                    <div class="sr-sub">${sub} • tamamlandı ${finishedAt}</div>
                </div>
                <div class="sr-value gold">${g.currentValue.toLocaleString('tr-TR')} / ${g.targetValue.toLocaleString('tr-TR')}</div>
            </div>`;
    }).join('');
}

// Sidebar accordion toggle - defined early for HTML onclick
function toggleAccordion(el) {
    // When the sidebar is collapsed, accordion bodies are display:none and their
    // sub-items (OBS katmanları vb.) are unreachable — clicking felt "dead". So if
    // collapsed, expand the sidebar first, then open the clicked accordion.
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        toggleSidebar();
    }
    var body = el.nextElementSibling;
    if (!body) return;
    var wasOpen = body.classList.contains('open');
    // close all
    var allBodies = document.querySelectorAll('.nav-accordion-body');
    var allHeaders = document.querySelectorAll('.nav-accordion-header');
    for (var i = 0; i < allBodies.length; i++) allBodies[i].classList.remove('open');
    for (var i = 0; i < allHeaders.length; i++) allHeaders[i].classList.remove('open');
    // toggle
    if (!wasOpen) {
        body.classList.add('open');
        el.classList.add('open');
    }
}

// Load profile data
async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const result = await window.api.getProfile(token);
        
        if (result.success) {
            const user = result.data;
            
            // Update display fields
            document.getElementById('profile-username').textContent = user.username || '';
            document.getElementById('profile-email').textContent = user.email || '';
            document.getElementById('profile-avatar').textContent = (user.username || 'U').charAt(0).toUpperCase();
            
            // Update editable fields
            document.getElementById('profile-username-edit').value = user.username || '';
            document.getElementById('profile-fullname-edit').value = user.fullName || '';
            document.getElementById('profile-tiktok-edit').value = user.tiktokUsername || '';
            document.getElementById('profile-phone-edit').value = user.phoneNumber || '';
            document.getElementById('profile-email-detail').value = user.email || '';
            
            console.log('✅ Profile loaded');
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

// Update profile field
async function updateProfileField(fieldName) {
    const fieldMap = {
        'username': 'profile-username-edit',
        'fullName': 'profile-fullname-edit',
        'tiktokUsername': 'profile-tiktok-edit',
        'phoneNumber': 'profile-phone-edit'
    };
    
    const inputId = fieldMap[fieldName];
    const input = document.getElementById(inputId);
    const btn = event.target.closest('.btn-update-field');
    
    if (!input) return;
    
    const value = input.value.trim();
    
    // Show loading
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const data = {};
        data[fieldName] = value;
        
        const result = await window.api.updateProfile(data);
        
        if (result.success) {
            // Show success
            btn.innerHTML = '<i class="fas fa-check-circle"></i>';
            btn.style.background = 'rgba(255, 46, 184, 0.4)';
            
            // Update display if username
            if (fieldName === 'username') {
                document.getElementById('profile-username').textContent = value;
                document.getElementById('profile-avatar').textContent = value.charAt(0).toUpperCase();
                
                // Update user info in sidebar
                const userNameEl = document.getElementById('user-name');
                if (userNameEl) userNameEl.textContent = value;
                
                // Update stored user data
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.username = value;
                localStorage.setItem('user', JSON.stringify(user));
            }
            
            console.log('✅ Profile field updated:', fieldName, value);
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.disabled = false;
            }, 1500);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Failed to update profile:', error);
        alert('❌ Güncelleme başarısız: ' + error.message);
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('new-password-confirm').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('⚠️ Lütfen tüm alanları doldurun!');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('⚠️ Yeni şifreler eşleşmiyor!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('⚠️ Yeni şifre en az 6 karakter olmalı!');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const result = await window.api.changePassword({
            token,
            currentPassword,
            newPassword
        });
        
        if (result.success) {
            alert('✅ Şifre başarıyla değiştirildi!');
            
            // Clear password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('new-password-confirm').value = '';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Failed to change password:', error);
        alert('❌ Şifre değiştirilemedi: ' + error.message);
    }
}

// ═══════════════════ GIFT SOUND MAP ═══════════════════

let giftCatalogCache = [];
let giftSoundMapCache = {}; // { giftName: { preset: 'coin' } | { mp3: 'data:audio/mpeg;base64,...', volume: 0.8 } }

async function loadGiftCatalog() {
    if (giftCatalogCache.length) return giftCatalogCache;
    try {
        const result = await window.api.getGiftCatalog();
        if (result.success) giftCatalogCache = result.data || [];
    } catch (e) { console.warn('gift catalog load failed', e); }
    return giftCatalogCache;
}

const GIFT_PRESET_OPTIONS = [
    { value: '', label: 'Ses yok' },
    { value: 'preset:bell', label: '🔔 Çan' },
    { value: 'preset:pop', label: '💨 Pop' },
    { value: 'preset:coin', label: '🪙 Coin' },
    { value: 'preset:chime', label: '🎵 Chime' },
    { value: 'preset:ding', label: '⭐ Ding' },
    { value: 'preset:sparkle', label: '✨ Sparkle' },
    { value: 'preset:fanfare', label: '🎺 Fanfare' },
    { value: 'preset:tada', label: '🎉 Tada' },
    { value: 'preset:wow', label: '😮 Wow' },
    { value: 'preset:victory', label: '🏆 Victory' },
    { value: 'preset:legendary', label: '⚡ Legendary' },
    { value: 'preset:epic', label: '🎆 Epic' },
    { value: 'preset:boop', label: '🔘 Boop' },
    { value: 'preset:blip', label: '📟 Blip' },
    { value: 'preset:bubble', label: '🫧 Baloncuk' },
    { value: 'preset:twinkle', label: '🌟 Pırıltı' },
    { value: 'preset:glassbell', label: '🔔 Cam Çan' },
    { value: 'preset:arcade', label: '🕹️ Arcade' },
    { value: 'preset:retro', label: '👾 Retro' },
    { value: 'preset:powerup', label: '🔼 Power-up' },
    { value: 'preset:levelup', label: '🆙 Level Up' },
    { value: 'preset:laser', label: '🔫 Lazer' },
    { value: 'preset:zap', label: '⚡ Zap' },
    { value: 'preset:whoosh', label: '💨 Whoosh' },
    { value: 'preset:magic', label: '🪄 Sihir' },
    { value: 'preset:bonus', label: '🎁 Bonus' },
    { value: 'preset:success', label: '✅ Başarı' },
    { value: 'preset:drumroll', label: '🥁 Davul' },
    { value: 'preset:gong', label: '🛕 Gong' },
    { value: 'preset:siren', label: '🚨 Siren' },
    { value: 'preset:alarm', label: '⏰ Alarm' },
    { value: 'preset:heartbeat', label: '❤️ Kalp Atışı' },
    { value: 'preset:jackpot', label: '🎰 Jackpot' },
];

async function renderGiftSoundMap() {
    await loadGiftCatalog();
    // also pull user's current map from backend
    try {
        const s = await window.api.getSettings();
        giftSoundMapCache = s.success ? (s.data?.settings?.giftSoundMap || {}) : {};
    } catch (e) { giftSoundMapCache = {}; }

    filterGiftSoundMap();
}

function filterGiftSoundMap() {
    const list = document.getElementById('gift-map-list');
    const countEl = document.getElementById('gift-map-count');
    if (!list) return;

    const q = (document.getElementById('gift-map-search')?.value || '').toLocaleLowerCase('tr-TR').trim();
    const filterMode = document.getElementById('gift-map-filter')?.value || 'all';

    let items = [...giftCatalogCache];
    if (q) items = items.filter(g => g.name.toLocaleLowerCase('tr-TR').includes(q) || String(g.coins).includes(q));
    if (filterMode === 'mapped') items = items.filter(g => giftSoundMapCache[g.name]);
    else if (filterMode === 'unmapped') items = items.filter(g => !giftSoundMapCache[g.name]);
    else if (filterMode === 'low') items = items.filter(g => g.coins < 10);
    else if (filterMode === 'mid') items = items.filter(g => g.coins >= 10 && g.coins < 100);
    else if (filterMode === 'high') items = items.filter(g => g.coins >= 100 && g.coins < 1000);
    else if (filterMode === 'epic') items = items.filter(g => g.coins >= 1000);

    items.sort((a, b) => a.coins - b.coins);
    if (countEl) countEl.textContent = `${items.length} görüntüleniyor`;

    // Update badges
    const total = giftCatalogCache.length;
    const mapped = Object.keys(giftSoundMapCache || {}).length;
    const mp3s = Object.values(giftSoundMapCache || {}).filter(e => e && e.mp3).length;
    setText('gift-total', total.toLocaleString('tr-TR'));
    setText('gift-mapped-count', mapped.toLocaleString('tr-TR'));
    setText('gift-mp3-count', mp3s.toLocaleString('tr-TR'));
    setText('gift-unmapped-count', (total - mapped).toLocaleString('tr-TR'));

    if (!items.length) {
        list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9d8bbf;padding:1.5rem;">Eşleşen hediye yok</div>';
        return;
    }

    list.innerHTML = items.map((g) => {
        const entry = giftSoundMapCache[g.name];
        const isMp3 = entry && entry.mp3;
        const presetVal = entry?.preset ? `preset:${entry.preset}` : '';
        const optionsHtml = GIFT_PRESET_OPTIONS.map(o =>
            `<option value="${o.value}" ${o.value === presetVal && !isMp3 ? 'selected' : ''}>${o.label}</option>`
        ).join('');
        const hasMapping = !!entry;
        return `
            <div class="gift-map-row ${hasMapping ? 'mapped' : ''}" data-name="${escapeHtml(g.name)}">
                <img class="gift-icon-sm" src="${g.icon}" alt="" onerror="this.style.display='none'">
                <div class="gift-map-meta">
                    <div class="gift-map-name">${escapeHtml(g.name)}</div>
                    <div class="gift-map-coins">💎 ${g.coins}${isMp3 ? ' <span class="gift-map-chip-mp3">MP3</span>' : ''}</div>
                </div>
                <div class="gift-map-controls">
                    <select class="gift-map-select" onchange="updateGiftSoundPreset('${escapeHtml(g.name).replace(/'/g, "\\'")}', this.value)">
                        ${optionsHtml}
                    </select>
                    <button class="gift-map-btn" onclick="uploadGiftMp3('${escapeHtml(g.name).replace(/'/g, "\\'")}')" title="MP3 yükle">
                        <i class="fas fa-upload"></i>
                    </button>
                    <button class="gift-map-btn btn-preview" onclick="previewGiftSound('${escapeHtml(g.name).replace(/'/g, "\\'")}')" title="Dinle">
                        <i class="fas fa-play"></i>
                    </button>
                    ${hasMapping ? `<button class="gift-map-btn btn-clear" onclick="clearGiftMapping('${escapeHtml(g.name).replace(/'/g, "\\'")}')" title="Eşlemeyi kaldır">
                        <i class="fas fa-times"></i>
                    </button>` : ''}
                </div>
            </div>`;
    }).join('');
}

async function updateGiftSoundPreset(giftName, selectValue) {
    if (!selectValue) { await clearGiftMapping(giftName); return; }
    const preset = selectValue.startsWith('preset:') ? selectValue.slice(7) : null;
    if (!preset) return;
    // preserve volume if previously set
    const prev = giftSoundMapCache[giftName];
    const entry = { preset, volume: prev?.volume ?? 1 };
    try {
        const result = await window.api.setGiftSoundMapping(giftName, entry);
        if (result.success) {
            giftSoundMapCache[giftName] = entry;
            filterGiftSoundMap();
            showToast(`"${giftName}" → ${preset}`);
        } else {
            showToast('Kaydedilemedi: ' + result.error, true);
        }
    } catch (e) {
        showToast('Bağlantı hatası', true);
    }
}

async function clearGiftMapping(giftName) {
    try {
        const result = await window.api.setGiftSoundMapping(giftName, null);
        if (result.success) {
            delete giftSoundMapCache[giftName];
            filterGiftSoundMap();
            showToast(`"${giftName}" eşlemesi kaldırıldı`);
        }
    } catch (e) { showToast('Silme hatası', true); }
}

async function clearAllGiftMappings() {
    const count = Object.keys(giftSoundMapCache || {}).length;
    if (!count) { showToast('Temizlenecek atama yok'); return; }
    if (!confirm(`${count} atama kalıcı olarak silinecek. Emin misin?`)) return;
    try {
        const result = await window.api.replaceGiftSoundMap({});
        if (result.success) {
            giftSoundMapCache = {};
            filterGiftSoundMap();
            showToast(`${count} atama temizlendi`);
        } else {
            showToast('Temizleme başarısız: ' + result.error, true);
        }
    } catch (e) { showToast('Bağlantı hatası', true); }
}

function uploadGiftMp3(giftName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mpeg,audio/mp3,.mp3,audio/wav,audio/ogg';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            if (!confirm(`Dosya boyutu ${Math.round(file.size/1024)}KB. 500KB üzerindeki dosyalar DB'yi şişirebilir. Yine de yükle?`)) return;
        }
        try {
            const base64 = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.onerror = reject;
                r.readAsDataURL(file);
            });
            const entry = { mp3: base64, volume: 1, filename: file.name };
            const result = await window.api.setGiftSoundMapping(giftName, entry);
            if (result.success) {
                giftSoundMapCache[giftName] = entry;
                filterGiftSoundMap();
                showToast(`"${giftName}" → ${file.name}`);
            } else {
                showToast('Kaydedilemedi: ' + result.error, true);
            }
        } catch (err) {
            console.error(err);
            showToast('Dosya okunamadı', true);
        }
    };
    input.click();
}

function previewGiftSound(giftName) {
    const entry = giftSoundMapCache[giftName];
    if (!entry) {
        // Fallback to tier-based preview
        const gift = giftCatalogCache.find(g => g.name === giftName);
        if (gift) {
            const tier = getGiftTier(gift.coins);
            playSound(giftSoundConfig[tier]);
            showToast(`Tier fallback: ${tier} (${giftSoundConfig[tier]})`);
        }
        return;
    }
    if (entry.mp3) {
        const audio = new Audio(entry.mp3);
        audio.volume = Math.max(0, Math.min(1, (entry.volume ?? 1) * getNotifVolume()));
        audio.play().catch(err => console.warn('mp3 play error', err));
    } else if (entry.preset) {
        playSound(entry.preset);
    }
}

// Hook into settings page load
const _origLoadSettings = typeof loadSettings === 'function' ? loadSettings : null;

// Load all settings from backend
// Runtime settings cache — read by other parts of the app so toggles
// actually take effect (not just persist).
let appSettings = {};

async function loadSettings() {
    try {
        const result = await window.api.getSettings();
        if (result.success && result.data.settings) {
            const settings = result.data.settings;
            appSettings = settings;

            const checkboxes = {
                'auto-update-mods': settings.autoUpdateMods,
                'notifications': settings.notifications,
                'launch-on-startup': settings.launchOnStartup,
                'dark-theme': settings.darkTheme,
                'tiktok-auto-connect': settings.tiktokAutoConnect,
                'tiktok-event-logging': settings.tiktokEventLogging,
                'gift-sounds-toggle': settings.tiktokSoundEffects,
                'tiktok-screen-notifications': settings.tiktokScreenNotifications
            };
            Object.entries(checkboxes).forEach(([id, value]) => {
                const checkbox = document.getElementById(id);
                if (checkbox) checkbox.checked = value !== false;
            });

            // Apply runtime effects of the loaded settings
            applySettingEffects(settings);
            console.log('✅ Settings loaded + applied');
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Apply the side-effects of settings (called on load + each change).
function applySettingEffects(s) {
    // Theme — darkTheme === false means the user wants the light theme.
    // (Backend wins over the early localStorage guess, then we re-cache it.)
    applyTheme(s.darkTheme === false);
    // Verbose TikTok event console logging
    window.DEBUG_TIKTOK_EVENTS = (s.tiktokEventLogging === true);
    // OS launch-on-startup — sync the native login item with the saved flag
    if (window.api?.setLaunchOnStartup) {
        window.api.setLaunchOnStartup(s.launchOnStartup === true).catch(() => {});
    }
}

// Update a single setting in the backend + apply its runtime effect now.
async function updateSetting(settingName, value) {
    appSettings[settingName] = value;
    try {
        const result = await window.api.updateSettings({ [settingName]: value });
        if (result.success) console.log('✅ Setting updated:', settingName, value);
    } catch (error) {
        console.error('Failed to update setting:', error);
    }
    // Immediate runtime effects
    if (settingName === 'darkTheme') {
        applyTheme(value === false);
        showToast(value === false ? 'Açık tema açıldı' : 'Koyu tema açıldı');
    }
    if (settingName === 'tiktokEventLogging') window.DEBUG_TIKTOK_EVENTS = (value === true);
    if (settingName === 'launchOnStartup' && window.api?.setLaunchOnStartup) {
        const r = await window.api.setLaunchOnStartup(value === true).catch(() => null);
        if (r?.success) showToast(value ? 'Başlangıçta otomatik açılacak' : 'Otomatik açılma kapatıldı');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    loginOverlay.classList.remove('hidden');
    appContainer.classList.remove('active');
}

// Check if already logged in
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (token && user) {
    loginOverlay.classList.add('hidden');
    appContainer.classList.add('active');
    loadUserInfo(JSON.parse(user));
    loadDashboard();

    window.api.connectBackendSocket().then(res => {
        if (res.success) console.log('✅ Backend socket bridge auto-connected');
        else console.warn('⚠️ Backend socket auto-connect failed:', res.error);
    });
}

// Stale/expired tokens cause the backend socket to fail auth and silently
// drop all forwarded events. Catch that case and bounce back to login so the
// user gets a fresh token without confusion ("eventler gelmiyor" symptom).
if (window.api?.onBackendAuthError) {
    window.api.onBackendAuthError((data) => {
        console.warn('🔐 Backend auth failed — clearing token & forcing re-login:', data?.error);
        try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch {}
        try { appContainer.classList.remove('active'); loginOverlay.classList.remove('hidden'); } catch {}
        if (typeof showToast === 'function') {
            showToast('Oturum süresi doldu — lütfen tekrar giriş yap', true);
        } else {
            alert('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }
    });
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggle-icon');

    sidebar.classList.toggle('collapsed');
    // Mirror the state on the container so the (now external) toggle button can
    // reposition itself to track the collapsed sidebar's right edge.
    const collapsed = sidebar.classList.contains('collapsed');
    document.getElementById('app-container')?.classList.toggle('sidebar-collapsed', collapsed);

    if (collapsed) {
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right');
    } else {
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-left');
    }
}

// Load Mods
let currentMod = null;
let modSettings = {};
let allMods = []; // Store all mods for filtering

let installedModIdSet = new Set();

// ═══════════════════ MOD ACTION DISPATCHER ═══════════════════
// When armed, every incoming TikTok event that matches a gift mapping on
// any installed mod fires the mapped action (keyboard shortcut / text / mouse)
// at the OS level via main.js.

// ─── Known TikTok gift IDs (TR market) ───────────────────────────────────
// Eulerstream sometimes sends only `giftId` without a name field. This
// table maps the most-used gift IDs to their canonical Turkish name so we
// can resolve mappings even when the payload is stripped. IDs sourced from
// the public tiktok-live-connector dataset.
const TIKTOK_GIFT_ID_TO_NAME = {
    5269: "TikTok",
    5282: "Kalp",
    5283: "Elmas aşk yüzüğü",
    5284: "Öpücük",
    5300: "Sceptre",
    5303: "Çay",
    5319: "Blue Bead",
    5336: "Make it rain",
    5348: "Unicorn Fantasy",
    5465: "Mishka Bear",
    5478: "Fantastik Kale",
    5486: "Mishka Bear",
    5487: "Finger Heart",
    5502: "Taç",
    5509: "Güneş gözlükleri",
    5524: "Çar",
    5566: "Mishka Bear",
    5585: "Konfeti",
    5586: "Kalpler",
    5587: "Altın Madeni",
    5593: "Zencefilli Kalp",
    5648: "Raya Yeşil Paketler",
    5655: "Gül",
    5658: "Parfüm",
    5659: "Kâğıttan Turna",
    5660: "Elle Kalp",
    5680: "Disko topu",
    5712: "Trophy",
    5731: "Mercan",
    5737: "Çiçekler",
    5738: "Kalp",
    5757: "Dondurma",
    5765: "Motorsiklet",
    5767: "Özel Jet",
    5774: "Deniz motoru",
    5783: "Havai fişek gösterisi",
    5785: "Aşk Yayı",
    5789: "Şahin",
    5827: "Dondurma Külahı",
    5853: "Altın Boks Eldivenleri",
    5868: "Rüzgâr gülü",
    5876: "Atari Oyunu",
    5879: "Donat",
    5897: "Kuğu",
    5924: "Elle Kalp",
    5937: "Asılı Işıklar",
    5976: "Sıcak Hava Balonu",
    5978: "Tren",
    5994: "Türk kahvesi",
    6007: "Boks Eldivenleri",
    6064: "GG",
    6089: "Spor Araba",
    6090: "Havai fişek",
    6093: "Futbol",
    6097: "Küçük Taç",
    6104: "Şapka",
    6149: "Yıldızlar Arası",
    6203: "Gün Batımı Otoyolu",
    6219: "Güllü Ayıcık",
    6233: "Birlikte Seyahat",
    6246: "Süper",
    6247: "Kalp",
    6267: "Corgi",
    6274: "Basketbol Kupası",
    6369: "Aslan",
    6416: "Damla Çikolatalı Kurabiye",
    6417: "Kulüp",
    6419: "Nar",
    6426: "Dombra",
    6427: "Şapka ve Bıyık",
    6431: "Sahil Günü",
    6437: "Çiçekten Taç",
    6479: "Davullar",
    6502: "Kabuk Enerjisi",
    6506: "Aşk Adası",
    6544: "Buzlu Meyve",
    6560: "Küçük Dino",
    6562: "Dans Edelim",
    6563: "Meteor Yağmuru",
    6564: "Vantilatör",
    6581: "Oyun Kumandası",
    6588: "Uzay Gemisi",
    6592: "TGIF",
    6635: "Gök Gürültüsü Çekici",
    6639: "Çilek & Krema",
    6642: "Valiz",
    6646: "Yavru Kedi Leon",
    6649: "Tüm Gücünü Göster",
    6652: "Şimşek",
    6661: "Kalbinden Öperim",
    6662: "Kale Silüeti",
    6671: "Seni Seviyorum",
    6713: "Tezahürat",
    6751: "TikTok Uzay Mekiği",
    6777: "Düdük",
    6781: "Karpuz Aşkı",
    6784: "Pasta Dilimi",
    6788: "Lazer Çubuğu",
    6789: "Kırmızı Halının Yıldızı",
    6790: "Kutlama Zamanı",
    6820: "Balina Dalışı",
    6833: "Castle Fantasy",
    6842: "Zürafa Gerry",
    6845: "Fil Ellie",
    6862: "Cooper Eve Uçuyor",
    6890: "Seni seviyorum",
    6911: "Balkabağı Arabası",
    6922: "Fil Ellie",
    6926: "Basket Topu",
    6928: "mısır",
    6942: "Unicorn Fantasy",
    6945: "Sahil Günü",
    6968: "Elle Kalp",
    7015: "Şemsiye",
    7037: "Ekim",
    7071: "Festival Bayrakları",
    7086: "Kırmızı Biber",
    7121: "Harika Konfeti",
    7122: "Hazine Tabancası",
    7123: "Parlak sıcak hava balonu",
    7124: "Özel Jet",
    7125: "Ayrıcalıklı Mekik",
    7136: "Altın Oyuncu",
    7168: "Para Tabancası",
    7171: "Kalkan",
    7204: "Panter Patisi",
    7215: "Şeker mi Şaka mı",
    7264: "Mishka Bear",
    7311: "Gol Sevinci",
    7312: "TikTok Universe+",
    7319: "Anka kuşu",
    7364: "Sceptre",
    7367: "Diamond King",
    7400: "Adam'ın Hayali",
    7459: "Fransız Stili El Sıkışma",
    7467: "Hayallerinin Peşinde",
    7501: "Merhaba Gezgin",
    7529: "Gizemli Havai Fişek",
    7569: "Oyun Kumandası",
    7598: "Korsan Gemisi",
    7610: "Ejderha Alevi",
    7620: "Uzay Gemisi",
    7627: "Şahin",
    7707: "maviyim",
    7764: "Yıldız Tahtı",
    7823: "Leon ve Aslan",
    7832: "Öpücük atmak",
    7841: "Sizinle",
    7871: "Davullar",
    7879: "İlgi Odağı",
    7881: "Sihir Sahnesi",
    7882: "Davullar",
    7883: "Gitar",
    7886: "Müzik Çalma",
    7899: "Bouncing Ball",
    7934: "Beni Sev",
    7963: "Elmas Ağacı",
    7983: "Griffin",
    7985: "Aslan Yelesi",
    8004: "Oyuncu Kedi",
    8042: "ABD'de Seyahat",
    8086: "Drift Yapan Araba",
    8130: "Köpük Tabancası",
    8188: "Dans Eden Ayılar",
    8243: "Neşelen",
    8244: "Eller Yukarı",
    8245: "Başlıyoruz",
    8247: "Mutlu Partiler",
    8248: "Aşk Uçuşu",
    8259: "İşaret dili aşkı",
    8260: "Fil Hortumu",
    8264: "İyi Hafta Sonları",
    8265: "İyi Cumalar",
    8266: "Tünaydın",
    8267: "İyi Akşamlar",
    8268: "İyi Geceler",
    8269: "Günaydın",
    8277: "Aşk Damlası",
    8355: "panter",
    8358: "Panter Patisi",
    8391: "Balina Sam",
    8392: "Şarkı Söyleyen Kurbağalar",
    8417: "Ahtapot",
    8419: "Kırmızı Yıldırım",
    8420: "Yıldız Tahtı",
    8456: "Zeus",
    8469: "Kurt",
    8495: "Peri kanatları",
    8503: "Şahin",
    8564: "Traktör",
    8568: "Bran Castle",
    8582: "TikTok Stars",
    8599: "Cabrio Araba",
    8600: "Pozitif enerji",
    8602: "Goril",
    8603: "Leopar",
    8606: "dinozor",
    8624: "Zeus",
    8641: "Karusel",
    8648: "Pencere Çiçekliği",
    8651: "Savaşan Şahin",
    8692: "Merhaba Ayıcık",
    8708: "Elmaslı Uçuş",
    8723: "Gökkuşağı",
    8739: "Leopar",
    8750: "Altın Mikrofon",
    8769: "Hediye yağmuru",
    8778: "Kurt",
    8806: "Dans Eden Kapibaralar",
    8852: "Fok Pamuk",
    8868: "Süper kahraman dövüşü",
    8873: "TikTok Tacı",
    8887: "Çeşme",
    8889: "Pembe Rüya",
    8892: "Rüya Takım",
    8912: "Gül Nebulası",
    8913: "Rosa",
    8914: "Sonsuzluk Gülü",
    8916: "Leon ve Lili",
    8964: "Oyun Koltuğu",
    8970: "Piramitler",
    8972: "Parlayan Denizanası",
    8988: "Uzaylı DJ",
    9033: "Yaz Zamanı",
    9043: "Ayı Pim",
    9072: "TikTok Universe",
    9087: "Yanan kalp",
    9092: "Ateş Anka kuşu",
    9097: "Doğum günü pastası",
    9101: "TikTok Universe",
    9138: "Ünlü Kişi",
    9139: "Ekip Bilekliği",
    9154: "Bebek Ejderha",
    9235: "Dinamik Müzik",
    9355: "Çok Sevimli",
    9383: "Kırmızı Biber",
    9427: "Kanatlı At",
    9457: "ASMR Başlangıç Kiti",
    9458: "ASMR Zamanı",
    9465: "Meyve Arkadaşlar",
    9466: "Lunapark",
    9467: "Leopar Lili",
    9468: "Ritmik Ayı",
    9477: "Parıldayan Yıldız",
    9486: "Saksafon",
    9498: "Çiçek Açan Şeritler",
    9500: "Uçan Jetler",
    9521: "dinozor",
    9532: "Parlak Parla",
    9537: "Ateşle",
    9553: "Dondurma",
    9575: "Aile",
    9588: "Ay Işığı Çiçeği",
    9589: "Doğum Günü Gözlüğü",
    9622: "Alkış",
    9623: "Mikrofon Bırakma",
    9717: "Şanslı Airdrop Kutusu",
    9824: "Aşk Kilidi",
    9825: "Büyülü Ritim",
    9843: "Yat",
    9892: "Yıldız Işığı Asası",
    9894: "Vulcan",
    9909: "Tebrik Kartı",
    9933: "Yumruk Tokuşturma",
    9947: "Dostluk Kolyesi",
    9948: "Harikasın",
    9967: "Kalp Bulutu",
    10065: "Gorilla",
    10165: "Elmas Uçuşu",
    10175: "1. Yıl Dönümü",
    10176: "2. Yıl Dönümü",
    10177: "3. Yıl Dönümü",
    10188: "Gondola Binen Leon",
    10216: "Takke",
    10264: "Çadır",
    10282: "Öpücük",
    10294: "Şirin Koyun",
    10300: "Kelebek",
    10344: "Zafer Kanadı",
    10347: "Büyük Patates",
    10382: "Kayan Yıldızlar",
    10396: "Oyun Klavyesi",
    10398: "Spark",
    10407: "Dikkat et",
    10423: "Club Müzik",
    10430: "Boğa",
    10448: "Kalp Bulutu",
    10469: "Koala",
    10482: "CANLI Yayın",
    10521: "Kiraz Çiçekli Tavşan",
    10526: "Kalp Bulutu",
    10547: "Sıkılan Yanaklar",
    10552: "Çoban Köpeği",
    10588: "Elmas Silah",
    10595: "Sushi Seti",
    10602: "Beyaz Gül",
    10604: "Tofu",
    10612: "Bırak Konuşsun",
    10619: "Gimme The Mic",
    10645: "Nakavt",
    10649: "Üstü Açılabilen Araba",
    10667: "VR Gözlükleri",
    10668: "Gelecekte Karşılaşma",
    10669: "Gelecek Şehri",
    10670: "Gelecek Yolculuğu",
    10672: "Yeni Şehirde Sam",
    10697: "Creator's Cap",
    10701: "Goril",
    10702: "Yunus",
    10716: "Öpücük atmak",
    10720: "Yazlık Ev",
    10764: "Sarılalım",
    10778: "Denizyıldızı Plajı",
    10787: "Tiny Diny Şov",
    10788: "Tiny Diny Davulda",
    10798: "Glitter Cap",
    10802: "\"Beni Sev\" Gösterisi",
    10863: "Koala Aşkı",
    10886: "Patates spagetti yiyor",
    10892: "Kurt",
    10925: "Van Kedisi",
    10990: "Dondurmalı patates",
    10991: "Yüzen patates",
    11017: "Kelebek",
    11046: "Galaksi",
    11079: "Sahil Kulübesi",
    11091: "Oyun Konsolu",
    11108: "EWC",
    11109: "EWC Kupası",
    11177: "Kahve Sihri",
    11178: "Keyifli Kaz",
    11179: "Yaramaz Tavuk",
    11180: "Aşk Boyası",
    11181: "Tom'un Sarılışı",
    11183: "Sizin İçin Çalsın",
    11365: "Blue Heart",
    11366: "Kutab",
    11382: "LIVE Island",
    11403: "Çöl Kurdu",
    11419: "Çiftlik",
    11434: "Yanan kalp",
    11435: "Mirket",
    11491: "Zürafa",
    11495: "Aile",
    11513: "Çöl Kurdu",
    11514: "Van Kedisi",
    11521: "Manifesting",
    11523: "dinozor",
    11524: "Manifesting",
    11574: "Altın kolye",
    11583: "DJ Gözlüğü",
    11584: "Kontrol Altında",
    11585: "Sıkı Çalış Daha Sıkı Eğlen",
    11586: "Parti Hiç Bitmesin",
    11669: "Çöl Kurdu",
    11671: "Manifesting",
    11808: "Rock Yıldızı",
    11809: "Çarpan Kalp",
    11810: "Konseriniz",
    11811: "Hayvan Grubu",
    11838: "Elmas Silah",
    11852: "Manifesting",
    11879: "Zürafa",
    11881: "Dans Eden Eller",
    11885: "Dinozor ayak izi",
    11897: "Mirket",
    12040: "Kız Kulesi",
    12041: "Alev Kuleleri",
    12061: "Bebek Ejderha",
    12110: "Manifesting",
    12160: "Ekran Tutkunu",
    12203: "Aslan Yelesi",
    12210: "Güllerin Dostu Rosie",
    12211: "Eğlenceli Dost Jollie",
    12212: "Rock'çı Dost Rocky",
    12213: "Akıllı Dost Sage",
    12236: "Yunus",
    12277: "Gümüş Spor Araba",
    12310: "Dans Eden Eller",
    12323: "Parlayan Denizanası",
    12325: "Dans Eden Eller",
    12333: "Altın Madalya",
    12345: "Şahin",
    12346: "Sıkı kucaklama",
    12355: "Kulüp Tezahüratı",
    12356: "Kulüp Gücü",
    12357: "Kulüp Zaferi",
    12495: "Kelebek",
    12596: "Paris'te patates",
    12625: "Paris'te patates",
    12626: "Paris'te patates",
    12678: "Seviye Atlama Kıvılcımları",
    12679: "Seviye Atlama Sahne Işığı",
    12680: "Seviye Atlama Manzarası",
    12709: "Perili ev",
    12723: "Unicorn Fantasy",
    12725: "Van Kedisi",
    12726: "Zürafa Gerry",
    12788: "Meerkat",
    12852: "Seviye Gemisi",
    12853: "Seviye Gemisi",
    12892: "Timsah",
    12900: "Panda Kucaklaması",
    12920: "Sincap",
    12921: "Ekran Tutkunu",
    12922: "Şahin",
    12935: "Sage'in Hamlesi",
    12944: "Dinamik Müzik",
    12977: "Özgür Ruh",
    12988: "Süper GG",
    13006: "At",
    13007: "Av Köpeği",
    13008: "Kar Leoparı",
    13064: "Beyaz Kaplan",
    13072: "Ejderha Tacı",
    13073: "Size Özel Kelebek",
    13075: "Tezahürat Yapan Yengeç",
    13087: "Sakız",
    13158: "Aşk Yayı",
    13165: "Kristal Taç",
    13166: "Gece Yıldızı",
    13167: "Star Map Polaris",
    13171: "Tüy Yumağı",
    13174: "Star Map Polaris",
    13175: "Işık Yakalayıcı",
    13176: "Kristal Taç",
    13184: "Kristal Taç",
    13192: "Yün Şapka",
    13214: "Gece Yıldızı",
    13263: "Aşk Sığınağı",
    13282: "Slay",
    13298: "Göz Kırpma Büyüsü",
    13300: "Sevgi Dolu Bakış",
    13301: "Şarkı Sihri",
    13302: "Işıltılı Dans",
    13406: "Oyuncu 2025",
    13407: "Oyuncu yılbaşı",
    13429: "Acı Biber",
    13430: "Bir Bardak Ayran",
    13438: "Yün Şapka",
    13447: "Kristal Taç",
    13448: "Gece Yıldızı",
    13449: "Balon Hediye Kutusu",
    13468: "Parıldayan Yıldız",
    13469: "Henry",
    13470: "Star Map Polaris",
    13604: "Kızgın Ejderha",
    13643: "Pembe Rüya",
    13651: "Popüler Ol",
    13690: "Yün Şapka",
    13726: "Elmas Mikrofon",
    13737: "Balonlar",
    13739: "Yün Şapka",
    13879: "GOAT",
    13901: "Yıldız Işığı Pusulası",
    13902: "Ben Sadece Bir Hamster'ım",
    13912: "Yıldız Işığı Pusulası",
    13913: "Buket",
    13987: "Kuş Tüyü Maske",
    13988: "Kristal Rüyalar",
    13999: "Dilek Pastası",
    14000: "Fiyonk",
    14041: "Aşk Yağmuru",
    14053: "Aşk Yayı",
    14054: "Altın Yıldızlar",
    14055: "Baloncukları Üfle",
    14057: "Altın Yıldızlar",
    14058: "Balonlar",
    14084: "Baloncukları Üfle",
    14086: "Balonlar",
    14109: "Aşkın İşareti",
    14110: "Seviliyorsun",
    14114: "XXXL Çiçekler",
    14115: "S Çiçekler",
    14210: "XXL Manifestasyon",
    14214: "Kelebek dans etsin",
    14229: "Sevimli Patiler",
    14273: "Ben Sadece Bir Hamster'ım",
    14381: "Renkli Kanatlar",
    14382: "Yüzen Ahtapot",
    14384: "Sage'in Serüveni",
    14397: "Peri Kanatları",
    14398: "Canlı Sahne",
    14399: "Flamingo Ritmi",
    14410: "Fil Doğa Koruma Alanı",
    14440: "Beyaz Kaplan",
    14451: "Kulüp",
    14453: "Yükselen Yıldız",
    14532: "Çiçek Açmış Sakura",
    14534: "Raya Hediye Kartı",
    14543: "Tebrikler",
    14544: "Eve Dönüş",
    14554: "Yoğuran Yavru Kedi",
    14555: "Çiçek Tacı",
    14557: "Yavru Köpekten Öpücükler",
    14562: "Savaş Şampiyonu",
    14568: "Elmayı Vur",
    14574: "Kazandıran Çarşamba",
    14575: "Kazandıran Çarşamba",
    14576: "Kazandıran Çarşamba",
    14647: "Uzay Kedisi",
    14656: "Selamlaşan Kalp",
    14657: "Tomurcuk Kalp",
    14658: "Çiçek Açmış Kalp",
    14659: "Sadık Kalp",
    14660: "Kristal Kalp",
    14661: "Sonsuz Kalp",
    14682: "Şanslı Kedi",
    14690: "Topluluk Desteği",
    14744: "Uzay Kedisi",
    14766: "Fok ve Balina",
    14768: "Elmas Silah",
    14769: "Kahraman Uzay Gemisi",
    14770: "Batmaz Flamingo",
    14785: "Sabah Çiçeği",
    14786: "Şeftali",
    14788: "Rosie'ye Öpücük Gönderin",
    14789: "Jollie'nin Kalbi",
    14790: "Rocky'nin Yumruğu",
    14791: "Sage'in Jeton Botu",
    14801: "Vazo",
    14886: "Sakura Corgi",
    14888: "Sakura Corgi",
    14906: "Buket",
    14963: "Uzay Köpeği",
    15042: "Harika Vuruşlar",
    15063: "Yolculuk Bileti",
    15064: "Yarış Kaskı",
    15065: "Yarışta İlk Çıkış",
    15066: "Güçlü Finiş",
    15138: "Kabuk Enerjisi",
    15140: "Panda Kucaklaması",
    15141: "Panda Kucaklaması",
    15142: "Yükselen Anahtar",
    15143: "Su Samuru Öpücüğü",
    15150: "Sakura Corgi",
    15151: "Yunan Tacı",
    15156: "Sakura Corgi",
    15158: "Yunan Tacı",
    15187: "Büyük Sesleniş",
    15189: "Sohbet ve Patlamış Mısır",
    15190: "Güçlü Zihin",
    15191: "Şeker Buketi",
    15192: "Uzaylı Dost",
    15193: "Neşeli Şapka",
    15194: "Birleşen Kalp",
    15195: "Mikrofon Şampiyonu",
    15199: "Dondurma Mikrofon",
    15205: "Batmaz Flamingo",
    15231: "Seni seviyorum",
    15232: "Süpersin",
    15324: "Süpersin",
    15341: "Göster kendini!",
    15343: "İçten Sohbet",
    15384: "CANLI Yayın Sıralaması Tacı",
    15394: "CANLI Yayın Sıralaması Tacı",
    15396: "Sakura Tacı",
    15397: "CANLI Yayın Sıralaması Tacı",
    15403: "Panda Kucaklaması",
    15404: "Yükselen Anahtar",
    15424: "CANLI Yayın Sıralaması Tacı",
    15428: "Patatesin Dönüşümü",
    15487: "Şut Çekme Meydan Okuması",
    15507: "Valiz",
    15509: "Yaz Güneşi",
    15510: "Piknik sepeti",
    15539: "Yaz Bileti S",
    15540: "Yaz Bileti M",
    15541: "Yaz Bileti L",
    15542: "Yaz Bileti XL",
    15578: "Koruyucu Kanatlar",
    15579: "Uzaylı Evcil Hayvan",
    15595: "Yaz Güneşi",
    15596: "CANLI Yayın yazı",
    15614: "XXXL Çiçekler",
    15629: "Orta Büyüklükte Fandom",
    15630: "CANLI Yayın Sıralaması Tacı",
    15639: "Su Samuru Öpücüğü",
    15648: "Dergi",
    15649: "XXL Manifestasyon",
    15663: "Sörf Yapan Penguen",
    15673: "Paradise Plajı",
    15680: "Tatilde CANLI Yayın",
    15681: "Tatilden CANLI Yayın",
    15696: "Bir Üst Seviye",
    15698: "Yaz Fanusu",
    15751: "Süperstar",
    15752: "Yıldız Gözlük",
    15761: "Uçuşan Hoparlörler",
    15762: "\"Bir Daha\" Alkışı",
    15763: "Neşeli Mikrofon",
    15764: "Tezahürat Yapan Maymun",
    15803: "Pharaoh Mask",
    15804: "Güç Mücevheri",
    15805: "XP Artırma Çekirdeği",
    15806: "Canlandırma Enerjisi",
    15807: "Zafer Portalı",
    15808: "Zafer Boyutu",
    15864: "Çiçek Gösterisi",
    15865: "Gül Ayı",
    15888: "Yükselen Yıldız",
    15889: "Gül Ayı",
    15901: "Gül Ayı",
    15909: "Gül Ayı",
    15910: "Süper LIVE Star",
    15924: "Yaz Ortası Saçı",
    15925: "Yaz Ortası Pastası",
    15926: "Yaz Ortası Geyiği",
    15948: "Lale",
    15949: "Harika",
    15950: "Lolipop Hediye Kutusu",
    16041: "Patatesin Dönüşümü",
    16071: "Çiçek Gösterisi",
    16079: "Kurdeleli Taç",
    16080: "Yıldız Işığı Asası",
    16101: "Uzay Köpeği",
    16102: "Steven Wingman",
    16103: "Buz Gibi Limonata",
    16111: "Mamma Mia",
    16131: "Tiny Diny Havuzda",
    16190: "Aşk Limonatası",
    16192: "Güçlü Çift",
    16194: "Şahin",
    16203: "Haydi Asil At",
    16206: "Haydi Alpha Drifter",
    16212: "Havalı",
    16275: "Valiz",
    16317: "Kaleci Kurtarışı",
    16319: "Minik Kanat",
    16324: "Gül Ayı",
    16344: "Elmas",
    16345: "Taraxacum Corgi",
    16379: "Domates Tom",
    16380: "Bu Gülü Kabul Et!",
    16409: "Kiraz",
    16414: "Ayıcık Sundae",
    16415: "Tatlı Kaşık",
    16448: "Seviliyorsun",
    16477: "Yavru Kedi Ol",
    16478: "Baloncuklar ve Kulaklık",
    16479: "Gizemli Maske",
    16527: "CANLI Yayın Sıralaması Tacı",
    16551: "Renkli İzler",
    16552: "Kalp Şeklinde Balonlar",
    16558: "Taraxacum Corgi",
    16572: "Buz Gibi Limonata",
    16573: "Prince",
    16589: "Buz Gibi Limonata",
    16616: "Uzay Jeti",
    16637: "Tavşan Şapkası",
    16669: "Rosie'nin Görünümü",
    16670: "Dokuz Kuyruklu Tilki",
    16671: "Rosie'nin Saksafonu",
    16672: "Işıltılı Kanatlar",
    16690: "Süper Popüler",
    16694: "XXXL Çiçekler",
    16705: "Panda Tırmanışı",
    16706: "Prince",
    16709: "Süper",
    16735: "Tatlı Gülümseme",
    16736: "You are on a Roll",
    16737: "You are my Jam",
    16748: "Plak Çevirme",
    16749: "Büyük gösteri",
    16791: "U make Miso happy!",
    16815: "Seviliyorsun",
    16824: "Yıldız Gözlük",
    16825: "Terminatör Yüzü",
    16826: "Yıldız Gözlük",
    16827: "Prince",
    16833: "Yıldız Gözlük",
    16834: "Terminatör Yüzü",
    16896: "Rose el yapımı",
    16897: "Sihirli Aksesuar",
    16898: "Sihirli Rol",
    16899: "Sihirli Dünya",
    16940: "Dondurma Kamyonu",
    17004: "Rose el yapımı",
    17040: "Kavun Suyu",
    17049: "Kavun Suyu",
    17050: "Prince",
    17068: "Kavun Suyu",
    17085: "Müzik Albümü",
    17100: "Tüylü Taç",
    17101: "Hindistan Cevizi Suyu",
    17102: "Palmiye Esintisi",
    17103: "Meyve Suyu Şapkası",
    17104: "Orman Elfi",
    17105: "Dondurma Kâsesi",
    17149: "Ejderha yumurtası",
    17172: "Sevimli Patiler",
    17275: "Sevimli Patiler",
    17289: "Terminatör Yüzü",
    17290: "Yan Yana",
    17291: "Panda Tırmanışı",
    17292: "Kalple Donat",
    17299: "Kalple Donat",
    17300: "Kavun Suyu",
    17308: "Viking Hammer",
    17309: "Rüzgar Dansözü",
    17335: "Sevgi Tabağı",
    17336: "Kalp Balonu",
    17338: "Parlıyorsun!",
    17357: "Korsan Hazinesi",
    17358: "Hamster Ol",
    17359: "Tırtıllı Kaos",
    17360: "Minik Kuştan Öpücükler",
    17416: "Graduation Bouquet",
    17417: "Nakış Kalp",
    17444: "Su Tabancası",
    17473: "Buket",
    17474: "Rüzgar Dansözü",
    17475: "Güller",
    17476: "Sevimli Patiler",
    17480: "Kahve",
    17483: "Sevimli Patiler",
    17490: "Kapibara",
    17559: "Tatlı Gülümseme",
    17589: "Yan Yana",
    17597: "TikTok Tacı",
    17602: "Merhaba",
    17603: "En İyi Sensin!",
    17644: "CANLI Hediyesi",
    17667: "Yan Yana",
    17689: "Yarasa Kanadı Şapka",
    17690: "Gizemli İçecek",
    17702: "Güller",
    17738: "Cadılar Bayramı Hayaleti",
    17739: "Cadılar Bayramı Hayaleti",
    17740: "Prizma Işıltısı",
    17747: "Yan Yana",
    17748: "Cadılar Bayramı Hayaleti",
    17762: "Parti Otobüsü",
    17821: "Yaramaz Öcü",
    17823: "Buzağı Benny",
    17824: "Koruyucu Gergedan",
    17825: "Para Mıknatısı",
    17826: "Bagel",
    17827: "Şeker Ganimeti",
    17844: "Catrina",
    17845: "Yarasa Başlıkları",
    17846: "Cadılar Bayramı Eğlenceli Şapka",
    17852: "Özel Kıvılcım",
    17872: "Football Love",
    17912: "Pudra",
    17922: "Cazibe Yayı",
    17923: "Şakacı",
    17947: "Baloncuk Öpücüğü",
    17948: "Neşe Balonu",
    17949: "Çok Havalısın",
    17950: "Şeker Bulutları",
    17951: "Astro Ayı",
    17952: "Yıldızlara Doğru",
    17953: "Buzlu Tatlar",
    17954: "Tom ve Sam'in Deniz Yolculuğu",
    17955: "Yukarı Bak",
    17956: "Büyük Hayaller",
    17957: "Şeker Bıyıklar",
    17958: "Pofuduk Dostlar",
    17959: "Aslancık Bulutlarda",
    17960: "Kahramanın Serüveni",
    17961: "Majestic Hearts",
    17962: "Dilek Olay",
    17983: "Gül Ses Dalgası",
    17984: "Kumsal Marakası",
    17985: "Değerli Ses",
    17986: "Çılgın Salyangoz",
    18025: "Müzik Şefi",
    18026: "Melodi Gözlükleri",
    18107: "Stil Dokunuşu",
    18124: "Kuş Şarkıları",
    18137: "Kaydedilmiş Sesler",
    18179: "Hasat Şarkısı",
    18181: "Seviliyorsun",
    18189: "Aile Zamanı",
    18195: "Eski tip pilot",
    18196: "Sörf Yapan Penguen",
    18197: "Şirin Beyzbolcu",
    18198: "Ağırlık Kaldıran Kaplan",
    18199: "Uzay Aşkı",
    18226: "Noel Ağacı Şapkası",
    18227: "Noel Baba Fincanı",
    18228: "Zencefilli Kurabiye Adam",
    18229: "Ren Geyiği Fincanı",
    18230: "Penguen ve Kardan Adam",
    18231: "Noel Baba Baykuş Sürprizi",
    18232: "Sıcacık Noel Seti",
    18277: "Fantazi Karnavalı",
    18299: "Viking Hammer",
    18320: "Puyo Yağmuru!",
    18328: "Puyo Karması!",
    18329: "Judy Poz Veriyor",
    18337: "Yenilmez Çekiç",
    18338: "Siber Kükreyiş",
    18339: "Şampiyon Julius",
    18362: "Kuzey Işıkları",
    18461: "Topluluk Hediyesi",
    18505: "Konfeti Ayı",
    18506: "Çiçekli Parti Tacı",
    18507: "Şeker Buketi",
    18508: "Gizemli Kutu",
    18509: "Kutlama Şapkası",
    18605: "Rüya Gibi Keman",
    18606: "Şarkı Söyleyen Saksafon",
    18607: "Şehirde Pop",
    18608: "Rock'çı Mantar",
    18610: "Müzik Dostu",
    18728: "Kedi",
    18789: "Uğurlu Midilli",
    18790: "Bebek Yeni Yıl Kutlaması",
    18791: "Ring Of Honor Küpü",
    18792: "LNY At",
    19065: "Lig Topu",
    19067: "Lig Geri Sayımı",
    19068: "Lig Kupası",
    19071: "Lig Hayranlığı",
    19074: "LIVE Ranking Headband",
    19131: "Çikolata",
    19132: "Gül Ayı",
    19133: "Aşk uçuşu",
    19134: "Paris",
    19168: "Aşk Gözlüğü",
    19306: "Aşk Koalası",
    19307: "Kalp Gitar",
    19308: "Kalbimde Kelebekler",
    19309: "Kalpten Şapka",
    19310: "Gülümseyen Latte",
    19311: "Aşk Çağrısı",
    19312: "Peri Madalyonu",
    19314: "Şipşak Panda",
    19438: "Pop",
    19439: "Eskiler",
    19441: "Serbest stil",
    19443: "Bravo!",
    19445: "İsimle selamlama",
    19446: "Göz kırpma",
    19447: "Aşırı tepki",
    19448: "Ağır çekim",
    19713: "Keskin Bakış",
    20862: "Yüksel Gözlüğü",
    23203: "Goldman Heykeli",
    23657: "MDS Medusa",
    23919: "Ultra Aslan",
    24022: "Sarı Aslan",
    24058: "Çukur Meke",
    25805: "ŞRA",
    27813: "RACON KRALI",
    28281: "A1B Aslanı",
    29078: "Karlar Kraliçesi",
    29620: "S2G Sümeyye",
    30644: "Turuncu Kerim",
    30878: "Çelik Racon",
    31838: "JR SAU 31",
    32206: "Telve Sırları",
    32640: "Blue Galaxy",
    35031: "Siyah Janti",
    36518: "Vidamia Kartalı",
    36724: "Şampiyon Cimbom",
    37022: "Halıcı Köpüğü",
    37239: "Dante Panther",
    37642: "Neo Esram",
    37713: "Sessiz Tavşan",
    38105: "Hemşo Sıcaklığı",
    38146: "BŞGNBaşgan",
    38441: "Hav Hav Alp",
    38730: "RNS Ailesi Aslanı",
    38759: "Aslan Salih",
    38842: "SuspecT Gri Ceket",
    39336: "Kraliçe Gülüşü",
    39618: "Racon Kraliçesi",
    40445: "Efsane Hocam",
    40527: "Gökçe Bad Girl",
    40854: "Papatya Neşesi",
    41753: "Moskov Onayı",
    42133: "Angara Samet",
    42139: "Mor ANT ANTEPLİ",
    42226: "Hero Rüyası",
    42284: "nosouNd",
    43155: "ALL STAR ASLAN",
    43196: "Azimli Savaşçı",
    43249: "ALUM Kazak",
    43843: "Mavi Robo Owen",
    43916: "cokiyisinMERİ",
    44020: "Masum Tebessüm",
    44879: "Turuncu Lord",
    44993: "Pembe Düet",
    45311: "SELEN",
    45374: "PND Coşkusu",
    45943: "Serenay SRN",
    46015: "Fire Aslanı",
    46034: "MYRA Gelini",
    46766: "Vanilya Kapkek",
    46974: "Crosette Havai Fişek",
    47040: "Kedi",
    47207: "Beriş",
    47577: "CT7 Cataleya",
    47610: "Pembe AVC",
    47635: "FARABEC",
    47644: "Siyah Kurt",
    47645: "Siyah Kuğu",
    47646: "Siyah Kaplan",
    47715: "Yanan Enerci",
    47763: "CARLEEN",
    47876: "Norm Coşkusu",
    48221: "Pati Çağrısı",
    48224: "Peri Saklanıyor",
    48225: "Parti Midillisi",
    48231: "Midilli Fener",
    48232: "Işıltılı Midilli",
    48443: "Mavi Youzarsif",
    48592: "MARDİNLİ 47",
    48930: "Rüyoşş",
    49042: "Gözlüklü Çeto",
    49110: "Gözlüklü Taşkafa",
    49155: "Çılgın Viktor",
    49161: "SASUKE",
    49472: "ROJ Güneşi",
    49601: "Taçlı GG",
    49930: "Kararlı Ezel",
    49990: "Twinsx İkilisi",
    50124: "Barbar Çavuş",
    50737: "Aile Karesi",
    50826: "Zyca Tayfası",
    51161: "OB Ailesi",
    51281: "DJ Plağı",
    51285: "Elmas Kalkan",
    51287: "Mor Tiana",
    51617: "C9 Miyav",
    51670: "2xFamily Koçu",
    51692: "MİRA Melek",
    51916: "Racon Duruşu",
    52044: "أساطير كلوش",
    52141: "Şampiyonun Gücü",
    52190: "Kral Rohan",
    52253: "Lune Blue",
    52295: "Zanisbey",
    52339: "HAN",
    52519: "İlayda Elması",
    52531: "Zafer Kupası",
    52607: "Neşeli Lyliad",
    52616: "Parti Lazeri",
    52617: "Çılgın Mikrofon",
    52618: "Işık Dalgaları",
    52619: "Hip-Hopçu Tavuk",
    52781: "Turuncu Aslan",
    53761: "Asya Çitası",
    54072: "Knt Westron",
    54238: "Tigre Azul",
    54294: "Şans Tacı",
    54539: "Gelgit Çağıran Üçlü Mızrak",
    54540: "Denizaltı Krallığı",
    54541: "Efsane Marcellus",
    54557: "Çiçek Perisi",
    54558: "İlkbahar Buketi",
    54560: "Süper Kadın",
    54562: "İlkbahar Filizi",
    54566: "Kar Çiçeği",
    54724: "Creeper",
    54725: "Civcivler",
    54726: "Sürpriz Yavru Canlı",
    54727: "Civciv İzdihamı",
    54728: "Sinsi Jokey",
    55229: "Elmasın Gücü",
    55243: "Buzlu Kraliçe",
    55275: "Bedel Tacı",
    55360: "Yıldızlı Hako",
    55532: "CAST FAMİLY",
    55700: "Bayram Hediye Kutusu",
    56080: "Sürpriz Yavru Canlı",
    56382: "Doğum Günü Şapkası",
    56560: "İlk Gülüm",
    56562: "Vahşi Asalet",
    56589: "Dilek Olay",
    56590: "Çayırda Dino",
    56591: "Çayırda Tom",
    56592: "Çayırda Blitzy",
    56593: "Çayırda Cooper",
    56594: "Ormanda Dino",
    56595: "Ormanda Tom",
    56596: "Ormanda Blitzy",
    56597: "Ormanda Cooper",
    56598: "Volkanda Dino",
    56599: "Volkanda Tom",
    56600: "Volkanda Blitzy",
    56601: "Volkanda Cooper",
    56602: "Çölde Dino",
    56603: "Çölde Tom",
    56604: "Çölde Blitzy",
    56605: "Çölde Cooper",
    56606: "Tundrada Dino",
    56607: "Tundrada Tom",
    56608: "Tundrada Blitzy",
    56609: "Tundrada Cooper",
    56610: "Denizde Dino",
    56611: "Denizde Tom",
    56612: "Denizde Blitzy",
    56613: "Denizde Cooper",
    56855: "Festival Bilekliği",
    56861: "Leon'un Mühürlü Pelerini",
    57008: "Yonca Şapka",
    57009: "Uyanık Marşmelov",
    57010: "Rüya Şapkası",
    57011: "Yıldızlı Pofuduk",
    57209: "Elit Işıltı",
    57210: "Elit Kulübü",
    57211: "Elit Asa",
    57398: "Şapşik Enerji",
    57593: "Kovan Kaçışı",
    57594: "Yaramaz Yavru",
    57595: "Tembel Bakış",
    57596: "Saksafon Ritmi",
    57597: "Vokalist Ayı",
    58213: "coldy",
    58235: "Denizatı Pop",
    58236: "Kaktüs Dansı",
    58237: "Palyaço Boogie",
    58238: "Davulcu Hamster",
    58988: "Chicago Pizzası",
    58990: "New York Taksisi",
    59123: "Neşeli İkili",
    59138: "BabalaraGeldik",
    59216: "Cihan Kaos",
    59226: "Ayı Pim kaleci",
    59229: "Mavi Zara",
    59313: "Kırmızı Şimşek",
    59314: "Muz Kabuğu",
    59315: "Trafik Konisi",
    59316: "Enerji Kapsülü",
    59317: "Güç Çipi",
    59318: "Parşömen",
    59319: "Sağlık İksiri",
    59320: "Gizemli Kutu",
    59321: "Sihir İksiri",
    59322: "Çağrı Borusu",
    59383: "YC Fatih",
    59442: "Beyaz Pamuk",
    59511: "Mavi Şimşek",
    59512: "Sarı Şimşek",
    59543: "outAiLESİ Lideri",
    59589: "Müzik Patlaması",
    59710: "Zamanı Geri Sarma Cihazı",
    59711: "Işık Kalesi",
    59712: "Kral Leonardo",
    59774: "DJ Dalgası",
    59775: "Müziğin Enerjisi",
    59800: "T-rex",
    59881: "Umut Kırıntısı",
    59882: "Savaşçı Miğferi",
    59883: "Ateşleme Kontrolü",
    59884: "Yenilenmiş Zırh",
    59885: "Zırh Dünyaya Karşı",
    59987: "Kardinal Kuşu Louis",
    59990: "Kanyon Yaban Koyunu",
    59991: "LA Route 66",
    59994: "Tezahürat Yapan Taraftarlar",
    60073: "Hayran Kitlesi Damgası",
    60074: "Hayran Kitlesi Ateşi",
    60075: "Hayran Kitlesi Tezahüratı",
    60076: "En Büyük Hayranlık",
    60077: "Hayran Kitlesi Yelpazesi",
    60547: "Punch Sarılması",
    60548: "İş Gücü",
    60549: "Yaratıcı Hayalperest",
    60550: "Muhteşem Şef",
    60553: "Anne Kanguru",
    60554: "Anne Şapkası",
    60555: "Pilot Anne",
    60766: "ÇAÇA",
    60891: "Suat Batur",
    61950: "Kralın Hedefi",
    62330: "Siyah Şapka",
    62376: "Aşko Öpücüğü",
    62404: "Mavi Selen",
    62487: "Holografik Futbol Kartı",
    62501: "Hızlı Ayaklı Tom",
    62528: "Gizemli Lider",
    62675: "Birlikte Şarkı Söyleyelim",
    62816: "Topluluk Kalbi",
    62817: "Topluluk Tarzı",
    62818: "Jollie'nin Topluluğu",
    62819: "Topluluk Atılımı",
    65715: "Süper Forvet Sage",
    66788: "MAMİ",
    66895: "KEREM AİLESİ",
    67032: "Osi Selamı",
    67218: "Ömrüm Jeroo",
    68363: "Pelerinli piso",
    69029: "Yapraklı Enes",
    69837: "On Üç Rota",
    70693: "Ölümtem Blok",
    70708: "Löwenblitz",
    70892: "Şifalı Ses",
    70966: "Nuyella",
    71082: "Plus Atesi",
    71345: "Komutan Selamı",
    71414: "Meşe Team",
    71693: "Samet",
    75024: "RES SOULFLY",
    75129: "Sercan Selamı",
    76224: "Reyizin Canları",
    76298: "Archon Selamı",
    76760: "DS Yanyana",
    77554: "Betwo Aslanı",
    77609: "Ahmet Selamı",
    77713: "Zuzu Selamı",
    77732: "Samo Duruşu",
    77898: "DoCe Parlasin",
    78282: "Kürtbey Duruşu",
    78719: "Kravat Selamı",
    78815: "Kral Selamı",
    79308: "Oyuncu Fare",
    79994: "Türkü Mikrofonu",
    80195: "Pink Tuşlar",
    80551: "Lepistes Alevi",
    81714: "Muck Mami",
    81782: "AHG Selamı",
    81819: "Cimbom Kükreyiş",
    82082: "TATLI AİLESİ",
    82139: "Yarasa Selamı",
    82350: "Kerkenez Bakışı",
    82705: "EMC Aslanı",
    82750: "Ateş Sahnede",
    82981: "Alevli Kral",
    83254: "UYUMSUZ",
    84518: "Aynur ışıltısı",
    84585: "EROS Yumruğu",
    85390: "Musa Duruşu",
    85472: "Panda Melis",
    85509: "Zehra Selamı",
    85697: "Ezgi Midilli",
    85711: "Kralın Eli",
    85779: "uppRABİA",
    85951: "ATE2M",
    86002: "Spear Drifti",
    86188: "Fındık",
    86257: "Conilerr",
    86353: "Kırmızı MELİKE",
    87353: "MRC Fiyonk",
    87385: "Nisa Charm",
    87528: "Alsana Ahmet",
    88227: "Neslişah Işıltı",
    88465: "Kurt Tacı",
    88687: "Maskeli Moon",
    88771: "Sürat Anıl",
    88872: "Zehracık",
    88878: "Alfa İz",
    89063: "Dayı Selamı",
    89221: "Eren Karizması",
    89272: "Miraying Selfie",
    89297: "Aslım Var",
    89334: "Sqekip",
    89356: "Lola Selamı",
    89398: "LedLordis AİLESİ",
    90513: "Wars Yumruğu",
    90718: "İnci Selamı",
    91070: "İrosino",
    91203: "Enişte Pozu",
    91470: "Güneş Selamı",
    91765: "Brokoli Selamı",
    91789: "Halil Raconu",
    91955: "Çiçekli Oyuncu",
    92088: "THE EKİBİ",
    92099: "Feride Emre",
    92105: "İreminiz Ayıcık",
    92122: "Aile Yelesi",
    92227: "MB Family",
    92249: "Gece Oyuncusu",
    92298: "NEXT SİRENNA",
    92363: "56 Selamı",
    92557: "Kartal Coşkusu",
    94346: "L3GYUSUF",
    94613: "Zehir Gibi",
    95117: "Kaja",
    95229: "Diyar Sahnede",
    95231: "Reset Nisa",
    95366: "Atıl Kurt",
    95496: "AurA",
    95537: "BeoFamily",
    95605: "Mor Yıldızlar",
    95696: "BEYZAx4",
    96147: "Terso",
    96622: "bebeksiii",
    96770: "Damlacv6",
    96793: "Cakal bey",
    96854: "Busewio",
    97183: "Cebo live",
    97222: "Aley",
    97564: "MİHRİM",
    97809: "SUNS Selamı",
    97941: "Ercihan",
    97997: "Anka Arya",
    98070: "Melis",
    98121: "Halay Güzeli",
    98928: "Baykuş gaming",
    98975: "Jaku",
    99100: "NAYSxLENA",
    99638: "Mor Kulaklık",
    100815: "YUSEE Pozu",
    100863: "ZEYNS",
    100873: "Lara",
    100874: "Siyah",
    101012: "Kırmızı Mesai",
    101158: "Kurt Hırlısı",
    101198: "Kurbağa Şefi",
    101219: "Pilav Patisi",
    101237: "Tolgaizm",
    101384: "hayran kedi",
    101652: "ELF",
    101846: "Etty Esintisi",
    101857: "Fırtına Kılıcı",
    101862: "Skyforge Kalesi",
    101868: "Valerian Yemini",
    102158: "HALO Sohbeti",
    102175: "Onur Selamı",
    102345: "TPD",
    102641: "Kimsesiz",
    102759: "Karaca Aslanı",
    102783: "Reine",
    102933: "Racon Umut",
    102935: "YinemiHaHHaHa",
    103048: "EMRECAN",
    103228: "Tekashe",
    103445: "King Selamı",
    103825: "Cerennn",
    103859: "Kral Şimşeği",
    103932: "Kafalar Metin2",
    104113: "EFKE",
    104114: "seqo racon",
    104133: "KAMi",
    104645: "Gariban Franco",
    104653: "Turşu Yağmuru",
    105368: "Monica",
    105610: "Gol Tekrarı-ABD",
    105615: "Gol Tekrarı-Kanada",
    105781: "Dönen Top",
    105795: "Freestyle",
    105810: "Muhafız Yemini",
    105814: "Gol Anı",
    105817: "Stad",
    106004: "Darbuka",
    106027: "Ud",
    106340: "Yorum Adam",
    106566: "Kartal Yuvası",
    107018: "RICH NEHİR",
    107314: "Peri Kızı",
    107805: "DELİYİK",
    107836: "ALFA",
    108048: "Doğan İmzası",
    108255: "Kaptan Yayında",
    108930: "Tubişlendin",
    108972: "ANILOVSKİ",
    109388: "Bıyıklı Karizma",
    110506: "Rock'çı Kediler",
    110508: "Retro Melodi",
    110534: "darya",
    110555: "Sarı Sinan",
    110598: "Meloşpiupiu",
    110782: "Cennet Enerjisi",
    110970: "Aslan Yumruğu",
    111031: "Aslan Kral",
    111077: "Amigo",
    111198: "OyyHASAN Sahne",
    111285: "YAKUZA",
    111289: "آســوســ 〆",
    111480: "Çiçekli Alya",
    111557: "PRO KURT",
    111670: "KTY Ailesi",
    112270: "ZOBİŞ",
    113472: "Moon Selamı",
    113833: "NIETZSCHE",
    113865: "M E V O R E İ S",
    114578: "MİSHA",
    114594: "SAWMOT",
    115510: "şemsiye",
    115513: "Yağmur Bebeği",
    115516: "Ortanca Denizi",
    115518: "Rüyada Yolculuk",
    115520: "Halka sahne",
    115543: "LIVE Ranking Ticket",
    115548: "LIVE Ranking Party",
    115549: "Red Devil Corgi",
    115778: "Sugar Selamı",
    116351: "EMC ALEY",
    116514: "ERO LİVE",
    117729: "Canhalil25",
    117861: "Mad I Ferhat",
    118065: "بقلاوة سيلفي",
    118110: "Piremses Şeloş",
    118802: "CagiBey",
    118812: "İlahi Parmaklar",
    118814: "Şiir Notası",
    118817: "Efsanevi Piyanist",
    118842: "Ali Haydar",
    118848: "THLR",
    118926: "Ukulele Sanatçısı",
    118928: "Müzikte Kaybolmak",
    118937: "M3T3",
    118939: "Elektronik Aşk Şarkısı",
    118979: "FREYJA",
    119322: "Zeyna Civciv",
    120908: "LİAN WW",
    120927: "Alafan Raptiye",
    120974: "GülayGamer",
    121582: "Yağmurda Chopin",
    121583: "Çello Romantizmi",
    122336: "Wtch",
    122598: "Angara alevi",
    123319: "KeroX Yumruğu",
    123460: "Musab yıldız",
    123497: "Piriniz",
    124919: "Ibrahim",
    125847: "Ediz Tuşlarda",
    126010: "Brave Kalkanı",
    126908: "Beni sev",
    127000: "KaanTa",
    127088: "Tek Vuruş",
    127089: "Üçlü Şimşek",
    127090: "Lanetli Şut",
    127094: "Sarsıntı",
    127096: "Darbe",
    127098: "Dengeleyici",
    127127: "ULUTÜRK",
    127266: "Sefoo Dayı",
    127372: "Yavuz",
    127492: "Kaos5 Nebi",
    127702: "ÆR",
    127708: "Petito",
    127717: "Şeker",
    127731: "Kraliçe Freya",
    127811: "TOMBİK",
    127880: "Aile Yayini",
    127884: "Zeo Selamı",
    127915: "Basak",
    128081: "NADIA",
    128239: "VLN",
    128365: "TNH AİLEM",
    128503: "Gülüm",
    129325: "Burcu",
    130510: "Bayroş",
    130635: "HARDCORE",
    130726: "Anka Naz",
    130787: "Haydi!",
    130994: "Kral Tacı",
    131882: "Şimdi Maç Zamanı",
    131887: "Maç Ustası",
    131888: "Harika Bir Maç!",
    131894: "Maç Tutkunu",
    131932: "Huysuz Duruşu",
    132058: "Halil Duruşu",
    132500: "Demet Işıltısı",
    133359: "DJ Seti",
    133360: "Pembe Kovboy",
    133367: "Gülcan",
    134381: "Elmas Silah",
    134396: "Zeus",
    134446: "BABA RAMİZ",
    134523: "CANLI Yayın",
    134632: "Evet TikTok CANLI Yayın",
    134745: "Pınar Hanım Ağa",
    135192: "Portakallar",
    135194: "Süper",
    135217: "Penguen",
    135523: "ZR Ömer",
    135544: "Ra",
    135563: "Yusuflive VİP",
    136599: "Tarot Edoş",
    136618: "Şef Yumruğu",
    136638: "Elif",
    136848: "LiON",
    139208: "Maya",
    139582: "Tezahürat Havlusu",
    139584: "Davul Patlaması",
    139586: "Kutlama Bandı",
    139653: "Slow Şarkım",
    140024: "Apo Reis",
    140038: "NY",
    140183: "APOLLO",
    140352: "Harunair",
    140461: "ENES METE",
    140525: "Tabletli Gökçe",
    140693: "ANGONA",
    140728: "Havişş",
    140763: "OXOROX",
    140990: "Nova",
    141129: "ecoşşş",
    141344: "Rosi",
    141361: "Kainat Sahne",
    141370: "CRO Pençe",
    141969: "PRF AİLESİ",
    141970: "Sörf Yıldızı",
    141980: "Cankurtaran Yıldız",
    141992: "Yaz Yıldızı",
    142003: "Aşk Kurtarıcısı",
    142147: "Melisa",
    142282: "HARBİDEN YES BBC",
    142291: "Muhbir Aslanı",
    142322: "YAMANHARD",
    142475: "TEK Isareti",
    143146: "Zuggum Selamı",
    143626: "EXULİVE",
    143729: "MEZY",
    143947: "UNIT FAM",
    144195: "Patili Piikachu",
    144203: "Melis Yumruğu",
    144452: "HALO",
    144811: "Altın Zanax",
    144853: "Sassy Selamı",
    144962: "DestTeam",
    145413: "Sunrisee",
    145767: "ŞiirKöşkü",
    146912: "Maymun",
    147246: "Ahmedo",
    148030: "Nare Selamı",
    148271: "Erdem Ateşi",
    148349: "Skymerve",
    148442: "ŞEKERS",
    148609: "Kral Heybet",
    148709: "Yusuf m",
    149072: "Uranyen Güneş",
    149100: "1905 Aslanı",
    149405: "LİVİK PRENSESİ",
    149583: "GÜZELLİK BU SANA",
    150271: "İlayda",
    150341: "Azer reis",
    150425: "Sekozin Racon",
    150661: "MERO",
    150884: "Cihan Akustik",
    150905: "Racon nuro",
    151078: "BURAK MERT",
    151157: "DİLARA",
    151184: "Karlie",
    151185: "evdeVİSKİyok",
    151540: "Sürü Kurdu",
    151740: "Kerem Ailesi",
    151806: "Tospik Bey",
    152029: "707this",
    152061: "Delirttiniz Beni",
    152320: "Onur",
    152360: "İso",
    152674: "MamiG",
    152777: "Radyo Yıldızı",
    153465: "Bukomella",
    153550: "Şak Şak Shek",
    153750: "Kulüp Tezahüratı",
    153751: "Kulüp Gücü",
    153753: "Kulüp Zaferi",
    153989: "OlrAhmet",
    154745: "BONİTA",
    154814: "Hasbik Selamı",
    154877: "MİKRO",
    155916: "Mageenz",
    156061: "CLS",
    156445: "DjMatrax",
    156458: "Jestrow Yayında",
    156609: "TheCady",
    157190: "Aslan Raconu",
    157284: "MerveL",
    157332: "Kaptan Şapkası",
    157447: "Ali Rıza",
    157504: "Pisi",
    157556: "Selman Paşa",
    158407: "Ferhat",
    158918: "SPEAR KALBİ",
    158964: "QueeNNil",
    159109: "Zort Ragnar",
    159974: "PamukŞeker",
    160151: "Gol Anı",
    161265: "Haren",
    161370: "YAVRU HAYABUSA",
    161603: "Albay Selamı",
    161883: "Okii ailesi",
    162104: "Aslan Kükreyişi",
    162442: "SSC Oyunda",
    162520: "ASİL",
    162570: "Aslan Güney",
    163478: "Mühür Dalgın",
    163678: "THE YUSUF",
    163871: "EDİTTM",
    164009: "Bay ferman",
    164049: "DLxHasan",
    164069: "Hatie Duruşu",
    164836: "ENC yaprağı",
    165224: "Akbey Duruşu",
    165291: "Simge",
    165819: "Portakal suyu",
    165898: "Dawn Sesi",
    166115: "Hanımağa Duruşu",
    166213: "Çiçekli Miyav",
    166439: "TG Ordusu",
    166576: "Sakura Tarzı DJ",
    166578: "Şarkı Söyleyen Kurbağa",
    166579: "Rock and Roll",
    166581: "Ses Büyüsü",
    166583: "Elektronik Ritimler",
    166985: "Yaz Ortası Kutlaması",
    166996: "Seni seviyorum",
    167001: "Dalga Biçimli Havai Fişek",
    167002: "Gün Batımında Aşk",
    167005: "Deniz Kenarı Romantizmi",
    167134: "Aslan Flut",
    167320: "CinyurMami",
    167374: "ADENİŞKO",
    168308: "Aboş Duruşu",
    168357: "DRM Selamı",
    168444: "SOREX",
    168480: "Pınarss Esintisi",
    168588: "Enesquik",
    168704: "HİLAURA",
    168748: "Ofefe Pozu",
    169187: "CiftXp",
    169371: "Mert Yayında",
    169453: "TROTZ",
    169923: "Remzoş Işıltı",
    170091: "AZAT AİLESİ",
    170193: "Semsemia",
    170264: "Şampiyon Sahnesi",
    170277: "Bağlama",
    170498: "Çiçekli Trompet",
    170501: "Sihirli Akordeon",
    170503: "Ritim Kanatları",
    170504: "Melodi Kulaklığı",
    170505: "Retro Kulaklık",
    170506: "Şarkı Söyleyen Mantar",
    170507: "Melodi Çiçeği",
    170508: "Ritim Robotu",
    170626: "G2 Family",
    171048: "Bulut Baba",
    171231: "OKTAYOX",
    172158: "HOLA BURCU",
    173700: "Hulk Modu",
    173835: "Bal Küreği",
    173840: "EngelsizOyun",
    174342: "OFLULAR DERNEĞİ",
    174554: "LUMİN",
    175099: "Kel",
    175472: "Cyrexx",
    175891: "SLEY",
    176178: "Sefa",
    178301: "TTX Biz Aileyiz",
    178425: "Mert İmzası",
    179265: "Starım Tacı",
    179297: "Özoşumuş",
    182604: "Canver Selamı",
    183598: "KANREVAN",
    184298: "MRG",
    185378: "Dwoz",
    185384: "Yüce Aleyna",
    185654: "Aslan Kükrüyor",
    186794: "DOSTLAR",
    186798: "MDS Family",
    188055: "شيك محمود",
    188476: "BEN Selamı",
    189081: "Baby",
    191116: "Süper Baba",
    191117: "Ofis Pengueni",
    191123: "Baba Kapibara",
    191568: "Dolce Vita",
    191572: "Yüzen Kapibara",
    191644: "ZUZU",
    194361: "Racon Mehmet",
    197109: "Yazlık Ev",
    197110: "Tatil Rozeti",
    197280: "UA Ailesi",
    199799: "RgtTeam Öpücük",
    199971: "harbiAİLESİ",
    202137: "تحية المهندسة",
    203422: "Rodi Aslanları",
    204151: "EROŞ",
    204422: "Rürü Pozu",
    204428: "Duo",
    204646: "Maskeli çocuk",
    205087: "Dönme Dolap",
    205106: "Hawaii Ukulelesi",
    205117: "Plaj Radyosu",
    205264: "Roni",
    205350: "Zırhlı BLEX",
    205383: "Mert",
    207507: "Texshanfor",
    208159: "JALTRO",
    208458: "Kıvanç Yumruğu",
    208539: "Zeyhra Selamı",
    208622: "Karanlık Dokunuş",
    210263: "ʙᴛ𝔖",
    211418: "ARDA",
    211913: "Kaptan Serap",
    212209: "ELF Pozu",
    212317: "semoşum",
    214623: "İPEKchavo",
    214903: "Ceku Balım",
    216814: "BZC Ailesi",
    218105: "Zıplayan Koyun",
    218634: "Patatese tablet",
    218805: "Tuğba çevik",
    218917: "Canlı Müzik",
    218928: "Deniz Kenarı Romantizmi",
    218936: "Kumsal İskelesi",
    219642: "Futbol",
    220815: "Şiir Ateşi",
    221666: "Gol Anı",
    221736: "N7 SEVDİN",
    221847: "Gol Anı",
    221851: "Gol Anı",
    221855: "Gol Anı",
    221859: "Gol Anı",
    221860: "Gol Anı",
    223625: "İSHAK7 Onay",
    223731: "Seçkinler kapısı",
    224390: "Ahtapot",
    224491: "Meloş",
    224540: "Carnival Tent",
    224658: "ONExKEKELEME",
    225455: "Eyloli Pozu",
    226392: "EwindaR Crown",
    227320: "Kinder",
    227330: "Muro Pozu",
    227984: "Orhan Iltisi",
    228052: "HACI Jokeri",
    228791: "Lark Bey Selamı",
    229436: "JLeyzz Işıltısı",
    229769: "Sicak VİRA61",
    229872: "AŞİRET ÜYESİ",
    230707: "Gözünüz Topta",
    230709: "Kirişte Denge",
    230752: "Aslan Tacı",
    231268: "Sarı hırs",
    231354: "Yeşim Raconu",
    231955: "Aferin",
    231956: "Alkış",
    231957: "Mahrem Yakınlık",
    231958: "Yok Artık",
    232366: "Dondurma Makinesi",
    232592: "Tempo Flüt",
    232593: "Groove Gitar",
    232612: "B36 Family",
    234553: "Sercan",
    235022: "CGKOSE",
    235731: "BARMY Kalp",
    236751: "حافظ",
    237777: "Liza Selfie",
    237871: "Kebrako Cap",
    240088: "Mikasa Pati",
    240609: "MERT",
    240963: "Eylüş",
    241250: "ÖMÜŞ",
    242053: "Nisa",
    242150: "Zorbiksu",
    242272: "𓆩千ヤ・AİLESİ𓆪",
    244256: "MİA Kulakları",
    245046: "Nenem Parlıyor",
    246520: "ANALİZ",
    246837: "METE",
    247162: "Mijasuzu Tokmağı",
    247359: "Arı kovanı",
    247416: "Baş gundi",
    248309: "Ayşan Tiçır",
    248703: "Soryna",
    248981: "LAGO Yumruğu",
    249136: "LİVAYN",
    249241: "Oldest",
    250088: "Kadir Nota",
    251537: "Dik Dur Bekir",
    252093: "ELR",
    252524: "SPONY",
    252764: "YARASA",
    252930: "Özi",
    253610: "RAULLİVE",
    253615: "Sevbrr",
    255270: "PONİİİ",
    255677: "Skaledman",
    255743: "Aslan Selam",
    255825: "MİSALİ",
    255928: "Elsamo",
    256004: "Özge Nöbeti",
    257035: "Yoyo Bey",
    257046: "Kajja K",
    257489: "King Jux",
    259111: "ELIFS",
    259575: "İboş Yumruk",
    260723: "BabaMüslüm",
    261200: "RDGteam",
    262441: "abusebahadir",
    262712: "F1AİLE",
    263592: "Sakin Huriş",
    263603: "Hagynin Gülleri",
    263681: "Vay Vay",
    263901: "Kagan Bey",
    264297: "Manifest Barış",
    264399: "Anyela",
    265092: "AlpLiver",
    267559: "Mavigöz Selamsıı",
    269004: "Terskelepçe",
    269399: "Murtikoo",
    269980: "Mazo",
    270236: "Chill Rose",
    270754: "isa",
    270762: "NAZLI",
    270763: "Aleyy",
    271917: "maşa",
    272676: "NOX Komutan",
    272697: "GONYALIDAYI42",
    273727: "Ferdibaba",
    274218: "Nurcanyahu",
    277493: "Nigo",
    277737: "Berat27 Tacı",
    281328: "Tekerli Mikrofon",
    285046: "LapinViolet",
    285734: "Findermen",
    286251: "Naber Kelebek",
    287773: "Racon Kralı",
    288092: "Memoş",
    288581: "berkay",
    289257: "Reset Yazmak",
    289562: "PARÇAM",
    290498: "Muhtar",
    290900: "LALA",
    291149: "Buse Kedisi",
    294043: "EHS Baba",
    294688: "LOLO KASAP",
    294759: "Boz Ayucuk",
    294830: "Civciv",
    295336: "ECHO Kılıcı",
    297722: "Moverick",
    298347: "VeGaS Taç",
    298665: "Tofaş Şov",
    298729: "FK10 Yumruğu",
    299053: "Doğan",
    299795: "Bramahmut İmza",
    300084: "DAYI STAR",
    300660: "Berfinxtin",
    301465: "Nyctho Kalbi",
    301750: "Emindorr Direniş",
    301785: "Özgür Selfie",
    302005: "GOGİRLL",
    303265: "ZOCCO",
    303814: "Tacsiz Kral",
    304094: "Mertcan",
    304545: "Kartal Reis",
    304634: "Petito Kulaklık",
    305643: "Çağrım",
    305811: "ZRL",
    306141: "Sürücüpırt",
    308233: "Hamarat Şimşek",
    308303: "Esma Kalp",
    309759: "watchlivealihan",
    310305: "CK",
    311792: "Kral Kurt",
    318755: "Serhanlive0",
    318958: "Deza Şimşek",
    323421: "HAY KULAKLIĞINA",
    323712: "GxMaxi Kalkan",
    324342: "R21",
    326160: "KBL",
    326755: "Maviş Nyx",
    326943: "2Fan",
    327260: "Konsol Bey",
    327291: "HanFlora",
    328126: "Malkoc Yıldız",
    328531: "ROSA",
    329328: "Kara Çekiç",
    331396: "CENK",
    332251: "Fehime Aşkı",
    333139: "Ceylanca",
    333713: "MYZCGLU",
    334159: "MİROŞŞ",
    334648: "Phelia",
    335236: "Mafuyu",
    336986: "Aslan Selamı",
    337157: "İzmirliMeriç",
    341518: "Kral LEO",
    343285: "Vaybex Yumruğu",
    343681: "o1İzmirlee",
    343688: "Yekbun Tepki",
    344589: "ELİF",
    345139: "Ceydalim",
    345255: "ÇAYLARRRR",
    345472: "Ezcan",
    346084: "Konican Ailesi",
    348327: "HOBİ",
    348381: "Yıldız Mor",
    348564: "NiX FAMiLY",
    348952: "ReisBey",
    349107: "Abiiğ Hayırrrr",
    349635: "YEG",
    350619: "SumErog Mikrofon",
    351225: "Supa Aimi",
    351790: "Kero Peluş",
    352154: "Egoş",
    352487: "ELA Taçlı",
    352998: "Stitch",
    353489: "Mami Royel",
    354223: "Aslan Gururu",
    354945: "ESMERBEY",
    356389: "Curio",
    356974: "Ertu Kalp",
    357109: "XX",
    357445: "NAASY",
    357964: "Tugi",
    358222: "mevlüt usta",
    358775: "Nesli Tacı",
    361620: "GhostT Gülüş",
    364292: "Kartal",
    365082: "ibo the great",
    367692: "DEMO",
    368408: "AC Kaan",
    372399: "Aysel",
    372422: "Bozkurt",
    373483: "Marsik",
    373529: "Ferdo",
    374237: "ESMERBEY",
    374524: "Meriteam",
    374873: "Adam Ya",
    376017: "CHN Cihan",
    376637: "Sevseydi Gitmezd",
    376654: "SqulShy",
    377067: "Emrah ın Kalbi",
    377430: "Neşeli Işıl",
    378305: "Koza Yolda",
    378382: "RingoOsman",
    379103: "GAME HUNTER",
    379150: "Burak Köroğlu",
    379435: "Mor Panter",
    379568: "Çay Var Mı Çay",
    379903: "Molly Pembe",
    380214: "EAGLE",
    380752: "Ayşenur",
    380934: "Felix Kalbi",
    381160: "Çipil misin be",
    382835: "Şişman Furky",
    383678: "Dinçer Abi",
    383813: "BTW",
    384768: "Jindaa",
    384974: "KYS",
    385157: "KEYN in kalbi",
    385458: "Yat Aşağa",
    386493: "Kozmika",
    387060: "CHİPİCHAPO",
    390116: "Obez",
    390841: "AYRI",
    392312: "DVSO",
    392356: "Aslan Koralp",
    392591: "Anka Kanat",
    392721: "Metal Ailesi",
    392753: "AoweLin Yumruğu",
    393144: "Tuğrul Aşireti",
    393942: "Güven Eda",
    394679: "Gap Olay",
    397645: "Niko Punkta",
    400663: "Cali",
    402129: "KARA丶ANYELA",
    403745: "SIMS",
    404672: "LOLİŞ",
    407045: "Delibal",
    408338: "Zınk Reisi",
    412017: "Huni Ailesi",
    412945: "SANCAK",
    413730: "Racon Kralı",
    416204: "Ömer Bey",
    417500: "Karam Zorba",
    417639: "Mami kanka",
    418429: "Yuukisu",
    419707: "MIDITENYU",
    421405: "aygungameplay",
    421629: "Uğur Böceği",
    422156: "Aslan Kükreyişi",
    422592: "Vera Kaplan",
    423352: "X10 Mehtap",
    423469: "Paşam Bakış",
    426956: "GAMZEEE",
    427095: "TanyaRae",
    429763: "Nobişşş",
    429865: "Falan Filan",
    436045: "SERO",
    436099: "VedoTubi",
    437973: "Şarkı Ustası",
    439693: "Tubikoo",
    444453: "Kıvırcık Kalp",
    445963: "Elits",
    446305: "purg",
    446891: "Du Bi Ya",
    453143: "JADE",
    462867: "C4 FAMİLY",
};
function resolveGiftNameFromId(id) {
    if (id == null) return '';
    return TIKTOK_GIFT_ID_TO_NAME[Number(id)] || '';
}

// ─── Per-mod arm/disarm ──────────────────────────────────────────────────
// Each mod can be independently armed. Gift events fire only the actions
// from armed mods. Persisted in localStorage so toggle survives reloads.
const ARMED_MODS_KEY = 'armedModIds';
let armedModIds = new Set();  // Set<modId>
let armedGiftIndex = new Map(); // giftName (lower) → [{ modTitle, modId, action }]
let lastActionLog = [];
// Backwards-compat flag — other parts of the file gate dispatch on it.
let modActionsArmed = false;
function _syncArmedFlag() { modActionsArmed = armedModIds.size > 0; }

function loadArmedFromStorage() {
    try {
        const raw = localStorage.getItem(ARMED_MODS_KEY);
        if (raw) armedModIds = new Set(JSON.parse(raw));
    } catch {}
}
function saveArmedToStorage() {
    try { localStorage.setItem(ARMED_MODS_KEY, JSON.stringify([...armedModIds])); } catch {}
}
function isModArmed(modId) { return armedModIds.has(String(modId)); }

// Rebuild armedGiftIndex from the installed mods, including only the ones
// in armedModIds. Called after every arm/disarm toggle.
async function rebuildArmedIndex() {
    try {
        const result = await window.api.getInstalledMods();
        if (!result.success) throw new Error(result.error || 'load failed');
        const mods = result.data || [];
        armedGiftIndex.clear();
        // Reverse map: canonical Turkish name → giftId so we can index a
        // saved "Gül" mapping under both "gül" AND "id:5655".
        const NAME_TO_ID = {};
        for (const [id, n] of Object.entries(TIKTOK_GIFT_ID_TO_NAME)) {
            NAME_TO_ID[n.toLocaleLowerCase('tr-TR')] = id;
        }
        let total = 0;
        for (const m of mods) {
            if (!isModArmed(m._id)) continue;
            const actions = m.config?.giftActions || {};
            for (const [giftName, action] of Object.entries(actions)) {
                if (!action || !action.value) continue;
                const nameKey = giftName.trim().toLocaleLowerCase('tr-TR');
                if (!nameKey) continue;
                const entry = { modTitle: m.title, modId: m._id, giftName, action };
                if (!armedGiftIndex.has(nameKey)) armedGiftIndex.set(nameKey, []);
                armedGiftIndex.get(nameKey).push(entry);
                // Also index by ID if we know one for this canonical name
                const id = NAME_TO_ID[nameKey];
                if (id) {
                    const idKey = `id:${id}`;
                    if (!armedGiftIndex.has(idKey)) armedGiftIndex.set(idKey, []);
                    armedGiftIndex.get(idKey).push(entry);
                }
                total++;
            }
        }
        updateArmBadge();
        console.log(`[ARM] rebuilt index — ${armedModIds.size} armed mod(s), ${total} action(s), ${armedGiftIndex.size} matchable keys`);
        return { armedMods: armedModIds.size, totalMods: mods.length, actions: total };
    } catch (err) {
        showToast?.('Mod indeksi yüklenemedi: ' + err.message, true);
        return null;
    }
}

// Arm a single mod (mod detail button).
async function armSingleMod(modId) {
    if (!modId) return;
    armedModIds.add(String(modId));
    saveArmedToStorage();
    _syncArmedFlag();
    const stats = await rebuildArmedIndex();
    updateModArmButton(modId);
    // Auto-launch this mod's saved command if enabled.
    if (getModLaunchAuto(modId)) {
        const cmd = getModLaunchCmd(modId);
        if (cmd) {
            window.api.launchGame?.({ command: cmd }).then((r) => {
                if (r?.success) showToast?.(`🚀 Oyun başlatıldı (pid ${r.pid})`);
            });
        }
    }
    showToast?.(`🎮 Mod silahlandı (${stats?.actions || 0} aksiyon)`);
}
async function disarmSingleMod(modId) {
    if (!modId) return;
    armedModIds.delete(String(modId));
    saveArmedToStorage();
    await rebuildArmedIndex();
    updateModArmButton(modId);
    showToast?.('🔒 Mod durduruldu');
}
async function toggleSingleMod(modId) {
    if (isModArmed(modId)) await disarmSingleMod(modId);
    else await armSingleMod(modId);
}

// Compatibility shim — kept so old "Mod Aksiyonlarını Başlat" button on
// TikTok Canlı page still works, but it now means "arm every installed mod".
async function armModActions() {
    try {
        const result = await window.api.getInstalledMods();
        if (!result.success) throw new Error(result.error || 'load failed');
        const mods = result.data || [];
        for (const m of mods) armedModIds.add(String(m._id));
        saveArmedToStorage();
        const stats = await rebuildArmedIndex();
        showToast(`🎮 ${mods.length} modda ${stats?.actions || 0} aksiyon silahlandı`);
        for (const m of mods) {
            if (getModLaunchAuto(m._id)) {
                const cmd = getModLaunchCmd(m._id);
                if (cmd) window.api.launchGame?.({ command: cmd });
            }
        }
        return { mods: mods.length, actions: stats?.actions || 0 };
    } catch (err) {
        showToast('Silahlanamadı: ' + err.message, true);
        return null;
    }
}

function disarmModActions() {
    armedModIds.clear();
    saveArmedToStorage();
    _syncArmedFlag();
    armedGiftIndex.clear();
    updateArmBadge();
    // Refresh the per-mod button if user is on a mod detail page.
    if (currentModDetail?._id) updateModArmButton(currentModDetail._id);
    showToast('🔒 Tüm mod aksiyonları durduruldu');
}

// Restore armed set on load
loadArmedFromStorage();
_syncArmedFlag();

function updateArmBadge() {
    const totalActions = [...armedGiftIndex.values()].reduce((n, arr) => n + arr.length, 0);
    const armedCount = armedModIds.size;
    const armedEl = document.getElementById('mod-armed-status');
    const armedBtnEl = document.getElementById('mod-armed-toggle');
    const armedCountEl = document.getElementById('mod-armed-count');
    if (armedEl) {
        armedEl.innerHTML = armedCount > 0
            ? `<span style="color:#ff2eb8;font-weight:700;">● ${armedCount} MOD AKTİF</span>`
            : `<span style="color:#9d8bbf;">● Hiçbiri</span>`;
    }
    if (armedCountEl) armedCountEl.textContent = armedCount > 0 ? `${totalActions} aksiyon hazır` : '';
    if (armedBtnEl) {
        armedBtnEl.innerHTML = armedCount > 0
            ? '<i class="fas fa-stop-circle"></i> Tümünü Durdur'
            : '<i class="fas fa-play-circle"></i> Tümünü Başlat';
        armedBtnEl.style.background = armedCount > 0
            ? 'linear-gradient(135deg,#ff2eb8,#ff5722)'
            : 'linear-gradient(135deg,#ff2eb8,#a855f7)';
    }
}

async function toggleModActions() {
    if (modActionsArmed) disarmModActions();
    else await armModActions();
}

// ─── Global hotkey wiring ────────────────────────────────────────────────
// Captures key combo into the input and saves it via main.js globalShortcut.
function captureModHotkey(e) {
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push(process.platform === 'darwin' ? 'Cmd' : 'Super');
    // Ignore pure modifier key events — wait for an actual key.
    const k = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(k)) return;
    let key = k.length === 1 ? k.toUpperCase() : k;
    // Special-case function keys / common names so Electron accepts them.
    if (/^F\d{1,2}$/i.test(key)) key = key.toUpperCase();
    parts.push(key);
    const accel = parts.join('+');
    const input = document.getElementById('mod-hotkey-input');
    if (input) input.value = accel;
}

async function saveModHotkey() {
    const input = document.getElementById('mod-hotkey-input');
    if (!input || !window.api?.setModHotkey) return;
    const accel = (input.value || '').trim();
    if (!accel) return;
    const res = await window.api.setModHotkey(accel);
    if (res?.success) {
        try { localStorage.setItem('modToggleHotkey', accel); } catch {}
        showToast?.(`⌨️ Hotkey kaydedildi: ${accel}`);
    } else {
        showToast?.('Bu hotkey kaydedilemedi (başka uygulama kullanıyor olabilir)', true);
    }
}

// Listen for the global hotkey firing from main.js, toggle arm/disarm.
if (window.api?.onHotkeyToggleMods) {
    window.api.onHotkeyToggleMods(() => {
        toggleModActions();
    });
}

// Restore saved hotkey on load
document.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = localStorage.getItem('modToggleHotkey');
        if (saved) {
            const input = document.getElementById('mod-hotkey-input');
            if (input) input.value = saved;
            window.api?.setModHotkey?.(saved);
        }
    } catch {}
});

// Called from handleTikTokEvent on every event — fires any matching mod actions.
//   - repeatCount honored: 10 gül birden = 10 keystroke (capped to 20 to
//     protect against rapid-fire spam locking up the OS).
//   - per-key cooldown 40ms between consecutive presses → most games still
//     register each as a discrete tap.
async function dispatchModActions(giftName, repeatCount = 1, giftId = null) {
    if (!modActionsArmed) return;
    // Build candidate keys: resolved name, raw ID, and any alias names we
    // can derive from the ID table. dispatch fires the first hit.
    const keys = new Set();
    if (giftName) keys.add(String(giftName).trim().toLocaleLowerCase('tr-TR'));
    if (giftId != null) {
        keys.add(`id:${giftId}`);
        const aliasName = resolveGiftNameFromId(giftId);
        if (aliasName) keys.add(aliasName.trim().toLocaleLowerCase('tr-TR'));
    }
    let entries = null;
    let matchedKey = '';
    for (const k of keys) {
        if (armedGiftIndex.has(k)) { entries = armedGiftIndex.get(k); matchedKey = k; break; }
    }
    if (!entries || !entries.length) {
        console.log(`[DISPATCH MISS] gift="${giftName}" id=${giftId} tried=${[...keys].join('|')} indexedKeys=${[...armedGiftIndex.keys()].slice(0, 20).join(',')}`);
        return;
    }
    console.log(`[DISPATCH HIT] matched "${matchedKey}" → ${entries.length} action(s) × ${repeatCount}`);
    const fires = Math.max(1, Math.min(20, Number(repeatCount) || 1));
    for (const { modTitle, action } of entries) {
        for (let i = 0; i < fires; i++) {
            try {
                const res = await window.api.executeAction(action);
                logActionFired({ giftName, modTitle, action, ok: res.success, error: res.error, n: `${i+1}/${fires}` });
                if (!res.success) break; // bail the loop on first failure (e.g. AX denied)
            } catch (err) {
                logActionFired({ giftName, modTitle, action, ok: false, error: err.message });
                break;
            }
            if (i < fires - 1) await new Promise(r => setTimeout(r, 40));
        }
    }
}

function logActionFired(entry) {
    entry.time = new Date();
    lastActionLog.unshift(entry);
    if (lastActionLog.length > 50) lastActionLog.pop();
    renderActionLog();
}

function renderActionLog() {
    const el = document.getElementById('mod-action-log');
    if (!el) return;
    if (!lastActionLog.length) {
        el.innerHTML = '<div style="color:#9d8bbf;text-align:center;padding:1rem;font-size:0.75rem;font-style:italic;">Henüz fire edilen aksiyon yok</div>';
        return;
    }
    el.innerHTML = lastActionLog.slice(0, 15).map(l => `
        <div style="display:flex;gap:0.5rem;align-items:center;padding:0.35rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.72rem;">
            <span style="color:${l.ok ? '#ff2eb8' : '#ef4444'};font-size:0.8rem;">${l.ok ? '✓' : '✗'}</span>
            <span style="color:#fff;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.giftName)} → <span style="color:var(--gold);">${escapeHtml(l.action.value)}</span></span>
            <span style="color:#9d8bbf;font-size:0.65rem;">${l.modTitle}</span>
            <span style="color:#9d8bbf;font-size:0.65rem;">${l.time.toLocaleTimeString('tr-TR')}</span>
        </div>`).join('');
}

// Test firing a specific mod's Gül mapping (used by Mod Detail page)
async function testModShortcut(giftName) {
    if (!currentModDetail) return;
    const action = currentModConfig?.giftActions?.[giftName];
    if (!action || !action.value) { showToast('Önce bu hediyeye bir aksiyon ata', true); return; }
    const result = await window.api.executeAction(action);
    if (result.success) showToast(`🎮 ${giftName} → ${action.value} fire edildi`);
    else showToast('Fire hatası: ' + result.error, true);
}

// Resolve backend-relative media paths (e.g. "/uploads/mod-images/x.png").
// The app runs from file://, so relative paths must be prefixed with the
// backend origin or they resolve to file:///uploads/... and never load.
function absBackendUrl(u) {
    if (!u) return '';
    if (/^(https?:|data:|file:)/i.test(u)) return u;
    if (u.startsWith('/')) return BACKEND_URL + u;
    return u;
}

async function loadMods() {
    const modsGrid = document.getElementById('mods-grid');
    const noMods = document.getElementById('no-mods');
    if (modsGrid) modsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9d8bbf;padding:3rem;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;opacity:0.5;"></i><p style="margin-top:0.75rem;">Yükleniyor...</p></div>';
    if (noMods) noMods.style.display = 'none';

    try {
        const [listRes, installedRes] = await Promise.all([
            window.api.getMods(),
            window.api.getInstalledMods()
        ]);

        if (!listRes.success) throw new Error(listRes.error || 'load failed');
        allMods = listRes.data || [];
        installedModIdSet = new Set((installedRes.success ? installedRes.data : []).map(m => m._id));

        setText('mods-total-count', allMods.length);
        filterMods();
    } catch (error) {
        console.error('Failed to load mods:', error);
        if (modsGrid) modsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ff2eb8;padding:3rem;"><i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i><p style="margin-top:0.75rem;">Modlar yüklenemedi</p></div>';
    }
}

function filterMods() {
    const q = (document.getElementById('mod-search')?.value || '').toLowerCase().trim();
    const category = document.getElementById('mod-category')?.value || 'all';
    const installedFilter = document.getElementById('mod-filter')?.value || 'all';

    let list = [...allMods];
    if (q) {
        list = list.filter(m =>
            m.title.toLowerCase().includes(q) ||
            (m.description || '').toLowerCase().includes(q) ||
            (m.gameTitle || '').toLowerCase().includes(q)
        );
    }
    if (category !== 'all') {
        list = list.filter(m => m.category === category);
    }
    if (installedFilter === 'installed') list = list.filter(m => installedModIdSet.has(m._id));
    else if (installedFilter === 'not-installed') list = list.filter(m => !installedModIdSet.has(m._id));

    setText('mod-result-count', `${list.length} mod`);
    displayMods(list);
}

function displayMods(mods) {
    const modsGrid = document.getElementById('mods-grid');
    const noMods = document.getElementById('no-mods');
    if (!modsGrid) return;

    if (mods.length === 0) {
        modsGrid.innerHTML = '';
        if (noMods) noMods.style.display = 'block';
        return;
    }
    if (noMods) noMods.style.display = 'none';

    modsGrid.innerHTML = mods.map(mod => {
        const isInstalled = installedModIdSet.has(mod._id);
        const img = absBackendUrl(mod.imageUrl) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect fill="%23101018" width="600" height="400"/></svg>';
        return `
            <div class="mod-card" onclick="openModDetail('${mod._id}')">
                <div style="position:relative;">
                    <img src="${escapeHtml(img)}" class="mod-card-image" alt="${escapeHtml(mod.title)}"
                         onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 600 400%22><rect fill=%22%23101018%22 width=%22600%22 height=%22400%22/></svg>'">
                    <div class="mod-card-top-badges">
                        ${mod.category ? `<span class="mod-card-badge">${escapeHtml(mod.category)}</span>` : ''}
                        ${isInstalled ? '<span class="mod-card-badge installed"><i class="fas fa-check-circle"></i> YÜKLÜ</span>' : ''}
                    </div>
                </div>
                <div class="mod-card-body">
                    <div class="mod-card-game">${escapeHtml(mod.gameTitle || '—')}</div>
                    <div class="mod-card-title">${escapeHtml(mod.title)}</div>
                    <div class="mod-card-desc">${escapeHtml(mod.description || '')}</div>
                    <div class="mod-card-footer">
                        <div class="mod-card-stats">
                            <span><i class="fas fa-code-branch"></i> v${escapeHtml(mod.version || '1.0.0')}</span>
                            <span><i class="fas fa-download"></i> <b>${mod.downloadCount || 0}</b></span>
                        </div>
                        <span class="mod-card-arrow">Detay <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ═══════════════════ ADD GAME MODAL ═══════════════════

function openAddGameModal() {
    const m = document.getElementById('add-game-modal');
    if (m) m.classList.add('active');
    _agTemplate = [];
    _agTplDraft = { giftName: '', iconUrl: '', value: '' };
    renderAgTemplate();
    const gv = document.getElementById('ag-tpl-value'); if (gv) gv.value = '';
    const gg = document.getElementById('ag-tpl-gift'); if (gg) gg.innerHTML = '🎁 Hediye';
}
function closeAddGameModal() {
    const m = document.getElementById('add-game-modal');
    if (m) m.classList.remove('active');
    // Reset form
    ['ag-title', 'ag-game', 'ag-description', 'ag-image', 'ag-download'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const ver = document.getElementById('ag-version'); if (ver) ver.value = '1.0.0';
    _agTemplate = [];
    renderAgTemplate();
}

async function submitAddGame() {
    const payload = {
        title: document.getElementById('ag-title').value.trim(),
        gameTitle: document.getElementById('ag-game').value.trim(),
        description: document.getElementById('ag-description').value.trim(),
        category: document.getElementById('ag-category').value,
        version: document.getElementById('ag-version').value.trim() || '1.0.0',
        imageUrl: document.getElementById('ag-image').value.trim(),
        downloadUrl: document.getElementById('ag-download').value.trim(),
        tags: [],
        template: _agTemplate.map(t => ({ giftName: t.giftName, type: t.type, value: t.value }))
    };
    if (!payload.title || !payload.gameTitle || !payload.downloadUrl) {
        showToast('Başlık, oyun adı ve indirme URL zorunlu', true);
        return;
    }
    try {
        const result = await window.api.createMod(payload);
        if (result.success) {
            showToast(`"${payload.title}" eklendi ✓`);
            closeAddGameModal();
            await loadMods();
        } else {
            showToast('Eklenemedi: ' + result.error, true);
        }
    } catch (e) {
        showToast('Bağlantı hatası', true);
    }
}

// ─── "Yeni Oyun Ekle" taslak (template) editörü ────────────────────────
let _agTemplate = [];
let _agTplDraft = { giftName: '', iconUrl: '', value: '' };

// Shared keyboard/mouse/text capture used by both the mod-detail and the
// add-game-template editors. Calls onValue(value) with the captured shortcut.
function captureShortcutInto(type, input, onValue) {
    if (!input) return;
    if (type === 'text') {
        input.readOnly = false; input.focus();
        input.onblur = () => { input.readOnly = true; onValue(input.value.trim()); };
        return;
    }
    input.classList.add('capturing'); input.value = '...';
    const finish = (val) => {
        input.classList.remove('capturing'); input.value = val || ''; onValue(val || '');
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('mousedown', onMouse, true);
    };
    const onKey = (e) => {
        if (type !== 'keyboard') return;
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') { finish(''); return; }
        const p = [];
        if (e.ctrlKey) p.push('Ctrl'); if (e.altKey) p.push('Alt');
        if (e.shiftKey) p.push('Shift'); if (e.metaKey) p.push('Cmd');
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) { p.push(e.key.length === 1 ? e.key.toUpperCase() : e.key); finish(p.join('+')); }
    };
    const onMouse = (e) => {
        if (type !== 'mouse') return;
        if (e.target === input) return;
        e.preventDefault(); e.stopPropagation();
        finish(e.button === 0 ? 'LeftClick' : e.button === 2 ? 'RightClick' : e.button === 1 ? 'MiddleClick' : `Mouse${e.button}`);
    };
    window.addEventListener('keydown', onKey, true);
    if (type === 'mouse') setTimeout(() => window.addEventListener('mousedown', onMouse, true), 50);
}

function agTplTypeChanged() {
    _agTplDraft.value = '';
    const v = document.getElementById('ag-tpl-value');
    const type = document.getElementById('ag-tpl-type')?.value || 'keyboard';
    if (v) { v.value = ''; v.readOnly = true; v.classList.remove('capturing'); v.placeholder = { keyboard: 'Kısayol (tıkla+bas)', text: 'Komut yaz (tıkla)', mouse: 'Fare (tıkla+bas)' }[type]; }
}
function agTplCapture() {
    const type = document.getElementById('ag-tpl-type').value;
    captureShortcutInto(type, document.getElementById('ag-tpl-value'), (val) => { _agTplDraft.value = val; });
}
function agTplPickGift() {
    openGiftPickerFor((giftName, iconUrl) => {
        _agTplDraft.giftName = giftName; _agTplDraft.iconUrl = iconUrl;
        const g = document.getElementById('ag-tpl-gift');
        if (g) g.innerHTML = `<img src="${iconUrl}" style="width:16px;height:16px;border-radius:3px;vertical-align:middle;" onerror="this.style.display='none'"> ${escapeHtml(giftName)}`;
    });
}
function agTplAdd() {
    const type = document.getElementById('ag-tpl-type').value;
    if (type === 'text') { const v = document.getElementById('ag-tpl-value'); if (v) _agTplDraft.value = v.value.trim(); }
    if (!_agTplDraft.giftName) { showToast('Önce hediye seç', true); return; }
    if (!_agTplDraft.value) { showToast('Önce kısayol/değer gir', true); return; }
    _agTemplate.push({ giftName: _agTplDraft.giftName, iconUrl: _agTplDraft.iconUrl, type, value: _agTplDraft.value });
    _agTplDraft = { giftName: '', iconUrl: '', value: '' };
    const v = document.getElementById('ag-tpl-value'); if (v) v.value = '';
    const g = document.getElementById('ag-tpl-gift'); if (g) g.innerHTML = '🎁 Hediye';
    renderAgTemplate();
}
function agTplRemove(i) { _agTemplate.splice(i, 1); renderAgTemplate(); }
function renderAgTemplate() {
    const list = document.getElementById('ag-tpl-list'); if (!list) return;
    const ic = { keyboard: '⌨', text: '📝', mouse: '🖱' };
    list.innerHTML = _agTemplate.map((t, i) => `
        <div style="display:flex;align-items:center;gap:0.5rem;background:var(--bg);border:1px solid var(--ov-06);border-radius:6px;padding:0.35rem 0.55rem;font-size:0.74rem;">
            <img src="${t.iconUrl || ''}" style="width:18px;height:18px;border-radius:3px;" onerror="this.style.display='none'">
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.giftName)}</span>
            <span style="color:#ff2eb8;font-weight:700;white-space:nowrap;">${ic[t.type] || '⌨'} ${escapeHtml(t.value)}</span>
            <button type="button" onclick="agTplRemove(${i})" style="background:none;border:none;color:#ff6b9d;cursor:pointer;font-size:0.9rem;">✕</button>
        </div>`).join('');
}
window.agTplTypeChanged = agTplTypeChanged;
window.agTplCapture = agTplCapture;
window.agTplPickGift = agTplPickGift;
window.agTplAdd = agTplAdd;
window.agTplRemove = agTplRemove;

// ═══════════════════ MOD DETAIL PAGE ═══════════════════

let currentModDetail = null;   // full mod object
let currentModConfig = null;   // { installed, installPath, giftActions: {...} }

async function openModDetail(modId) {
    // Fetch mod + config in parallel
    try {
        const mod = allMods.find(m => m._id === modId)
            || (await fetch(`${BACKEND_URL}/api/mods/${modId}`).then(r => r.json()).catch(() => null));
        if (!mod || !mod._id) { showToast('Mod bulunamadı', true); return; }

        const cfgRes = await window.api.getModConfig(modId);
        currentModDetail = mod;
        currentModConfig = cfgRes.success ? cfgRes.data : { installed: false, giftActions: {} };
        if (!currentModConfig.giftActions) currentModConfig.giftActions = {};

        // First open with no personal mapping → seed from the mod's template (if any),
        // so the streamer starts with sensible gift→shortcut defaults instead of blank.
        if (Object.keys(currentModConfig.giftActions).length === 0 && Array.isArray(mod.template) && mod.template.length) {
            const seeded = {};
            mod.template.forEach(t => { if (t && t.giftName && t.value) seeded[t.giftName] = { type: t.type || 'keyboard', value: t.value }; });
            if (Object.keys(seeded).length) {
                currentModConfig.giftActions = seeded;
                window.api.saveModConfig(modId, { giftActions: seeded }).catch(() => {});
            }
        }

        // Switch to detail page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('mod-detail-page').classList.add('active');

        renderModDetailHero();
        await loadGiftCatalog();
        renderModGiftActions();
    } catch (e) {
        console.error('openModDetail error:', e);
        showToast('Mod açılamadı', true);
    }
}

function renderModDetailHero() {
    const mod = currentModDetail;
    if (!mod) return;
    setText('md-breadcrumb', `${mod.gameTitle || '—'} / ${mod.title}`);
    setText('md-category', (mod.category || 'mod').toUpperCase());
    setText('md-version', `v${mod.version || '1.0.0'}`);
    setText('md-installs', `${mod.downloadCount || 0} indirme`);
    setText('md-title', mod.title);
    setText('md-game', mod.gameTitle || '—');
    setText('md-description', mod.description || '');
    const heroBg = document.getElementById('md-hero-bg');
    if (heroBg && mod.imageUrl) heroBg.style.backgroundImage = `url('${absBackendUrl(mod.imageUrl).replace(/'/g, "\\'")}')`;
    else if (heroBg) heroBg.style.backgroundImage = 'linear-gradient(135deg, #1a1a2e, #07030f)';

    // Install/uninstall button states
    const isInstalled = !!currentModConfig?.installed;
    const integration = isIntegrationMod(mod);
    const installBtn = document.getElementById('md-install-btn');
    const uninstallBtn = document.getElementById('md-uninstall-btn');
    if (installBtn) {
        if (integration) {
            // Minecraft/integration mods aren't downloaded — connect in-game instead.
            installBtn.innerHTML = '<i class="fas fa-plug"></i> Sunucuya Bağlan';
            installBtn.disabled = false;
            installBtn.style.opacity = '1';
            installBtn.style.cursor = 'pointer';
        } else {
            installBtn.innerHTML = isInstalled
                ? '<i class="fas fa-check-circle"></i> Yüklü ✓'
                : '<i class="fas fa-download"></i> Kur';
            installBtn.disabled = isInstalled;
            installBtn.style.opacity = isInstalled ? '0.7' : '1';
            installBtn.style.cursor = isInstalled ? 'default' : 'pointer';
        }
    }
    if (uninstallBtn) uninstallBtn.style.display = (isInstalled && !integration) ? 'inline-flex' : 'none';

    // Per-mod arm/disarm card — only meaningful once the mod is installed
    const armCard = document.getElementById('md-arm-card');
    if (armCard) armCard.style.display = isInstalled ? '' : 'none';
    updateModArmButton(mod._id);

    // Restore per-mod launch command + auto-launch toggle from localStorage
    const cmdInput = document.getElementById('md-launch-cmd');
    const autoInput = document.getElementById('md-launch-on-arm');
    if (cmdInput) cmdInput.value = getModLaunchCmd(mod._id) || '';
    if (autoInput) autoInput.checked = getModLaunchAuto(mod._id);
}

// ─── Game launcher (per-mod, localStorage-backed) ────────────────────────
function _modLaunchKey(modId, suffix = 'cmd') { return `modLaunch:${modId}:${suffix}`; }
function getModLaunchCmd(modId) {
    try { return localStorage.getItem(_modLaunchKey(modId, 'cmd')) || ''; } catch { return ''; }
}
function getModLaunchAuto(modId) {
    try { return localStorage.getItem(_modLaunchKey(modId, 'auto')) === '1'; } catch { return false; }
}
function saveLaunchCmd() {
    if (!currentModDetail) return;
    const cmd = document.getElementById('md-launch-cmd')?.value || '';
    const auto = document.getElementById('md-launch-on-arm')?.checked ? '1' : '0';
    try {
        localStorage.setItem(_modLaunchKey(currentModDetail._id, 'cmd'), cmd);
        localStorage.setItem(_modLaunchKey(currentModDetail._id, 'auto'), auto);
    } catch {}
}
async function pickLaunchFile() {
    if (!window.api?.pickLaunchFile) return;
    const res = await window.api.pickLaunchFile();
    if (res?.success && res.path) {
        const input = document.getElementById('md-launch-cmd');
        if (input) {
            // Wrap in quotes if the path contains spaces
            input.value = /\s/.test(res.path) ? `"${res.path}"` : res.path;
            saveLaunchCmd();
            showToast?.('Yol kaydedildi');
        }
    }
}
async function launchGame() {
    const cmd = (document.getElementById('md-launch-cmd')?.value || '').trim();
    if (!cmd) { showToast?.('Önce bir komut/yol gir', true); return; }
    saveLaunchCmd();
    try {
        const res = await window.api.launchGame({ command: cmd });
        if (res?.success) showToast?.(`🚀 Oyun başlatıldı (pid ${res.pid})`);
        else showToast?.('Başlatılamadı: ' + (res?.error || 'bilinmeyen hata'), true);
    } catch (e) {
        showToast?.('Hata: ' + e.message, true);
    }
}

function renderModGiftActions() {
    const grid = document.getElementById('md-gift-grid');
    if (!grid) return;

    const q = (document.getElementById('md-search')?.value || '').toLocaleLowerCase('tr-TR').trim();
    const actions = currentModConfig?.giftActions || {};
    // Only the ASSIGNED mappings are shown now (was: all 123 gifts → huge clutter).
    const allEntries = Object.entries(actions).filter(([, a]) => a && a.value);
    let entries = allEntries;
    if (q) entries = allEntries.filter(([name]) => name.toLocaleLowerCase('tr-TR').includes(q));

    // Update badges
    const totalGifts = giftCatalogCache.length;
    const mapped = allEntries.length;
    setText('md-gifts-total', totalGifts);
    setText('md-actions-count', mapped);
    setText('md-kb-count', allEntries.filter(([, a]) => a.type === 'keyboard').length);
    setText('md-unmapped-count', Math.max(0, totalGifts - mapped));

    if (!allEntries.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;line-height:1.7;">Henüz eşleştirme yok.<br><b style="color:#ff2eb8;">+ Hediye Eşleştir</b> ile ekle. (Bu modun bir taslağı varsa otomatik gelir.)</div>';
        return;
    }
    if (!entries.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Aramayla eşleşen yok</div>';
        return;
    }

    const typeIcon = { keyboard: '⌨', text: '📝', mouse: '🖱' };
    grid.innerHTML = entries.map(([name, act]) => {
        const g = giftCatalogCache.find(x => x.name === name) || {};
        const nameEsc = escapeHtml(name).replace(/'/g, "\\'");
        return `
            <div class="md-gift-row mapped" data-name="${escapeHtml(name)}">
                <img class="md-gift-icon" src="${g.icon || ''}" alt="" onerror="this.style.display='none'">
                <div class="md-gift-info">
                    <div class="md-gift-name">${escapeHtml(name)}</div>
                    <div class="md-gift-coins">💎 ${g.coins ?? '?'}</div>
                </div>
                <div style="margin-left:auto;display:flex;align-items:center;gap:0.4rem;">
                    <span style="background:rgba(255,46,184,0.12);border:1px solid rgba(255,46,184,0.3);color:#ff2eb8;padding:0.25rem 0.6rem;border-radius:6px;font-size:0.74rem;font-weight:700;white-space:nowrap;">${typeIcon[act.type] || '⌨'} ${escapeHtml(act.value)}</span>
                    <button class="md-gift-btn md-gift-btn-test" onclick="testGiftAction('${nameEsc}')" title="Test et"><i class="fas fa-bolt"></i></button>
                    <button class="md-gift-btn" onclick="clearGiftAction('${nameEsc}')" title="Kaldır"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
    }).join('');
}

// ─── Tek-tek "Hediye Eşleştir" ekleme paneli ───────────────────────────
let _mdAdd = { giftName: '', iconUrl: '', value: '' };

function toggleMdAddPanel(show) {
    const panel = document.getElementById('md-add-panel');
    if (!panel) return;
    const willShow = (show === undefined) ? panel.style.display === 'none' : !!show;
    panel.style.display = willShow ? 'block' : 'none';
    if (willShow) {
        _mdAdd = { giftName: '', iconUrl: '', value: '' };
        const v = document.getElementById('md-add-value'); if (v) { v.value = ''; v.readOnly = true; v.classList.remove('capturing'); }
        const g = document.getElementById('md-add-gift'); if (g) g.innerHTML = '🎁 Hediye seç (ara)';
        const t = document.getElementById('md-add-type'); if (t) t.value = 'keyboard';
        mdAddTypeChanged();
    }
}

function mdAddTypeChanged() {
    _mdAdd.value = '';
    const v = document.getElementById('md-add-value');
    const type = document.getElementById('md-add-type')?.value || 'keyboard';
    if (v) {
        v.value = ''; v.readOnly = true; v.classList.remove('capturing');
        v.placeholder = { keyboard: 'Tıkla, sonra tuşa bas (örn. Ctrl+1)', text: 'Tıkla ve komutu yaz (örn. /heal)', mouse: 'Tıkla, sonra fare tuşuna bas' }[type];
    }
}

function mdCaptureValue() {
    const type = document.getElementById('md-add-type').value;
    const input = document.getElementById('md-add-value');
    if (!input) return;
    if (type === 'text') {
        input.readOnly = false; input.focus();
        input.onblur = () => { input.readOnly = true; _mdAdd.value = input.value.trim(); };
        return;
    }
    input.classList.add('capturing'); input.value = '...';
    const finish = (val) => {
        input.classList.remove('capturing');
        input.value = val || ''; _mdAdd.value = val || '';
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('mousedown', onMouse, true);
    };
    const onKey = (e) => {
        if (type !== 'keyboard') return;
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') { finish(''); return; }
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl'); if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift'); if (e.metaKey) parts.push('Cmd');
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) { parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key); finish(parts.join('+')); }
    };
    const onMouse = (e) => {
        if (type !== 'mouse') return;
        if (e.target === input) return;
        e.preventDefault(); e.stopPropagation();
        finish(e.button === 0 ? 'LeftClick' : e.button === 2 ? 'RightClick' : e.button === 1 ? 'MiddleClick' : `Mouse${e.button}`);
    };
    window.addEventListener('keydown', onKey, true);
    if (type === 'mouse') setTimeout(() => window.addEventListener('mousedown', onMouse, true), 50);
}

function mdPickGift() {
    openGiftPickerFor((giftName, iconUrl) => {
        _mdAdd.giftName = giftName; _mdAdd.iconUrl = iconUrl;
        const g = document.getElementById('md-add-gift');
        if (g) g.innerHTML = `<img src="${iconUrl}" style="width:18px;height:18px;border-radius:3px;" onerror="this.style.display='none'"> ${escapeHtml(giftName)}`;
    });
}

async function mdAddMapping() {
    const type = document.getElementById('md-add-type').value;
    if (type === 'text') { const v = document.getElementById('md-add-value'); if (v) _mdAdd.value = v.value.trim(); }
    if (!_mdAdd.giftName) { showToast('Önce bir hediye seç', true); return; }
    if (!_mdAdd.value) { showToast('Önce kısayol/değer gir', true); return; }
    const gn = _mdAdd.giftName, val = _mdAdd.value;
    await saveGiftAction(gn, { type, value: val });
    toggleMdAddPanel(false);
    showToast(`✓ ${gn} → ${type === 'keyboard' ? '⌨' : type === 'text' ? '📝' : '🖱'} ${val}`);
}
window.toggleMdAddPanel = toggleMdAddPanel;
window.mdAddTypeChanged = mdAddTypeChanged;
window.mdCaptureValue = mdCaptureValue;
window.mdPickGift = mdPickGift;
window.mdAddMapping = mdAddMapping;

// Test a single gift's mapped action without needing a live TikTok event.
// Useful to verify a key actually reaches the foreground app (e.g. open
// Notepad, set the gift to "h", click test → see "h" appear).
async function testGiftAction(giftName) {
    const action = currentModConfig?.giftActions?.[giftName];
    if (!action || !action.value) { showToast?.('Bu hediyeye atanmış aksiyon yok', true); return; }
    try {
        const res = await window.api.executeAction(action);
        if (res?.success) showToast?.(`🎮 Test: "${giftName}" → ${action.type}:${action.value}`);
        else showToast?.(`❌ Test başarısız: ${res?.error || 'bilinmeyen'}`, true);
    } catch (e) {
        showToast?.('Test hatası: ' + e.message, true);
    }
}

function startShortcutCapture(input, giftName) {
    const type = input.parentElement.querySelector('.md-action-type').value;

    if (type === 'text') {
        input.readOnly = false;
        input.focus();
        input.onblur = async () => {
            input.readOnly = true;
            const value = input.value.trim();
            if (value) await saveGiftAction(giftName, { type: 'text', value });
            else await saveGiftAction(giftName, null);
        };
        return;
    }

    input.classList.add('capturing');
    input.value = '...';

    const finish = (value) => {
        input.classList.remove('capturing');
        input.blur();
        if (value) {
            input.value = value;
            saveGiftAction(giftName, { type, value });
        } else {
            input.value = '';
            saveGiftAction(giftName, null);
        }
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('mousedown', onMouse, true);
        document.removeEventListener('click', offClick, true);
    };

    const onKey = (e) => {
        if (type !== 'keyboard') return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { finish(null); return; }
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Cmd');
        const key = e.key;
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            parts.push(key.length === 1 ? key.toUpperCase() : key);
            finish(parts.join('+'));
        }
    };

    const onMouse = (e) => {
        if (type !== 'mouse') return;
        if (e.target === input) return; // ignore click on the input itself
        e.preventDefault();
        e.stopPropagation();
        const btn = e.button === 0 ? 'LeftClick' : e.button === 2 ? 'RightClick' : e.button === 1 ? 'MiddleClick' : `Mouse${e.button}`;
        finish(btn);
    };

    const offClick = (e) => {
        // click elsewhere → cancel
        if (!input.contains(e.target)) finish(null);
    };

    window.addEventListener('keydown', onKey, true);
    if (type === 'mouse') setTimeout(() => window.addEventListener('mousedown', onMouse, true), 50);
    setTimeout(() => document.addEventListener('click', offClick, true), 200);
}

async function updateGiftActionType(giftName, newType) {
    // Clear existing value when type changes
    const prev = currentModConfig.giftActions?.[giftName];
    const next = prev ? { ...prev, type: newType, value: '' } : { type: newType, value: '' };
    currentModConfig.giftActions = currentModConfig.giftActions || {};
    currentModConfig.giftActions[giftName] = next;
    renderModGiftActions();
}

async function saveGiftAction(giftName, action) {
    if (!currentModDetail) return;
    try {
        const result = await window.api.setModGiftAction(currentModDetail._id, giftName, action);
        if (result.success) {
            currentModConfig.giftActions = result.data.giftActions || {};
            renderModGiftActions();
        } else {
            showToast('Kaydedilemedi: ' + result.error, true);
        }
    } catch (e) {
        showToast('Bağlantı hatası', true);
    }
}

async function clearGiftAction(giftName) {
    await saveGiftAction(giftName, null);
}

async function clearAllGiftActions() {
    if (!currentModDetail) return;
    const count = Object.keys(currentModConfig.giftActions || {}).length;
    if (!count) { showToast('Temizlenecek aksiyon yok'); return; }
    if (!confirm(`${count} aksiyon kalıcı olarak silinecek. Emin misin?`)) return;
    try {
        const result = await window.api.saveModConfig(currentModDetail._id, { giftActions: {} });
        if (result.success) {
            currentModConfig.giftActions = {};
            renderModGiftActions();
            showToast(`${count} aksiyon temizlendi`);
        }
    } catch (e) { showToast('Temizleme hatası', true); }
}

async function saveAllGiftActions() {
    if (!currentModDetail) return;
    try {
        const result = await window.api.saveModConfig(currentModDetail._id, { giftActions: currentModConfig.giftActions || {} });
        if (result.success) showToast('Tüm eşlemeler kaydedildi ✓');
    } catch (e) { showToast('Kayıt hatası', true); }
}

// Minecraft / server-integration mods aren't downloadable files — they're joined
// in-game. Detect by gameTitle or a minecraft:// downloadUrl so we never try to
// download them (that produced "Unsupported protocol minecraft:").
function isIntegrationMod(mod) {
    if (!mod) return false;
    const dl = (mod.downloadUrl || '').toLowerCase();
    return /minecraft/i.test(mod.gameTitle || '') || dl.startsWith('minecraft:') || mod.modType === 'integration';
}

function showMinecraftConnectInfo(mod) {
    const addr = (mod.downloadUrl || '').replace(/^minecraft:\/\//i, '').trim() || '187.124.29.94';
    try { window.api.openExternal && navigator.clipboard?.writeText(addr); } catch {}
    showToast('Sunucu adresi panoya kopyalandı: ' + addr);
    alert(`🎮 ${mod.title}\n\nBu bir Minecraft entegrasyonudur — indirme gerekmez.\n\n1) Minecraft → Çok Oyunculu → Sunucu Ekle\n2) Adres: ${addr}   (panoya kopyalandı)\n3) Bağlan (ViaVersion ile her sürüm)\n4) Aksiyonlar & Olaylar'dan hediyeleri 🟩 Minecraft komutlarına bağla\n\nDetay: Kullanım Kılavuzu Bölüm 7.`);
}

async function installModAction() {
    if (!currentModDetail) return;
    // Integration mods (Minecraft) → show connect instructions, never download.
    if (isIntegrationMod(currentModDetail)) { showMinecraftConnectInfo(currentModDetail); return; }
    const dirRes = await window.api.pickInstallDirectory(currentModDetail.title);
    if (!dirRes.success) return;

    showInstallProgress(currentModDetail);
    const installRes = await window.api.installMod(currentModDetail._id, dirRes.data.installPath);

    if (installRes.success) {
        currentModConfig = installRes.data.config;
        currentModDetail.downloadCount = (currentModDetail.downloadCount || 0) + 1;
        installedModIdSet.add(currentModDetail._id);
        renderModDetailHero();

        const meta = installRes.meta || {};
        if (meta.archiveDownloaded) {
            const sizeStr = meta.archiveBytes ? ` (${humanBytes(meta.archiveBytes)})` : '';
            updateInstallProgress({ phase: 'done', percentage: 100, message: `✓ Kuruldu${sizeStr}` });
            setTimeout(closeInstallProgress, 1800);
            showToast(`"${currentModDetail.title}" kuruldu → ${dirRes.data.installPath}`);
        } else {
            updateInstallProgress({
                phase: 'warn',
                percentage: 100,
                message: `⚠️ Mod metadata kuruldu ama dosya inmedi: ${meta.archiveError || 'bilinmeyen hata'}`,
            });
            setTimeout(closeInstallProgress, 3500);
        }
    } else {
        updateInstallProgress({ phase: 'error', percentage: 0, message: '✗ ' + installRes.error });
        setTimeout(closeInstallProgress, 3000);
    }
}

// ─── Install progress modal ─────────────────────────────────────────

let _installProgressEl = null;

function showInstallProgress(mod) {
    closeInstallProgress();
    const el = document.createElement('div');
    el.id = 'install-progress-modal';
    // Non-blocking bottom-right widget — the download runs in the background and the
    // user can keep navigating the app (this used to be a full-screen blocking modal,
    // so testers couldn't leave the page or browse while a mod downloaded).
    el.style.cssText = `
        position:fixed;right:18px;bottom:18px;z-index:10000;width:340px;max-width:calc(100vw - 36px);
        animation:ipSlideIn 0.25s ease;
    `;
    el.innerHTML = `
        <div style="background:#160a2e;border:1px solid rgba(255, 46, 184,0.3);border-radius:14px;padding:1rem 1.1rem;box-shadow:0 14px 44px rgba(0,0,0,0.5),0 0 28px rgba(255, 46, 184,0.12);">
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.7rem;">
                <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#ff2eb8,#a855f7);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-download" style="color:#07030f;font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0;flex:1;">
                    <div style="color:#fff;font-weight:700;font-size:0.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mod.title)}</div>
                    <div id="ip-phase" style="color:#9d8bbf;font-size:0.64rem;text-transform:uppercase;letter-spacing:1px;margin-top:0.1rem;">Hazırlanıyor...</div>
                </div>
                <div id="ip-pct" style="color:#ff2eb8;font-weight:800;font-size:1.05rem;font-variant-numeric:tabular-nums;">0%</div>
            </div>
            <div style="height:7px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;margin-bottom:0.4rem;">
                <div id="ip-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#ff2eb8,#a855f7);box-shadow:0 0 12px #ff2eb888;transition:width 0.2s ease;"></div>
            </div>
            <div id="ip-meta" style="color:#9d8bbf;font-size:0.66rem;font-variant-numeric:tabular-nums;text-align:right;">—</div>
            <div id="ip-msg" style="display:none;margin-top:0.6rem;padding:0.5rem 0.65rem;border-radius:8px;font-size:0.74rem;"></div>
            <div style="color:#6b5a8a;font-size:0.6rem;margin-top:0.5rem;text-align:center;">İndirme arka planda sürüyor — uygulamayı kullanmaya devam edebilirsin.</div>
        </div>
    `;
    document.body.appendChild(el);
    _installProgressEl = el;
}

function updateInstallProgress(p) {
    if (!_installProgressEl) return;
    const phaseLabels = {
        metadata: 'Metadata alınıyor',
        token: 'İndirme yetkisi alınıyor',
        download: 'Dosya indiriliyor',
        extract: 'ZIP açılıyor',
        config: 'Yapılandırma yazılıyor',
        finalize: 'Kayıt tamamlanıyor',
        done: 'Tamamlandı',
        warn: 'Uyarı',
        error: 'Hata',
    };
    const phaseEl = document.getElementById('ip-phase');
    const pctEl = document.getElementById('ip-pct');
    const barEl = document.getElementById('ip-bar');
    const metaEl = document.getElementById('ip-meta');
    const msgEl = document.getElementById('ip-msg');

    if (phaseEl && p.phase) phaseEl.textContent = phaseLabels[p.phase] || p.phase;
    if (typeof p.percentage === 'number') {
        if (pctEl) pctEl.textContent = `${p.percentage}%`;
        if (barEl) barEl.style.width = `${p.percentage}%`;
    }
    if (metaEl) {
        if (p.totalBytes) {
            const dl = humanBytes(p.downloadedBytes || 0);
            const tot = humanBytes(p.totalBytes);
            metaEl.textContent = `${dl} / ${tot}`;
        } else if (p.phase === 'done') {
            metaEl.textContent = '';
        }
    }
    if (msgEl && p.message) {
        msgEl.style.display = 'block';
        const colors = p.phase === 'error'
            ? 'background:rgba(255, 46, 184,0.1);color:#ff6b9d;border:1px solid rgba(255, 46, 184,0.3);'
            : p.phase === 'warn'
                ? 'background:rgba(255,165,0,0.1);color:#ffa500;border:1px solid rgba(255,165,0,0.3);'
                : 'background:rgba(255, 46, 184,0.1);color:#ff2eb8;border:1px solid rgba(255, 46, 184,0.3);';
        msgEl.style.cssText += colors;
        msgEl.textContent = p.message;
    }
}

function closeInstallProgress() {
    if (_installProgressEl) {
        _installProgressEl.remove();
        _installProgressEl = null;
    }
}

function humanBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Wire up the IPC progress event once on app load
if (typeof window !== 'undefined' && window.api?.onInstallProgress) {
    window.api.onInstallProgress((data) => {
        if (_installProgressEl) updateInstallProgress(data);
    });
}

async function uninstallModAction() {
    if (!currentModDetail) return;
    if (!confirm(`"${currentModDetail.title}" kaldırılacak (ayarların korunur). Emin misin?`)) return;
    const result = await window.api.uninstallMod(currentModDetail._id);
    if (result.success) {
        currentModConfig.installed = false;
        installedModIdSet.delete(currentModDetail._id);
        renderModDetailHero();
        showToast('Mod kaldırıldı');
    }
}

function exportModActions() {
    if (!currentModDetail || !currentModConfig) return;
    const config = {
        mod: { id: currentModDetail._id, title: currentModDetail.title, gameTitle: currentModDetail.gameTitle, version: currentModDetail.version },
        exportedAt: new Date().toISOString(),
        giftActions: currentModConfig.giftActions || {},
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentModDetail.title.replace(/\s+/g, '_')}_config.json`;
    a.click();
    showToast('Config export edildi');
}

// Open Mod Modal
function openModModal(mod) {
    currentMod = mod;
    modSettings = {};

    document.getElementById('modal-mod-title').textContent = mod.title;
    document.getElementById('modal-mod-description').textContent = mod.description;

    const giftMapping = document.getElementById('gift-mapping');
    giftMapping.innerHTML = '';

    // Default gifts - can be extended based on mod
    const gifts = [
        { id: 'rose', name: 'Gül', icon: '🌹', coins: '1 coin' },
        { id: 'heart', name: 'Kalp', icon: '❤️', coins: '5 coin' },
        { id: 'finger_heart', name: 'Parmak Kalp', icon: '🫰', coins: '5 coin' },
        { id: 'diamond', name: 'Elmas', icon: '💎', coins: '100 coin' },
        { id: 'lion', name: 'Aslan', icon: '🦁', coins: '500 coin' }
    ];

    // Get available actions from mod
    let actions = [];

    // Try to parse features if available
    if (mod.features) {
        try {
            const features = typeof mod.features === 'string' ? JSON.parse(mod.features) : mod.features;
            if (features.events) {
                // Extract unique actions from features
                const actionsSet = new Set();
                Object.values(features.events).forEach(event => {
                    if (event.action) actionsSet.add(event.action);
                });
                actions = Array.from(actionsSet);
            }
        } catch (e) {
            console.error('Error parsing mod features:', e);
        }
    }

    // Fallback actions if none found
    if (actions.length === 0) {
        actions = [
            'Hiçbir Şey',
            'Aranma Seviyesini Temizle',
            'Ateş Mermileri (30sn)',
            'Patlayıcı Mermiler',
            'Rastgele Araç Spawn',
            'Süper Zıplama',
            'Yavaş Hareket',
            'Para Ver ($1000)',
            'Para Ver ($5000)',
            'Para Ver ($10000)'
        ];
    }

    gifts.forEach(gift => {
        const giftItem = document.createElement('div');
        giftItem.className = 'gift-item';

        giftItem.innerHTML = `
            <div class="gift-icon">${gift.icon}</div>
            <div class="gift-info">
                <div class="gift-name">${gift.name}</div>
                <div class="gift-coins">${gift.coins}</div>
            </div>
            <div>
                <label class="action-label">AKSİYON SEÇ</label>
                <select class="action-select" onchange="updateModSetting('${gift.id}', this.value)">
                    <option value="">Seçiniz...</option>
                    ${actions.map(action => `<option value="${action}">${action}</option>`).join('')}
                </select>
            </div>
        `;

        giftMapping.appendChild(giftItem);
        modSettings[gift.id] = actions[0] || '';
    });

    document.getElementById('mod-modal').classList.add('active');
}

// Close Mod Modal
function closeModModal() {
    document.getElementById('mod-modal').classList.remove('active');
    currentMod = null;
    modSettings = {};
}

// Update Mod Setting
function updateModSetting(giftId, action) {
    modSettings[giftId] = action;
}

// Install Mod
async function installMod() {
    if (!currentMod) return;

    // Check if all settings are configured
    const unconfigured = Object.entries(modSettings).filter(([key, value]) => !value || value === '');
    if (unconfigured.length > 0) {
        alert('⚠️ Lütfen tüm hediyeler için aksiyon seçin!');
        return;
    }

    try {
        // Generate config content
        const configContent = generateModConfig(currentMod, modSettings);

        // Request directory selection and save
        const result = await window.api.saveMod({
            modTitle: currentMod.title,
            modSettings: modSettings,
            configContent: configContent
        });

        if (result.success) {
            alert(`✅ ${currentMod.title} başarıyla yüklendi!\n\n📁 Kayıt Yeri: ${result.filePath}\n\n🎮 Ayarlar dosyası oyun dizininize kaydedildi. Artık TikTok canlı yayınınızda mod aktif olacak!`);
            closeModModal();

            // Refresh stats
            loadMods();
        } else {
            alert('❌ Mod yüklenemedi: ' + (result.error || 'Bilinmeyen hata'));
        }
    } catch (error) {
        console.error('Install error:', error);
        alert('❌ Mod yüklenirken hata oluştu: ' + error.message);
    }
}

// Generate Mod Configuration File Content
function generateModConfig(mod, settings) {
    const timestamp = new Date().toLocaleString('tr-TR');

    let config = `# ${mod.title} - Konfigürasyon Dosyası\n`;
    config += `# Oluşturulma: ${timestamp}\n`;
    config += `# Versiyon: ${mod.version}\n`;
    config += `# Oyun: ${mod.gameTitle || 'N/A'}\n`;
    config += `\n`;
    config += `[MOD_INFO]\n`;
    config += `Title=${mod.title}\n`;
    config += `GameTitle=${mod.gameTitle || ''}\n`;
    config += `Version=${mod.version}\n`;
    config += `\n`;
    config += `[TIKTOK_EVENTS]\n`;
    config += `# Her TikTok hediyesi için yapılacak aksiyon\n`;

    Object.entries(settings).forEach(([giftId, action]) => {
        config += `${giftId}=${action}\n`;
    });

    config += `\n`;
    config += `[AYARLAR]\n`;
    config += `Aktif=true\n`;
    config += `OtomatikBaslat=false\n`;
    config += `BildirimGoster=true\n`;
    config += `\n`;
    config += `# Bu dosya SeliGames tarafından otomatik oluşturulmuştur.\n`;
    config += `# Mod ayarlarınızı değiştirmek için SeliGames uygulamasını kullanın.\n`;

    return config;
}

// Load mods when mods page is opened - handled in navigateTo below

// Performance Monitor
function startPerformanceMonitor() {
    setInterval(() => {
        // Mock data for now - in a real app, use ipcRenderer to get system stats
        const cpu = Math.floor(Math.random() * 10) + 5; // 5-15%
        const ram = (Math.random() * 0.5 + 1.2).toFixed(1); // 1.2-1.7 GB
        const fps = Math.floor(Math.random() * 5) + 58; // 58-63 FPS

        const cpuElem = document.getElementById('perf-cpu');
        const ramElem = document.getElementById('perf-ram');
        const fpsElem = document.getElementById('perf-fps');

        if (cpuElem) {
            cpuElem.textContent = `${cpu}%`;
            cpuElem.style.color = cpu > 80 ? '#ef4444' : '#ff2eb8';
        }
        if (ramElem) ramElem.textContent = `${ram}GB`;
        if (fpsElem) {
            fpsElem.textContent = fps;
            fpsElem.style.color = fps < 30 ? '#ef4444' : '#ff2eb8';
        }
    }, 2000);
}

// TikTok Live Monitoring
let liveStats = {
    comments: 0,
    gifts: 0,
    likes: 0,
    members: 0,
    actions: 0,
    viewers: 0
};

// WebSocket connection (Eulerstream API)
let ws = null;
let eventFilter = 'all'; // all, gift, comment, member
let userTikTokUsername = ''; // Kullanıcının TikTok kullanıcı adı

// Update live stats in UI
function updateLiveStats() {
    // Guarded — these elements only exist on the TikTok Live page, but this
    // runs on every incoming event regardless of the active page.
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('total-comments', liveStats.comments);
    set('total-gifts', liveStats.gifts);
    set('total-likes', liveStats.likes);
    set('total-members', liveStats.members);
    set('live-viewers', liveStats.viewers);
}

// Load TikTok username from backend (auto-display only)
async function loadTikTokUsername() {
    try {
        const result = await window.api.getSettings();
        const usernameDisplay = document.getElementById('tiktok-username-text');
        
        if (result.success && result.data.tiktokUsername) {
            userTikTokUsername = result.data.tiktokUsername;
            if (usernameDisplay) {
                usernameDisplay.textContent = '@' + result.data.tiktokUsername;
                usernameDisplay.style.color = '#a855f7';
            }
            console.log('✅ TikTok username loaded from backend:', result.data.tiktokUsername);

            // Auto-connect if the setting is on and we're not already live.
            const autoConnect = result.data.settings?.tiktokAutoConnect === true;
            if (autoConnect && !ws) {
                console.log('⚡ Auto-connect enabled — connecting to TikTok Live');
                setTimeout(() => { if (!ws) startLiveStream(); }, 600);
            }
        } else {
            if (usernameDisplay) {
                usernameDisplay.textContent = 'Profil sayfasından TikTok kullanıcı adınızı ekleyin';
                usernameDisplay.style.color = '#ff2eb8';
            }
        }
    } catch (error) {
        console.error('Failed to load username:', error);
        const usernameDisplay = document.getElementById('tiktok-username-text');
        if (usernameDisplay) {
            usernameDisplay.textContent = 'Yüklenemedi';
            usernameDisplay.style.color = '#ff2eb8';
        }
    }
}

// ── Inline edit of the TikTok username, right on the Live page ──────────
// Previously the username was a read-only <span>; it could only be changed from
// the Profile page, which testers couldn't discover. Now it's editable here too.
function editTiktokUsername() {
    const span = document.getElementById('tiktok-username-text');
    const input = document.getElementById('tiktok-username-input');
    const editBtn = document.getElementById('tiktok-username-edit');
    const saveBtn = document.getElementById('tiktok-username-save');
    if (!input) return;
    input.value = (userTikTokUsername || '').replace(/^@+/, '');
    if (span) span.style.display = 'none';
    input.style.display = '';
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = '';
    input.focus();
    input.select();
    input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveTiktokUsername(); }
        else if (e.key === 'Escape') { cancelTiktokUsernameEdit(); }
    };
}

function cancelTiktokUsernameEdit() {
    const span = document.getElementById('tiktok-username-text');
    const input = document.getElementById('tiktok-username-input');
    const editBtn = document.getElementById('tiktok-username-edit');
    const saveBtn = document.getElementById('tiktok-username-save');
    if (input) input.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    if (span) span.style.display = '';
    if (editBtn) editBtn.style.display = '';
}

async function saveTiktokUsername() {
    const input = document.getElementById('tiktok-username-input');
    if (!input) return;
    const username = input.value.trim().replace(/^@+/, '');
    if (!username) { showToast('Kullanıcı adı boş olamaz', true); return; }
    try {
        const res = await window.api.updateTiktokUsername(username);
        if (res.success) {
            userTikTokUsername = username;
            const span = document.getElementById('tiktok-username-text');
            if (span) { span.textContent = '@' + username; span.style.color = '#a855f7'; }
            const profileInput = document.getElementById('profile-tiktok-edit');
            if (profileInput) profileInput.value = username;
            cancelTiktokUsernameEdit();
            showToast('TikTok kullanıcı adı güncellendi: @' + username);
        } else {
            showToast('Güncellenemedi: ' + (res.error || 'hata'), true);
        }
    } catch (e) {
        showToast('Bağlantı hatası', true);
    }
}
window.editTiktokUsername = editTiktokUsername;
window.saveTiktokUsername = saveTiktokUsername;
window.cancelTiktokUsernameEdit = cancelTiktokUsernameEdit;

async function startLiveStream() {
    if (!userTikTokUsername) {
        alert('⚠️ TikTok kullanıcı adınız bulunamadı!\n\nLütfen önce Profil sayfasından TikTok kullanıcı adınızı ekleyin.');
        navigateTo('profile');
        return;
    }

    try {
        const socketStatus = await window.api.getBackendSocketStatus();
        if (!socketStatus.connected) {
            await window.api.connectBackendSocket();
        }
        const sessionResult = await window.api.startLiveSession();
        if (sessionResult.success) {
            console.log('🎬 Live session started:', sessionResult.sessionId);
        }
    } catch (err) {
        console.warn('⚠️ Session start failed:', err);
    }

    // Primary path: the app's NATIVE TikTok connector (main process).
    // Events flow main → backend (rules/overlays/points) and main → renderer
    // (feed/stats below) — no third-party websocket needed.
    const username = userTikTokUsername.replace('@', '');
    const statusDot = document.getElementById('connection-status-dot');
    const statusText = document.getElementById('connection-status-text');
    if (statusDot && statusText) {
        statusDot.style.background = '#ffa500';
        statusDot.style.boxShadow = '0 0 10px #ffa500';
        statusText.textContent = 'Bağlanıyor...';
    }
    try {
        const r = await window.api.connectTikTokLive(username);
        if (!r?.success) throw new Error(r?.error || 'bağlanılamadı');
        if (statusDot && statusText) {
            statusDot.style.background = '#ff2eb8';
            statusDot.style.boxShadow = '0 0 10px #ff2eb8';
            statusText.textContent = 'Bağlı ✓';
        }
        const startBtn = document.getElementById('btn-start-live');
        const stopBtn = document.getElementById('btn-stop-live');
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = '';
        addEventToFeed({ type: 'system', user: 'Sistem', message: `@${username} canlı yayınına bağlandı`, icon: '✅', color: '#ff2eb8' });
    } catch (err) {
        if (statusDot && statusText) {
            statusDot.style.background = '#ef4444';
            statusDot.style.boxShadow = '0 0 10px #ef4444';
            statusText.textContent = 'Bağlanamadı';
        }
        addEventToFeed({ type: 'system', user: 'Sistem', message: `Bağlantı hatası: ${err.message} — kullanıcı canlı yayında mı?`, icon: '⚠️', color: '#ffd000' });
    }
}

// ── Native connector → UI bridge ───────────────────────────────────────
// main.js forwards events to the backend itself; here we only render the
// feed + live counters. Registered once at startup.
if (window.api?.onTikTokEvent) {
    window.api.onTikTokEvent((msg) => {
        const d = msg?.data || {};
        const who = d.nickname || d.user || '';
        switch (msg?.type) {
            case 'chat':
                liveStats.comments++;
                addEventToFeed({ type: 'comment', user: who, message: d.comment || '', icon: '💬', color: '#22d3ee', profilePhoto: d.profilePicture });
                break;
            case 'gift': {
                const n = d.repeatCount || 1;
                liveStats.gifts += n;
                addEventToFeed({ type: 'gift', user: who, message: `${d.giftName || 'Hediye'} ×${n}${d.diamondCount ? ` (💎${d.diamondCount * n})` : ''}`, icon: '🎁', color: '#ff2eb8' });
                break;
            }
            case 'like':
                liveStats.likes += d.likeCount || 1;
                break; // sayaç yeter — feed'i beğeni seliyle boğma
            case 'member':
                liveStats.members++;
                addEventToFeed({ type: 'member', user: who, message: 'yayına katıldı', icon: '👋', color: '#a855f7' });
                break;
            case 'follow':
                addEventToFeed({ type: 'follow', user: who, message: 'takip etti! ➕', icon: '➕', color: '#48f0c8' });
                break;
            case 'share':
                addEventToFeed({ type: 'share', user: who, message: 'yayını paylaştı 🔁', icon: '🔁', color: '#ffd000' });
                break;
            case 'roomUser':
                liveStats.viewers = d.viewerCount || liveStats.viewers;
                break;
        }
        updateLiveStats();
    });
}
if (window.api?.onTikTokDisconnected) {
    window.api.onTikTokDisconnected((info) => {
        const statusDot = document.getElementById('connection-status-dot');
        const statusText = document.getElementById('connection-status-text');
        if (statusDot && statusText) {
            statusDot.style.background = '#ef4444';
            statusDot.style.boxShadow = '0 0 10px #ef4444';
            statusText.textContent = 'Bağlantı Kesildi';
        }
        const startBtn = document.getElementById('btn-start-live');
        const stopBtn = document.getElementById('btn-stop-live');
        if (startBtn) startBtn.style.display = '';
        if (stopBtn) stopBtn.style.display = 'none';
        addEventToFeed({ type: 'system', user: 'Sistem', message: info?.reason || 'Yayın bağlantısı kesildi', icon: '🔌', color: '#ff2eb8' });
    });
}

// Message handlers for different event types
function handleChatMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Bilinmeyen';
    const comment = data?.comment || data?.message || data?.text || '';

    if (comment) {
        console.log(`  👤 ${user}: ${comment}`);
        liveStats.comments++;
        addEventToFeed({
            type: 'comment',
            user: user,
            message: comment,
            icon: '💬',
            color: '#ff2eb8'
        });
        updateLiveStats();
    }
}

function handleGiftMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Bilinmeyen';
    const giftName = data?.giftName || data?.name || 'Gift';
    const giftCount = data?.repeatCount || data?.count || 1;
    const diamonds = data?.diamondCount || data?.value || 0;

    console.log(`  🎁 ${user} sent ${giftName} x${giftCount} (${diamonds} 💎)`);

    liveStats.gifts++;
    liveStats.actions++;
    addEventToFeed({
        type: 'gift',
        user: user,
        message: `${giftName} ${giftCount > 1 ? 'x' + giftCount : ''} ${diamonds > 0 ? '(' + diamonds + ' 💎)' : ''}`,
        icon: '🎁',
        color: '#ff2eb8'
    });
    updateLiveStats();
}

function handleLikeMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Bilinmeyen';
    const likeCount = data?.likeCount || data?.count || 1;
    const totalLikes = data?.totalLikeCount || 0;

    console.log(`  ❤️ ${user} liked (${likeCount})`);

    liveStats.likes += likeCount;
    addEventToFeed({
        type: 'like',
        user: user,
        message: `Beğendi${totalLikes > 0 ? ' (Toplam: ' + totalLikes + ')' : ''}`,
        icon: '❤️',
        color: '#a855f7'
    });
    updateLiveStats();
}

function handleMemberMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Bilinmeyen';

    console.log(`  👋 ${user} joined`);
    liveStats.members++;

    addEventToFeed({
        type: 'member',
        user: user,
        message: 'Yayına katıldı',
        icon: '👋',
        color: '#a855f7'
    });
}

function handleSocialMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Bilinmeyen';
    const action = data?.action || 'followed';

    console.log(`  ➕ ${user} ${action}`);

    addEventToFeed({
        type: 'follow',
        user: user,
        message: 'Takip etti',
        icon: '➕',
        color: '#ffa500'
    });
}

function handleRoomStats(data) {
    const viewerCount = data?.viewerCount || data?.count || 0;

    if (viewerCount > 0) {
        console.log(`  📊 Viewers: ${viewerCount}`);
        const viewersEl = document.getElementById('live-viewers');
        if (viewersEl) {
            viewersEl.innerHTML = `<i class="fas fa-users"></i> ${viewerCount} izleyici`;
        }
    }
}


function connectToTikTokLive() {
    let username = userTikTokUsername;
    
    if (!username) {
        alert('⚠️ TikTok kullanıcı adı bulunamadı!');
        return;
    }

    // Clean username
    username = username.replace('@', '');

    // Update UI to connecting state
    const statusDot = document.getElementById('connection-status-dot');
    const statusText = document.getElementById('connection-status-text');

    if (statusDot && statusText) {
        statusDot.style.background = '#ffa500';
        statusDot.style.boxShadow = '0 0 10px #ffa500';
        statusText.textContent = 'Bağlanıyor...';
    }

    // Eulerstream API Configuration
    const apiKey = "MWUxZTAxY2NhNjUyNmJmYTBhOTI5MWZiMjdhMDUzNjliNDk4NjIyZDM2N2M0NDMyNDUzNDcx";
    const wsUrl = `wss://ws.eulerstream.com?uniqueId=${username}&apiKey=${apiKey}`;

    try {
        // Close existing connection if any
        if (ws) {
            ws.close();
        }

        console.log('🔄 Connecting to Eulerstream:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ WebSocket connected!');

            if (statusDot && statusText) {
                statusDot.style.background = '#ff2eb8';
                statusDot.style.boxShadow = '0 0 10px #ff2eb8';
                statusText.textContent = 'Bağlı ✓';
            }

            // Toggle Start ↔ Stop buttons
            const startBtn = document.getElementById('btn-start-live');
            const stopBtn = document.getElementById('btn-stop-live');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = '';

            addEventToFeed({
                type: 'system',
                user: 'Sistem',
                message: `@${username} canlı yayınına bağlandı`,
                icon: '✅',
                color: '#ff2eb8'
            });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Eulerstream sends messages array
                if (data.messages && Array.isArray(data.messages)) {
                    data.messages.forEach(msg => {
                        handleTikTokEvent(msg);
                    });
                } else {
                    console.warn('⚠️ Unexpected data format:', data);
                }
            } catch (error) {
                console.error('❌ Parse error:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);

            if (statusDot && statusText) {
                statusDot.style.background = '#ef4444';
                statusDot.style.boxShadow = '0 0 10px #ef4444';
                statusText.textContent = 'Bağlantı Hatası';
            }
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket closed');

            if (statusDot && statusText) {
                statusDot.style.background = '#ef4444';
                statusDot.style.boxShadow = '0 0 10px #ef4444';
                statusText.textContent = 'Bağlantı Kesildi';
            }
        };

    } catch (error) {
        console.error('❌ Connection error:', error);

        if (statusDot && statusText) {
            statusDot.style.background = '#ef4444';
            statusDot.style.boxShadow = '0 0 10px #ef4444';
            statusText.textContent = 'Hata';
        }

        alert('Bağlantı hatası: ' + error.message);
    }
}

function forwardToBackend(eventType, eventData) {
    const getUserInfo = (data) => {
        return data?.user?.nickname || data?.user?.uniqueId || data?.nickname || data?.uniqueId || data?.username || '';
    };

    const payload = { eventType, username: getUserInfo(eventData), nickname: getUserInfo(eventData), profilePicture: eventData?.user?.profilePicture?.url?.[0] || '' };

    if (eventType === 'chat' || eventType === 'comment') {
        payload.comment = eventData?.comment || eventData?.message || '';
        payload.text = payload.comment;
    } else if (eventType === 'gift') {
        payload.giftName = eventData?.gift?.name || eventData?.giftName || 'Hediye';
        payload.giftId = eventData?.gift?.id || eventData?.giftId || '';
        payload.count = eventData?.repeatCount || eventData?.count || 1;
        payload.diamondCount = (eventData?.gift?.diamond_count || 0) * (payload.count);
    } else if (eventType === 'like') {
        payload.likeCount = eventData?.count || eventData?.likeCount || 1;
        payload.count = payload.likeCount;
    } else if (eventType === 'viewer') {
        payload.viewerCount = eventData?.total || eventData?.viewerCount || 0;
        payload.count = 1;
    } else {
        payload.count = 1;
    }

    window.api.forwardTikTokEvent(payload).catch(err => {
        console.warn('⚠️ Event forward failed:', err);
    });
}

function handleTikTokEvent(msg) {
    const eventType = msg.type || msg.event || '';
    const eventData = msg.data || msg;

    const getUserInfo = (data) => {
        return data?.user?.nickname ||
            data?.user?.uniqueId ||
            data?.nickname ||
            data?.uniqueId ||
            data?.username ||
            '';
    };

    // CHAT MESSAGE
    if (eventType === 'WebcastChatMessage') {
        liveStats.comments++;
        const comment = eventData?.comment || eventData?.message || '';
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';

        addEventToFeed({
            type: 'comment',
            user: getUserInfo(eventData),
            message: comment,
            icon: '💬',
            color: '#39ff14',
            profilePhoto: profilePhoto
        });

        forwardToBackend('comment', eventData);
    }
    // GIFT
    else if (eventType === 'WebcastGiftMessage') {
        liveStats.gifts++;
        liveStats.actions++;

        // ── Debug: dump raw payload once per session so we can lock down
        //    the right field paths for this Eulerstream protocol version.
        //    `window.DEBUG_GIFT = true` (set in DevTools) to log every gift.
        if (window.DEBUG_GIFT || !window._giftSampleLogged) {
            try { console.log('[GIFT PAYLOAD]', JSON.stringify(eventData, null, 2)); } catch {}
            window._giftSampleLogged = true;
        }

        // Recursive scan: walk the payload and return the first plausible
        // gift name / icon URL we find at any depth. Eulerstream's frames
        // shuffle naming across versions (gift, gift_details, giftDetails,
        // describe, content, etc.) — a fixed cascade keeps missing one.
        function scanGift(obj, depth = 0) {
            if (!obj || typeof obj !== 'object' || depth > 5) return { name: '', icon: '' };
            const out = { name: '', icon: '' };
            const nameKeys = ['giftName', 'name', 'gift_name', 'displayName', 'display_name', 'describe', 'gift_describe'];
            const iconKeys = ['giftPictureUrl', 'icon', 'iconUrl', 'icon_url', 'image_url'];
            for (const k of nameKeys) {
                const v = obj[k];
                if (typeof v === 'string' && v.length > 0 && v.length < 80 && !/^https?:/i.test(v)) {
                    out.name = v; break;
                }
            }
            for (const k of iconKeys) {
                const v = obj[k];
                if (typeof v === 'string' && /^https?:\/\//i.test(v)) { out.icon = v; break; }
                if (v && typeof v === 'object') {
                    const urlList = v.url_list || v.urlList;
                    if (Array.isArray(urlList) && urlList[0]) { out.icon = urlList[0]; break; }
                    if (typeof v.uri === 'string' && /^https?:/i.test(v.uri)) { out.icon = v.uri; break; }
                }
            }
            if (out.name && out.icon) return out;
            // Recurse into nested objects/arrays
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (v && typeof v === 'object') {
                    const child = scanGift(v, depth + 1);
                    if (!out.name && child.name) out.name = child.name;
                    if (!out.icon && child.icon) out.icon = child.icon;
                    if (out.name && out.icon) break;
                }
            }
            return out;
        }

        const giftId = eventData?.giftId
            ?? eventData?.gift?.id
            ?? eventData?.gift?.gift_id
            ?? eventData?.gift_details?.gift_id
            ?? eventData?.gift_details?.giftId
            ?? null;
        const scanned = scanGift(eventData);
        let giftName = scanned.name;
        let giftIcon = scanned.icon;

        // Hardcoded ID → canonical Turkish name table (highest priority for
        // stripped payloads that have only giftId). User maps their action
        // against this name, so resolution MUST land on it.
        if ((!giftName || /^Hediye/i.test(giftName)) && giftId != null) {
            const known = resolveGiftNameFromId(giftId);
            if (known) giftName = known;
        }

        // Catalog fallback. Match by ID first, then by name (in case
        // payload has the name as-is but we want the canonical icon).
        if (Array.isArray(giftCatalogCache) && giftCatalogCache.length) {
            let hit = null;
            if (giftId != null) {
                hit = giftCatalogCache.find((g) =>
                    String(g.id ?? '') === String(giftId)
                    || String(g.giftId ?? '') === String(giftId)
                );
            }
            if (!hit && giftName) {
                const lower = giftName.trim().toLocaleLowerCase('tr-TR');
                hit = giftCatalogCache.find((g) => String(g.name || '').toLocaleLowerCase('tr-TR') === lower);
            }
            if (hit) {
                giftName = giftName || hit.name || '';
                giftIcon = giftIcon || hit.icon || hit.iconUrl || '';
            }
        }
        if (!giftName) giftName = giftId ? `Hediye #${giftId}` : 'Hediye';

        const giftCount = eventData?.repeatCount || eventData?.count || 1;
        const diamonds = (eventData?.gift?.diamond_count
            || eventData?.gift?.diamondCount
            || eventData?.gift_details?.diamond_count
            || 0) * giftCount;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';

        playGiftSound(giftName, diamonds);

        addEventToFeed({
            type: 'gift',
            user: getUserInfo(eventData),
            message: `${giftName} x${giftCount}${diamonds > 0 ? ' (💎 ' + diamonds + ')' : ''}`,
            icon: giftIcon ? '🎁' : '🎁',  // keep the emoji fallback for the badge
            iconUrl: giftIcon,                // event-feed reads this when present
            color: '#ff2eb8',
            profilePhoto: profilePhoto
        });

        // Enrich the payload before forwarding so backend overlays + ticker
        // resolve the same name we resolved here.
        const enrichedPayload = { ...eventData, giftName, giftId };
        if (!enrichedPayload.gift) enrichedPayload.gift = {};
        if (!enrichedPayload.gift.name) enrichedPayload.gift.name = giftName;
        if (!enrichedPayload.gift.id && giftId != null) enrichedPayload.gift.id = giftId;
        forwardToBackend('gift', enrichedPayload);

        // Fire mapped game shortcut — repeatCount honored (10 gül → 10 keystroke)
        dispatchModActions(giftName, giftCount, giftId);
    }
    // LIKE
    else if (eventType === 'WebcastLikeMessage') {
        liveStats.likes++;
        const likeCount = eventData?.count || 1;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';

        addEventToFeed({
            type: 'like',
            user: getUserInfo(eventData),
            message: `${likeCount} kalp`,
            icon: '❤️',
            color: '#ff2eb8',
            profilePhoto: profilePhoto
        });

        forwardToBackend('like', eventData);
    }
    // MEMBER JOIN
    else if (eventType === 'WebcastMemberMessage') {
        liveStats.members++;
        const memberCount = eventData?.memberCount || 0;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';
        addEventToFeed({
            type: 'member',
            user: getUserInfo(eventData),
            message: `katıldı (${memberCount} izleyici)`,
            icon: '👋',
            color: '#a855f7',
            profilePhoto: profilePhoto
        });

        forwardToBackend('member', eventData);
    }
    // FOLLOW/SHARE (WebcastSocialMessage)
    else if (eventType === 'WebcastSocialMessage') {
        const action = eventData?.action;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';
        liveStats.actions++;
        
        if (action === 1 || action === '1') {
            addEventToFeed({
                type: 'follow',
                user: getUserInfo(eventData),
                message: 'takip etti!',
                icon: '⭐',
                color: '#ffa500',
                profilePhoto: profilePhoto
            });
            forwardToBackend('follow', eventData);
        } else if (action === 2 || action === '2') {
            addEventToFeed({
                type: 'share',
                user: getUserInfo(eventData),
                message: 'paylaştı!',
                icon: '📤',
                color: '#a855f7',
                profilePhoto: profilePhoto
            });
            forwardToBackend('share', eventData);
        }
    }
    // VIEWER COUNT
    else if (eventType === 'WebcastRoomUserSeqMessage') {
        const viewerCount = eventData?.total || 0;
        liveStats.viewers = viewerCount;
        forwardToBackend('viewer', eventData);
    }
    // Connection/Stream status
    else if (eventType === 'connected' || eventType === 'live' || eventType === 'streamstatus') {
        console.log('✅ Stream status update:', eventData);
        addEventToFeed({
            type: 'system',
            user: 'Sistem',
            message: 'Yayın durumu güncellendi',
            icon: '📡',
            color: '#ff2eb8'
        });
    }
    // Unknown / internal protocol messages — log to console only, don't pollute the feed.
    // (TikTok'un internal protokolünde WebcastCaptionMessage, WebcastLinkMicFanTicketMethod,
    //  WebcastEnvelopeMessage gibi kullanıcı için anlamsız onlarca mesaj türü var.)
    else {
        if (window.DEBUG_TIKTOK_EVENTS) {
            console.warn('⚠️ Unknown event type:', eventType, eventData);
        }
        // intentionally not added to feed
    }

    updateLiveStats();
}

function disconnectTikTokLive() {
    // Native connector (primary path)
    window.api.disconnectTikTokLive?.().catch(() => {});
    // Legacy Eulerstream WS (if it was ever opened)
    if (ws) {
        ws.close();
        ws = null;
        console.log('✅ Disconnected from TikTok Live');
    }

    const statusDot = document.getElementById('connection-status-dot');
    const statusText = document.getElementById('connection-status-text');

    if (statusDot && statusText) {
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = '0 0 10px #ef4444';
        statusText.textContent = 'Bağlı Değil';
    }

    // Toggle Stop → Start buttons
    const startBtn = document.getElementById('btn-start-live');
    const stopBtn = document.getElementById('btn-stop-live');
    if (startBtn) startBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';

    // Reset stats
    liveStats = { comments: 0, gifts: 0, likes: 0, members: 0, actions: 0, viewers: 0 };
    updateLiveStats();

    addEventToFeed({
        type: 'system',
        user: 'Sistem',
        message: 'Bağlantı kapatıldı',
        icon: '🔌',
        color: '#ff2eb8'
    });
}


function addEventToFeed(event) {
    const feed = document.getElementById('event-feed');
    if (!feed) return;

    // Filter check
    if (eventFilter !== 'all' && event.type !== eventFilter) {
        return;
    }

    // Suppress noisy/empty rows (e.g. raw protocol passes that have no user/message)
    const isSystem = event.type === 'system';
    if (!isSystem) {
        const userText = (event.user || '').trim();
        const msgText = (event.message || '').trim();
        if (!userText && !msgText) return;
        // Drop rows that look like a TikTok-internal protobuf method name leaking through
        if (/^Webcast[A-Z][A-Za-z]+(Message|Method)/.test(msgText)) return;
        // Hide rows with no identifiable user
        if (!userText || userText === 'Unknown User') return;
    }

    // Remove placeholder if exists (covers both the CSS-class placeholder
    // from index.html and the inline-styled one written by clearEventFeed)
    const placeholder = feed.querySelector('.event-placeholder, [style*="padding: 4rem"]');
    if (placeholder) placeholder.remove();

    const eventEl = document.createElement('div');
    eventEl.classList.add('event-item');
    eventEl.dataset.type = event.type;
    eventEl.style.cssText = `
        background: rgba(255, 255, 255, 0.02);
        border-left: 3px solid ${event.color};
        padding: 0.75rem;
        border-radius: 10px;
        animation: slideIn 0.3s ease;
        transition: all 0.3s ease;
    `;

    // Profile photo URL (if available)
    const profilePhoto = event.profilePhoto || 'https://via.placeholder.com/40';

    eventEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${profilePhoto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${event.color};" onerror="this.src='https://via.placeholder.com/40'">
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.9rem; color: ${event.color};">${event.user}</div>
                <div style="color: #d0d0d0; font-size: 0.85rem; margin-top: 0.2rem;">${event.message}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
                ${event.iconUrl
                    ? `<img src="${event.iconUrl}" style="width:28px;height:28px;object-fit:contain;" onerror="this.outerHTML='<span style=\\'font-size:1.2rem\\'>${event.icon}</span>'">`
                    : `<span style="font-size: 1.2rem;">${event.icon}</span>`}
                <span style="font-size: 0.7rem; color: #9d8bbf;">${new Date().toLocaleTimeString('tr-TR')}</span>
            </div>
        </div>
    `;
    
    eventEl.addEventListener('mouseenter', () => {
        eventEl.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    eventEl.addEventListener('mouseleave', () => {
        eventEl.style.background = 'rgba(255, 255, 255, 0.02)';
    });
    
    feed.insertBefore(eventEl, feed.firstChild);
    
    // Keep only last 100 events
    while (feed.children.length > 100) {
        feed.removeChild(feed.lastChild);
    }
}


function clearEventFeed() {
    const feed = document.getElementById('event-feed');
    if (feed) {
        feed.innerHTML = `
            <div style="text-align: center; color: #9d8bbf; padding: 4rem 2rem;">
                <i class="fas fa-satellite-dish" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
                <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">Canlı Event Bekleniyor...</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">TikTok Live'a bağlandığınızda event'ler burada görünecek</p>
            </div>
        `;
    }
}

// Event Filter System
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.event-filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            eventFilter = filter;
            
            // Update button styles
            filterButtons.forEach(b => {
                if (b.dataset.filter === filter) {
                    b.style.borderColor = '#ff2eb8';
                    b.style.background = 'rgba(255, 46, 184,0.2)';
                    b.style.color = '#ff2eb8';
                    b.classList.add('active');
                } else {
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                    b.style.background = 'rgba(255,255,255,0.05)';
                    b.style.color = '#9d8bbf';
                    b.classList.remove('active');
                }
            });
            
            // Filter existing events
            const feed = document.getElementById('event-feed');
            const events = feed.querySelectorAll('.event-item');
            
            events.forEach(eventEl => {
                if (filter === 'all' || eventEl.dataset.type === filter) {
                    eventEl.style.display = 'block';
                } else {
                    eventEl.style.display = 'none';
                }
            });
        });
    });
});

// Add slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

// ==================== GIFT SOUND SYSTEM ====================

// Sound configuration for different gift tiers
const giftSoundConfig = {
    small: 'bell',    // 1-10 coins
    medium: 'chime',  // 10-100 coins
    large: 'fanfare', // 100-1000 coins
    epic: 'victory'   // 1000+ coins
};

// Load saved sound preferences from backend
async function loadSoundPreferences() {
    try {
        const result = await window.api.getSettings();
        if (result.success && result.data.settings) {
            if (result.data.settings.giftSounds) {
                Object.assign(giftSoundConfig, result.data.settings.giftSounds);

                // Update UI for all categories
                Object.entries(giftSoundConfig).forEach(([category, sound]) => {
                    document.querySelectorAll(`.sound-option[data-category="${category}"]`).forEach(option => {
                        option.classList.remove('active');
                    });
                    document.querySelector(`.sound-option[data-category="${category}"][data-sound="${sound}"]`)?.classList.add('active');
                });
            }
            // Pre-cache per-gift sound map so playGiftSound() can hit it immediately on events,
            // without having to open Settings page first.
            if (result.data.settings.giftSoundMap) {
                giftSoundMapCache = result.data.settings.giftSoundMap;
                console.log('✅ Gift sound map loaded:', Object.keys(giftSoundMapCache).length, 'mappings');
            }
            console.log('✅ Sound preferences loaded from backend:', giftSoundConfig);
        }
    } catch (error) {
        console.error('Failed to load sound preferences:', error);
    }
    // Pre-load gift catalog in background so Settings page renders fast when opened
    loadGiftCatalog().catch(() => {});
}

// Save sound preferences to backend
async function saveSoundPreferences(category, sound) {
    try {
        const result = await window.api.updateGiftSound({ category, sound });
        if (result.success) {
            console.log('✅ Sound preference saved to backend:', category, sound);
        }
    } catch (error) {
        console.error('Failed to save sound preference:', error);
    }
}

// Load preferences on startup
loadSoundPreferences();

// Sound selection handler
async function selectSound(category, soundName) {
    giftSoundConfig[category] = soundName;
    
    // Save to backend
    await saveSoundPreferences(category, soundName);
    
    // Update UI
    document.querySelectorAll(`.sound-option[data-category="${category}"]`).forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.sound-option[data-category="${category}"][data-sound="${soundName}"]`)?.classList.add('active');
    
    // Play preview
    playSound(soundName);
}

// Enhanced sound library with Web Audio API for better quality
const soundLibrary = {
    // Small gift sounds
    bell: { frequency: 800, duration: 0.15, type: 'sine', volume: 0.3 },
    pop: { frequency: 400, duration: 0.1, type: 'sine', volume: 0.25 },
    coin: { frequency: 600, duration: 0.2, type: 'triangle', volume: 0.3 },
    
    // Medium gift sounds
    chime: { frequencies: [523, 659, 784], duration: 0.4, type: 'sine', volume: 0.35 },
    ding: { frequency: 1000, duration: 0.3, type: 'sine', volume: 0.35 },
    sparkle: { frequencies: [800, 1000, 1200], duration: 0.5, type: 'sine', volume: 0.3 },
    
    // Large gift sounds
    fanfare: { frequencies: [440, 554, 659, 880], duration: 0.8, type: 'triangle', volume: 0.4 },
    tada: { frequencies: [523, 659, 784, 1047], duration: 1, type: 'sine', volume: 0.4 },
    wow: { frequencies: [400, 600, 800, 1000], duration: 0.6, type: 'sawtooth', volume: 0.35 },
    
    // Epic gift sounds
    victory: { frequencies: [523, 587, 659, 784, 880, 1047], duration: 1.5, type: 'sine', volume: 0.45 },
    legendary: { frequencies: [440, 554, 659, 880, 1047, 1319], duration: 1.8, type: 'triangle', volume: 0.45 },
    epic: { frequencies: [392, 494, 587, 784, 988, 1175], duration: 2, type: 'sine', volume: 0.5 },

    // ── Extra synth sounds (library expansion) ──
    boop: { frequency: 520, duration: 0.12, type: 'sine', volume: 0.28 },
    blip: { frequency: 950, duration: 0.08, type: 'square', volume: 0.25 },
    bubble: { frequencies: [600, 900, 1300], duration: 0.3, type: 'sine', volume: 0.28 },
    twinkle: { frequencies: [1318, 1568, 2093], duration: 0.6, type: 'sine', volume: 0.3 },
    glassbell: { frequencies: [1760, 2349], duration: 0.7, type: 'sine', volume: 0.3 },
    arcade: { frequencies: [880, 1108, 1318], duration: 0.4, type: 'square', volume: 0.3 },
    retro: { frequencies: [440, 660, 880, 660], duration: 0.55, type: 'square', volume: 0.3 },
    powerup: { frequencies: [330, 440, 554, 660, 880], duration: 0.6, type: 'square', volume: 0.32 },
    levelup: { frequencies: [392, 523, 659, 784, 1047], duration: 0.8, type: 'square', volume: 0.35 },
    laser: { frequencies: [1400, 700, 300], duration: 0.3, type: 'sawtooth', volume: 0.3 },
    zap: { frequencies: [1600, 400], duration: 0.18, type: 'sawtooth', volume: 0.3 },
    whoosh: { frequencies: [200, 500, 900], duration: 0.45, type: 'sawtooth', volume: 0.28 },
    magic: { frequencies: [1047, 1319, 1568, 2093, 2637], duration: 0.7, type: 'sine', volume: 0.32 },
    bonus: { frequencies: [523, 784, 1047, 1319], duration: 0.7, type: 'triangle', volume: 0.38 },
    success: { frequencies: [659, 880, 1175], duration: 0.5, type: 'sine', volume: 0.35 },
    drumroll: { frequencies: [150, 150, 150, 150, 150, 150], duration: 0.8, type: 'triangle', volume: 0.3 },
    gong: { frequencies: [110, 165, 220], duration: 1.6, type: 'sine', volume: 0.4 },
    siren: { frequencies: [600, 900, 600, 900], duration: 1.0, type: 'sawtooth', volume: 0.3 },
    alarm: { frequencies: [880, 660, 880, 660], duration: 0.8, type: 'square', volume: 0.3 },
    heartbeat: { frequencies: [90, 70], duration: 0.5, type: 'sine', volume: 0.36 },
    jackpot: { frequencies: [523, 659, 784, 1047, 1319, 1568, 2093], duration: 1.6, type: 'sine', volume: 0.45 }
};

// Play sound using Web Audio API
// Global notification volume — multiplier in [0..1] applied on top of per-sound volume
function getNotifVolume() {
    try {
        const v = parseInt(localStorage.getItem('notifVolume'));
        if (!isNaN(v)) return Math.max(0, Math.min(1, v / 100));
    } catch {}
    return 0.8;
}
function setNotificationVolume(val) {
    const v = Math.max(0, Math.min(100, parseInt(val) || 0));
    try { localStorage.setItem('notifVolume', String(v)); } catch {}
    const label = document.getElementById('notif-volume-label');
    if (label) label.textContent = v + '%';
}
function testNotificationVolume() {
    playSound('coin');
}
// Restore saved slider value on page load
document.addEventListener('DOMContentLoaded', () => {
    try {
        const v = localStorage.getItem('notifVolume');
        if (v !== null) {
            const slider = document.getElementById('notif-volume');
            if (slider) { slider.value = v; setNotificationVolume(v); }
        }
    } catch {}
});

function playSound(soundName) {
    // Check if sounds are enabled
    const soundsEnabled = document.getElementById('gift-sounds-toggle')?.checked !== false;
    if (!soundsEnabled) return;
    const globalVol = getNotifVolume();
    if (globalVol === 0) return;
    
    const sound = soundLibrary[soundName];
    if (!sound) {
        console.warn('Sound not found:', soundName);
        return;
    }
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (sound.frequencies) {
            // Multi-tone sound (chord/sequence)
            sound.frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.type = sound.type || 'sine';
                oscillator.frequency.value = freq;
                
                const startTime = audioContext.currentTime + (index * 0.1);
                const endTime = startTime + (sound.duration / sound.frequencies.length);
                
                gainNode.gain.setValueAtTime(sound.volume * globalVol, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
                
                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        } else {
            // Single tone sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = sound.type || 'sine';
            oscillator.frequency.value = sound.frequency;
            
            gainNode.gain.setValueAtTime(sound.volume * globalVol, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + sound.duration);
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// Determine gift tier based on coin value
function getGiftTier(coins) {
    if (coins >= 1000) return 'epic';
    if (coins >= 100) return 'large';
    if (coins >= 10) return 'medium';
    return 'small';
}

// Play gift notification sound
function playGiftSound(giftName, coins) {
    // 1. Per-gift mapping wins (user-configured in Settings → Gift Sound Map)
    const entry = giftName && giftSoundMapCache ? giftSoundMapCache[giftName] : null;
    if (entry) {
        if (entry.mp3) {
            try {
                const audio = new Audio(entry.mp3);
                audio.volume = Math.max(0, Math.min(1, (entry.volume ?? 1) * getNotifVolume()));
                audio.play().catch(() => {});
            } catch {}
            console.log(`🔊 Custom MP3 for "${giftName}"`);
            return;
        }
        if (entry.preset) {
            console.log(`🔊 Custom preset "${entry.preset}" for "${giftName}"`);
            playSound(entry.preset);
            return;
        }
    }
    // 2. Fallback: tier-based sound (small/medium/large/epic → giftSoundConfig)
    const tier = getGiftTier(coins);
    const soundName = giftSoundConfig[tier];
    console.log(`🔊 Tier ${tier} sound: ${soundName} for "${giftName}" (${coins} coins)`);
    playSound(soundName);
}

// ==================== END SOUND SYSTEM ====================

// ==================== OVERLAY SYSTEM ====================

// These are overwritten with values from main.js config (see initAppConfig below).
// Kept as `let` so the runtime override sticks.
let BACKEND_URL = 'http://localhost:3000';
let WEB_URL = 'https://seligame.com';

// Load runtime config from main.js (config.json / config.default.json) before
// any URL-dependent code runs. Resolves a promise that other init code awaits.
const appConfigReady = (async () => {
    try {
        const cfg = await window.api.getAppConfig();
        if (cfg?.backendUrl) BACKEND_URL = cfg.backendUrl;
        if (cfg?.webUrl) WEB_URL = cfg.webUrl;
        console.log(`📦 Renderer config: backend=${BACKEND_URL} web=${WEB_URL}`);
    } catch (e) {
        console.warn('Could not load app config; using defaults', e);
    }
})();

// Build the OBS Browser Source URL for a given overlay.
// The web app's universal /live/:overlayId route handles all 7 overlay types
// (goal, gift-alert, last-x, leaderboard, chart, chat, event-feed).
function buildOverlayLiveUrl(ov) {
    if (!ov || !ov.overlayId) return '';
    return `${WEB_URL}/live/${ov.overlayId}`;
}

let currentOverlayContext = null; // { overlayType, subType, overlayDbId, overlayId }
let currentOverlayData = null;

const overlayTypeMap = {
    'goal-likes':       { overlayType: 'goal', subType: 'likes', title: 'Beğeni Hedefi', icon: '❤️' },
    'goal-shares':      { overlayType: 'goal', subType: 'shares', title: 'Paylaşım Hedefi', icon: '🔁' },
    'goal-follows':     { overlayType: 'goal', subType: 'follows', title: 'Takip Hedefi', icon: '➕' },
    'goal-viewers':     { overlayType: 'goal', subType: 'viewer_count', title: 'İzleyici Hedefi', icon: '👁️' },
    'goal-coins':       { overlayType: 'goal', subType: 'coins', title: 'Kazanılan Coin Hedefi', icon: '🪙' },
    'goal-subscribers': { overlayType: 'goal', subType: 'subscribers', title: 'Yeni Abone Hedefi', icon: '⭐' },
    'goal-custom1':     { overlayType: 'goal', subType: 'custom1', title: 'Özel Hedef 1', icon: '🎯' },
    'goal-custom2':     { overlayType: 'goal', subType: 'custom2', title: 'Özel Hedef 2', icon: '🎯' },
    'goal-custom3':     { overlayType: 'goal', subType: 'custom3', title: 'Özel Hedef 3', icon: '🎯' },
    'gift-alert':       { overlayType: 'gift-alert', subType: 'alert', title: 'Hediye Uyarısı', icon: '🎁' },
    'gift-ticker':      { overlayType: 'gift-alert', subType: 'ticker', title: 'Hediye Şeridi', icon: '📜' },
    'lastx-follower':   { overlayType: 'last-x', subType: 'follows', title: 'Son Takipçi', icon: '➕' },
    'lastx-gift':       { overlayType: 'last-x', subType: 'gifts', title: 'Son Hediye', icon: '🎁' },
    'lastx-like':       { overlayType: 'last-x', subType: 'likes', title: 'Son Beğenen', icon: '❤️' },
    'lastx-share':      { overlayType: 'last-x', subType: 'shares', title: 'Son Paylaşan', icon: '🔁' },
    'lb-gifters':       { overlayType: 'leaderboard', subType: 'gifts', title: 'En Çok Hediye', icon: '🏆' },
    'lb-likers':        { overlayType: 'leaderboard', subType: 'likes', title: 'En Çok Beğeni', icon: '❤️' },
    'lb-points':        { overlayType: 'leaderboard', subType: 'points', title: 'Sadakat Tablosu', icon: '💎' },
    'chart-viewers':    { overlayType: 'chart', subType: 'viewer_count', title: 'İzleyici Grafiği', icon: '📊' },
    'dock-chat':        { overlayType: 'chat', subType: 'chat', title: 'Sohbet Paneli', icon: '💬' },
    'dock-events':      { overlayType: 'event-feed', subType: 'events', title: 'Olay Akışı Paneli', icon: '📋' },
    'subathon-timer':   { overlayType: 'subathon', subType: 'timer', title: 'Subathon Sayacı', icon: '⏱️' },
    'wheel-actions':    { overlayType: 'wheel', subType: 'actions', title: 'Şans Çarkı', icon: '🎡' },
    'my-actions':       { overlayType: 'actions-feed', subType: 'actions', title: 'Aksiyon Ekranı', icon: '⚡' },
    'interaction-slider': { overlayType: 'interaction-slider', subType: 'slider', title: 'Etkileşim Şeridi', icon: '🎞️' },
    'gift-cannon':      { overlayType: 'gift-cannon', subType: 'particles', title: 'Hediye Topu', icon: '💥' },
    'like-fountain':    { overlayType: 'like-fountain', subType: 'particles', title: 'Kalp Çeşmesi', icon: '💗' },
    'emoji-rain':       { overlayType: 'emoji-rain', subType: 'particles', title: 'Emoji Yağmuru', icon: '🌧️' },
};

// Navigate to overlay settings page
async function navigateOverlay(key) {
    // Handle gallery sub-items FIRST — they don't live in overlayTypeMap
    if (key === 'gallery-templates' || key === 'gallery-my') {
        document.querySelectorAll('.nav-sub-item').forEach(i => i.classList.remove('active'));
        if (typeof event !== 'undefined') {
            event.target.closest?.('.nav-sub-item')?.classList.add('active');
        }
        navigateTo('overlay-gallery');
        showGalleryTab(key === 'gallery-templates' ? 'templates' : 'my');
        return;
    }

    const info = overlayTypeMap[key];
    if (!info) {
        console.warn('navigateOverlay: unknown key', key);
        return;
    }

    // Clear active states
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.nav-sub-item').forEach(i => i.classList.remove('active'));
    if (typeof event !== 'undefined' && event?.target) {
        event.target.closest('.nav-sub-item')?.classList.add('active');
    } else {
        // Called programmatically — highlight the matching sidebar item by its handler
        document.querySelector(`.nav-sub-item[onclick*="navigateOverlay('${key}')"]`)?.classList.add('active');
    }

    // Show overlay page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('overlay-page').classList.add('active');

    // Set page info
    document.getElementById('ov-page-title').innerHTML = `${info.icon} ${info.title}`;
    document.getElementById('ov-page-subtitle').textContent = `${info.title} overlay ayarlarını yapılandırın`;

    // Show/hide fields based on type
    const isGoal = info.overlayType === 'goal';
    const isGift = info.overlayType === 'gift-alert';
    const isLastX = info.overlayType === 'last-x';
    const isLb = info.overlayType === 'leaderboard' || info.overlayType === 'chart';
    const isDock = info.overlayType === 'chat' || info.overlayType === 'event-feed';
    const isSubathon = info.overlayType === 'subathon';
    const isWheel = info.overlayType === 'wheel';

    document.getElementById('ov-target-group').style.display = isGoal ? '' : 'none';
    document.getElementById('ov-current-group').style.display = isGoal ? '' : 'none';
    document.getElementById('ov-maxitems-group').style.display = (isLb || isDock) ? '' : 'none';
    document.getElementById('ov-duration-group').style.display = isGift ? '' : 'none';
    document.getElementById('ov-animation-group').style.display = (isGoal || isGift) ? '' : 'none';
    document.getElementById('ov-showPct-group').style.display = isGoal ? '' : 'none';
    document.getElementById('ov-showNums-group').style.display = isGoal ? '' : 'none';
    const subGroup = document.getElementById('ov-subathon-group');
    if (subGroup) subGroup.style.display = isSubathon ? '' : 'none';
    const wheelGroup = document.getElementById('ov-wheel-group');
    if (wheelGroup) wheelGroup.style.display = isWheel ? '' : 'none';

    currentOverlayContext = { key, ...info, overlayDbId: null, overlayId: null };

    // Always start with a fresh form — user-requested behavior
    // ("her seferinde yenilenecek"). Existing records appear in the drafts list below.
    currentOverlayData = null;
    resetOverlayForm(info);
    updateOverlayPreview();
    updateSaveButtonLabel();
    await loadOverlayDrafts();
}

// ─── Drafts / Saved overlays for current type+subType ──────────────────────

async function loadOverlayDrafts() {
    const listEl = document.getElementById('ov-drafts-list');
    const subEl = document.getElementById('ov-drafts-sub');
    if (!listEl || !currentOverlayContext) return;

    listEl.innerHTML = '<div class="ov-drafts-empty">Yükleniyor...</div>';

    try {
        const result = await window.api.getOverlays({
            type: currentOverlayContext.overlayType,
            subType: currentOverlayContext.subType,
        });
        if (!result.success) throw new Error(result.error || 'load failed');

        const drafts = result.data || [];
        if (subEl) {
            subEl.textContent = drafts.length
                ? `${drafts.length} taslak • istediğini seçip kaldığın yerden devam edebilirsin`
                : 'Bu tip için henüz kaydedilmiş taslak yok — form\'u doldurup "Kaydet" ile ilk taslağını oluştur';
        }

        if (drafts.length === 0) {
            listEl.innerHTML = '<div class="ov-drafts-empty">Henüz kayıtlı taslak yok</div>';
            return;
        }

        // newest first
        drafts.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        listEl.innerHTML = '';
        drafts.forEach((ov) => {
            const barColor = ov.style?.barColor || '#ff2eb8';
            const target = ov.targetValue || 0;
            const current = ov.currentValue || 0;
            const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const isActive = currentOverlayContext.overlayDbId === ov._id;
            const showGoalBits = ov.overlayType === 'goal';

            const card = document.createElement('div');
            card.className = 'draft-card' + (isActive ? ' active' : '');
            card.innerHTML = `
                <div class="draft-title" title="${escapeHtml(ov.title || '—')}">${escapeHtml(ov.title || '—')}</div>
                ${showGoalBits ? `
                    <div class="draft-progress-track">
                        <div class="draft-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${barColor},${barColor}cc);box-shadow:0 0 6px ${barColor}66;"></div>
                    </div>
                    <div class="draft-meta"><span>İlerleme</span><span><b>${current.toLocaleString()}</b> / ${target.toLocaleString()}</span></div>
                ` : `
                    <div class="draft-meta"><span>${ov.overlayType} / ${ov.subType || ''}</span><span style="color:${ov.isActive ? '#ff2eb8' : '#7a6e94'}">${ov.isActive ? '● AKTİF' : '● PASİF'}</span></div>
                `}
                <div class="draft-actions">
                    <button class="btn-draft btn-resume" data-id="${ov._id}" data-action="resume">
                        <i class="fas fa-play"></i> Devam Et
                    </button>
                    ${showGoalBits ? `
                        <button class="btn-draft btn-reset" data-id="${ov._id}" data-action="reset">
                            <i class="fas fa-undo"></i> Sıfırla
                        </button>` : ''}
                    <button class="btn-draft btn-delete" data-id="${ov._id}" data-action="delete" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Click anywhere on the card (except buttons) → load as "continue"
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-draft')) return;
                resumeDraft(ov._id);
            });

            // Button delegates
            card.querySelectorAll('.btn-draft').forEach((btn) => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const action = btn.dataset.action;
                    if (action === 'resume') resumeDraft(id);
                    else if (action === 'reset') resetDraft(id);
                    else if (action === 'delete') deleteDraft(id);
                });
            });

            listEl.appendChild(card);
        });
    } catch (err) {
        console.error('loadOverlayDrafts error:', err);
        listEl.innerHTML = '<div class="ov-drafts-empty" style="color:#ff2eb8">Taslaklar yüklenemedi</div>';
    }
}

async function resumeDraft(dbId) {
    try {
        const result = await window.api.getOverlay(dbId);
        if (!result.success) { showToast('Taslak yüklenemedi', true); return; }
        const ov = result.data;
        currentOverlayData = ov;
        currentOverlayContext.overlayDbId = ov._id;
        currentOverlayContext.overlayId = ov.overlayId;
        populateOverlayForm(ov);
        updateOverlayPreview();
        updateSaveButtonLabel();
        showToast(`"${ov.title}" yüklendi — değişikliklerin bu taslağa kaydedilecek`);
        await loadOverlayDrafts(); // refresh active highlight
        document.getElementById('overlay-page')?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        showToast('Taslak yüklenemedi', true);
    }
}

async function resetDraft(dbId) {
    if (!confirm('Bu taslağın sayacı sıfırlanacak (ayarlar korunur). Emin misin?')) return;
    try {
        const result = await window.api.resetOverlay(dbId);
        if (!result.success) { showToast('Sıfırlama hatası', true); return; }
        showToast('Taslak sayacı sıfırlandı');
        // If currently loaded in the form, update the current value field too
        if (currentOverlayContext?.overlayDbId === dbId) {
            const currEl = document.getElementById('ov-current');
            if (currEl) currEl.value = 0;
            if (currentOverlayData) currentOverlayData.currentValue = 0;
            updateOverlayPreview();
        }
        await loadOverlayDrafts();
    } catch (e) {
        showToast('Sıfırlama hatası', true);
    }
}

async function deleteDraft(dbId) {
    if (!confirm('Bu taslak kalıcı olarak silinecek. Emin misin?')) return;
    try {
        const result = await window.api.deleteOverlay(dbId);
        if (!result.success) { showToast('Silme hatası', true); return; }
        showToast('Taslak silindi');
        // If we were editing this one, clear the form
        if (currentOverlayContext?.overlayDbId === dbId) {
            newOverlayDraft();
        }
        await loadOverlayDrafts();
    } catch (e) {
        showToast('Silme hatası', true);
    }
}

function newOverlayDraft() {
    if (!currentOverlayContext) return;
    currentOverlayData = null;
    currentOverlayContext.overlayDbId = null;
    currentOverlayContext.overlayId = null;
    resetOverlayForm(currentOverlayContext);
    document.getElementById('ov-url').value = '';
    updateOverlayPreview();
    updateSaveButtonLabel();
    loadOverlayDrafts(); // refresh to clear active highlight
    showToast('Yeni taslak formu açıldı');
}

function updateSaveButtonLabel() {
    // Update the Save button's label to reflect create-vs-update mode
    const btns = document.querySelectorAll('.btn-ov-save');
    btns.forEach((btn) => {
        if (currentOverlayContext?.overlayDbId) {
            btn.innerHTML = '<i class="fas fa-save"></i> Taslağı Güncelle';
        } else {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Yeni Taslak Kaydet';
        }
    });
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function populateOverlayForm(ov) {
    document.getElementById('ov-title').value = ov.title || '';
    document.getElementById('ov-target').value = ov.targetValue || 100;
    document.getElementById('ov-current').value = ov.currentValue || 0;
    document.getElementById('ov-maxitems').value = ov.config?.maxItems || 5;
    document.getElementById('ov-duration').value = ov.config?.duration || 5;

    const s = ov.style || {};
    setColorInput('ov-barColor', s.barColor || '#ff2eb8');
    setColorInput('ov-textColor', s.textColor || '#ffffff');
    setColorInput('ov-bgColor', s.backgroundColor || '#000000');
    document.getElementById('ov-fontSize').value = s.fontSize || 18;
    document.getElementById('ov-fontSize-val').textContent = (s.fontSize || 18) + 'px';
    document.getElementById('ov-borderRadius').value = s.borderRadius || 12;
    document.getElementById('ov-borderRadius-val').textContent = (s.borderRadius || 12) + 'px';
    document.getElementById('ov-theme').value = s.theme || 'neon';
    document.getElementById('ov-animation').value = s.animation || 'smooth';
    document.getElementById('ov-showPct').checked = s.showPercentage !== false;
    document.getElementById('ov-showNums').checked = s.showNumbers !== false;

    // Set URL
    if (ov.overlayId) {
        document.getElementById('ov-url').value = buildOverlayLiveUrl(ov);
    }
}

function resetOverlayForm(info) {
    document.getElementById('ov-title').value = info.title || '';
    document.getElementById('ov-target').value = 100;
    document.getElementById('ov-current').value = 0;
    document.getElementById('ov-maxitems').value = 5;
    document.getElementById('ov-duration').value = 5;
    setColorInput('ov-barColor', '#ff2eb8');
    setColorInput('ov-textColor', '#ffffff');
    setColorInput('ov-bgColor', '#000000');
    document.getElementById('ov-fontSize').value = 18;
    document.getElementById('ov-fontSize-val').textContent = '18px';
    document.getElementById('ov-borderRadius').value = 12;
    document.getElementById('ov-borderRadius-val').textContent = '12px';
    document.getElementById('ov-theme').value = 'neon';
    document.getElementById('ov-animation').value = 'smooth';
    document.getElementById('ov-showPct').checked = true;
    document.getElementById('ov-showNums').checked = true;
    document.getElementById('ov-url').value = '';
}

function setColorInput(id, value) {
    document.getElementById(id).value = value;
    const hexEl = document.getElementById(id + '-hex');
    if (hexEl) hexEl.textContent = value;
}

function getOverlayFormData() {
    var customCSSEl = document.getElementById('ov-custom-css');
    const isSubathon = currentOverlayContext.overlayType === 'subathon';
    const isWheel = currentOverlayContext.overlayType === 'wheel';
    const subConf = isSubathon ? readSubathonConfig() : {};
    const wheelConf = isWheel ? readWheelConfig() : {};
    return {
        title: document.getElementById('ov-title').value || currentOverlayContext.title,
        overlayType: currentOverlayContext.overlayType,
        subType: currentOverlayContext.subType,
        targetValue: parseInt(document.getElementById('ov-target').value) || 100,
        currentValue: parseInt(document.getElementById('ov-current').value) || 0,
        config: {
            maxItems: parseInt(document.getElementById('ov-maxitems').value) || 5,
            duration: parseInt(document.getElementById('ov-duration').value) || 5,
            ...subConf,
            ...wheelConf,
        },
        style: {
            barColor: document.getElementById('ov-barColor').value,
            textColor: document.getElementById('ov-textColor').value,
            backgroundColor: document.getElementById('ov-bgColor').value + '99',
            fontSize: parseInt(document.getElementById('ov-fontSize').value),
            borderRadius: parseInt(document.getElementById('ov-borderRadius').value),
            theme: document.getElementById('ov-theme').value,
            animation: document.getElementById('ov-animation').value,
            showPercentage: document.getElementById('ov-showPct').checked,
            showNumbers: document.getElementById('ov-showNums').checked,
            customCSS: customCSSEl ? customCSSEl.value : ''
        },
        isActive: true
    };
}

async function saveCurrentOverlay() {
    if (!currentOverlayContext) return;

    const data = getOverlayFormData();

    try {
        let result;
        if (currentOverlayContext.overlayDbId) {
            result = await window.api.updateOverlay(currentOverlayContext.overlayDbId, data);
        } else {
            result = await window.api.createOverlay(data);
        }

        if (result.success) {
            const wasNew = !currentOverlayContext.overlayDbId;
            currentOverlayData = result.data;
            currentOverlayContext.overlayDbId = result.data._id;
            currentOverlayContext.overlayId = result.data.overlayId;
            document.getElementById('ov-url').value = buildOverlayLiveUrl(result.data);
            updateSaveButtonLabel();
            await loadOverlayDrafts();
            showToast(wasNew ? 'Yeni taslak oluşturuldu ✓' : 'Taslak güncellendi ✓');
        } else {
            showToast('Hata: ' + result.error, true);
        }
    } catch (error) {
        showToast('Bağlantı hatası', true);
    }
}

async function resetCurrentOverlay() {
    if (!currentOverlayContext?.overlayDbId) return;
    try {
        const result = await window.api.resetOverlay(currentOverlayContext.overlayDbId);
        if (result.success) {
            document.getElementById('ov-current').value = 0;
            updateOverlayPreview();
            showToast('Overlay sıfırlandı!');
        }
    } catch (e) {
        showToast('Sıfırlama hatası', true);
    }
}

function copyOverlayUrl() {
    const url = document.getElementById('ov-url').value;
    if (!url) { showToast('Önce kaydedin!', true); return; }
    navigator.clipboard.writeText(url).then(() => showToast('URL kopyalandı!'));
}

function openOverlayUrl() {
    const url = document.getElementById('ov-url').value;
    if (!url) { showToast('Önce kaydedin!', true); return; }
    window.api.openExternal(url);
}

// Goal theme normaliser — mirrors normalizeGoalTheme() in the web overlay so
// legacy saved overlays still map onto a nice modern theme.
var GOAL_THEMES = ['neon','aurora','fire','holo','gold','cyber','galaxy','synth','glass','candy','electric','minimal'];

// Per-theme slice palette for the Wheel overlay so each theme actually looks
// different (the wheel preview used to hardcode the same 6 colours regardless of
// theme — that's why "Electric ile Candy aynı" and theme changes did nothing).
var WHEEL_PALETTES = {
    neon:    ['#ff2eb8','#a855f7','#22d3ee','#ff5fc4','#7c3aed','#ec4899'],
    aurora:  ['#48f0c8','#22d3ee','#34d399','#5eead4','#2dd4bf','#67e8f9'],
    fire:    ['#ff6b1a','#ff3b3b','#ffa42e','#ff5722','#ff8c42','#e63946'],
    holo:    ['#ff2ec4','#a855f7','#22d3ee','#34d399','#ffd700','#ff6b1a'],
    gold:    ['#ffd700','#f59e0b','#fbbf24','#eab308','#d4af37','#fcd34d'],
    cyber:   ['#22d3ee','#3b82f6','#a855f7','#06b6d4','#0ea5e9','#e879f9'],
    galaxy:  ['#a855f7','#7c3aed','#6366f1','#c084fc','#8b5cf6','#3b82f6'],
    synth:   ['#ff2e88','#ff6ac1','#a855f7','#22d3ee','#f72585','#7209b7'],
    glass:   ['#a855f7','#818cf8','#c4b5fd','#93c5fd','#a78bfa','#bfdbfe'],
    candy:   ['#ff5fa2','#ff9ec9','#ffb3d9','#ff7eb6','#ffc2dd','#f06595'],
    electric:['#3b82f6','#22d3ee','#60a5fa','#2563eb','#38bdf8','#0ea5e9'],
    minimal: ['#9d8bbf','#cbd5e1','#a1a1aa','#d4d4d8','#b4a7d6','#e2e8f0'],
};
function wheelPalette(theme) { return WHEEL_PALETTES[normalizeGoalThemeJS(theme)] || WHEEL_PALETTES.neon; }

function normalizeGoalThemeJS(t) {
    var v = (t || '').toLowerCase();
    if (GOAL_THEMES.indexOf(v) !== -1) return v;
    if (v === 'gaming') return 'cyber';
    if (v === 'gradient') return 'holo';
    return 'neon';
}

// Style carousel — 12 premium animated presets
var currentStyleIndex = 0;
var overlayStyles = [
    { name: 'Neon Pulse', theme: 'neon',     barColor: '#ff2eb8', bgColor: '#08030f', textColor: '#ffffff', animation: 'smooth' },
    { name: 'Aurora',     theme: 'aurora',   barColor: '#48f0c8', bgColor: '#060c14', textColor: '#eaffff', animation: 'smooth' },
    { name: 'Fire / Lava',theme: 'fire',     barColor: '#ff6b1a', bgColor: '#120602', textColor: '#ffd9b3', animation: 'pulse'  },
    { name: 'Rainbow Holo',theme: 'holo',    barColor: '#ff2ec4', bgColor: '#0a0812', textColor: '#ffffff', animation: 'smooth' },
    { name: 'Gold Luxury',theme: 'gold',     barColor: '#ffd700', bgColor: '#1a1502', textColor: '#ffe9a8', animation: 'smooth' },
    { name: 'Cyberpunk',  theme: 'cyber',    barColor: '#22d3ee', bgColor: '#04080e', textColor: '#22d3ee', animation: 'smooth' },
    { name: 'Galaxy',     theme: 'galaxy',   barColor: '#a855f7', bgColor: '#05030f', textColor: '#f0e7ff', animation: 'smooth' },
    { name: 'Synthwave',  theme: 'synth',    barColor: '#ff2e88', bgColor: '#1e0828', textColor: '#ffffff', animation: 'bounce' },
    { name: 'Glass',      theme: 'glass',    barColor: '#a855f7', bgColor: '#111122', textColor: '#ffffff', animation: 'smooth' },
    { name: 'Candy',      theme: 'candy',    barColor: '#ff5fa2', bgColor: '#1a0d14', textColor: '#ffffff', animation: 'bounce' },
    { name: 'Electric',   theme: 'electric', barColor: '#3b82f6', bgColor: '#030814', textColor: '#dbeafe', animation: 'pulse'  },
    { name: 'Minimal',    theme: 'minimal',  barColor: '#ff2eb8', bgColor: '#0f0c16', textColor: '#f5f5fa', animation: 'smooth' }
];

function prevOverlayStyle() {
    currentStyleIndex = (currentStyleIndex - 1 + overlayStyles.length) % overlayStyles.length;
    applyCurrentStyle();
}

function nextOverlayStyle() {
    currentStyleIndex = (currentStyleIndex + 1) % overlayStyles.length;
    applyCurrentStyle();
}

function applyCurrentStyle() {
    var s = overlayStyles[currentStyleIndex];
    var themeSel = document.getElementById('ov-theme');
    if (themeSel) themeSel.value = s.theme;
    document.getElementById('ov-barColor').value = s.barColor;
    document.getElementById('ov-bgColor').value = s.bgColor;
    document.getElementById('ov-textColor').value = s.textColor;
    var animSel = document.getElementById('ov-animation');
    if (animSel && s.animation) animSel.value = s.animation;
    var label = document.getElementById('ov-style-label');
    if (label) label.textContent = s.name + ' · ' + (currentStyleIndex + 1) + '/' + overlayStyles.length;
    if (currentOverlayContext && currentOverlayContext.overlayType === 'wheel') recolorWheelSlicesToTheme(s.theme);
    updateOverlayPreview();
}

// Theme dropdown handler — recolours wheel slices to the theme before previewing.
function onOverlayThemeChange() {
    if (currentOverlayContext && currentOverlayContext.overlayType === 'wheel') {
        recolorWheelSlicesToTheme(document.getElementById('ov-theme')?.value);
    }
    updateOverlayPreview();
}

function testOverlay() {
    const type = currentOverlayContext?.overlayType;

    // Goals: just preview a filled bar.
    if (type === 'goal') {
        const currentEl = document.getElementById('ov-current');
        const targetEl = document.getElementById('ov-target');
        if (currentEl && targetEl) {
            const target = parseInt(targetEl.value) || 100;
            const testVal = Math.floor(target * 0.65);
            currentEl.value = testVal;
            updateOverlayPreview();
            showToast('Test değeri: ' + testVal);
        }
        return;
    }

    // Live overlays react to real TikTok events. Fire a representative
    // sample through the backend so an OPEN overlay (OBS/browser) animates.
    // Requires the backend socket connected (it is, after login).
    const samples = {
        'gift-cannon':  { eventType: 'gift', giftName: 'Gül', giftId: 5655, count: 5 },
        'like-fountain':{ eventType: 'like', likeCount: 20, count: 20 },
        'emoji-rain':   { eventType: 'chat', comment: 'harika yayın 🔥😍🎉💯' },
        'gift-alert':   { eventType: 'gift', giftName: 'Gül', giftId: 5655, count: 1, diamondCount: 1 },
        'leaderboard':  { eventType: currentOverlayContext?.subType === 'likes' ? 'like' : 'gift', giftName: 'Gül', count: 50, likeCount: 50 },
        'chart':        { eventType: 'viewer', viewerCount: 1234, count: 1 },
        'last-x':       { eventType: currentOverlayContext?.subType === 'follows' ? 'follow' : (currentOverlayContext?.subType === 'likes' ? 'like' : 'gift'), giftName: 'Gül', count: 1 },
        'chat':         { eventType: 'chat', comment: 'Merhaba! Harika yayın 👏' },
        'event-feed':   { eventType: 'gift', giftName: 'Gül', count: 3, diamondCount: 3 },
        'subathon':     { eventType: 'gift', giftName: 'Gül', count: 1, diamondCount: 1 },
        'wheel':        { eventType: 'gift', giftName: currentOverlayContext?.overlayId ? '' : 'Gül', count: 1 },
    };

    const sample = samples[type];
    if (!sample) {
        // actions-feed → test via the Automation page; interaction-slider is data-driven.
        if (type === 'actions-feed') {
            showToast('MyActions\'ı test etmek için: Aksiyonlar & Olaylar sayfasından bir aksiyonu "Test Et"', false);
        } else if (type === 'interaction-slider') {
            showToast('Etkileşim Şeridi, hediye kurallarından otomatik dolar — kural ekleyince görünür', false);
        } else {
            showToast('Bu overlay için canlı test yok — kaydet ve OBS\'de izle', false);
        }
        return;
    }

    if (!window.api?.forwardTikTokEvent) { showToast('Backend bağlantısı yok', true); return; }
    const payload = { username: 'TestKullanıcı', nickname: 'TestKullanıcı', profilePicture: '', ...sample };
    window.api.forwardTikTokEvent(payload).then((r) => {
        if (r?.success) showToast('🧪 Test event gönderildi — açık overlay\'de görmelisin');
        else showToast('Test gönderilemedi — yayın bağlantısı gerekebilir', true);
    }).catch(() => showToast('Test gönderilemedi', true));
}

function importCustomCSS() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.css,.txt';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('ov-custom-css').value = ev.target.result;
            updateOverlayPreview();
            showToast('CSS dosyası yüklendi');
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportOverlayConfig() {
    if (!currentOverlayContext) { showToast('Önce bir overlay seçin', true); return; }
    var config = {
        type: currentOverlayContext.type,
        subType: currentOverlayContext.subType,
        title: document.getElementById('ov-title').value,
        target: document.getElementById('ov-target').value,
        style: {
            barColor: document.getElementById('ov-barColor').value,
            textColor: document.getElementById('ov-textColor').value,
            bgColor: document.getElementById('ov-bgColor').value,
            fontSize: document.getElementById('ov-fontSize').value,
            borderRadius: document.getElementById('ov-borderRadius').value,
            theme: document.getElementById('ov-theme').value,
            animation: document.getElementById('ov-animation').value,
        },
        customCSS: document.getElementById('ov-custom-css').value
    };
    var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'overlay-config-' + (currentOverlayContext.subType || 'custom') + '.json';
    a.click();
    showToast('Ayarlar dışa aktarıldı');
}

function importOverlayConfig() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var config = JSON.parse(ev.target.result);
                if (config.title) document.getElementById('ov-title').value = config.title;
                if (config.target) document.getElementById('ov-target').value = config.target;
                if (config.style) {
                    if (config.style.barColor) document.getElementById('ov-barColor').value = config.style.barColor;
                    if (config.style.textColor) document.getElementById('ov-textColor').value = config.style.textColor;
                    if (config.style.bgColor) document.getElementById('ov-bgColor').value = config.style.bgColor;
                    if (config.style.fontSize) document.getElementById('ov-fontSize').value = config.style.fontSize;
                    if (config.style.borderRadius) document.getElementById('ov-borderRadius').value = config.style.borderRadius;
                    if (config.style.theme) document.getElementById('ov-theme').value = config.style.theme;
                    if (config.style.animation) document.getElementById('ov-animation').value = config.style.animation;
                }
                if (config.customCSS) document.getElementById('ov-custom-css').value = config.customCSS;
                updateOverlayPreview();
                showToast('Ayarlar içe aktarıldı');
            } catch (err) {
                showToast('Geçersiz dosya formatı', true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Live Preview
function updateOverlayPreview() {
    const preview = document.getElementById('ov-preview');
    if (!preview || !currentOverlayContext) return;

    // Update color hex displays
    ['barColor', 'textColor', 'bgColor'].forEach(key => {
        const el = document.getElementById('ov-' + key);
        const hex = document.getElementById('ov-' + key + '-hex');
        if (el && hex) hex.textContent = el.value;
    });

    const s = {
        barColor: document.getElementById('ov-barColor').value,
        textColor: document.getElementById('ov-textColor').value,
        backgroundColor: document.getElementById('ov-bgColor').value + '99',
        fontSize: parseInt(document.getElementById('ov-fontSize').value),
        borderRadius: parseInt(document.getElementById('ov-borderRadius').value),
        theme: document.getElementById('ov-theme').value,
        animation: document.getElementById('ov-animation').value,
        showPercentage: document.getElementById('ov-showPct').checked,
        showNumbers: document.getElementById('ov-showNums').checked
    };
    const title = document.getElementById('ov-title').value || currentOverlayContext.title;
    const type = currentOverlayContext.overlayType;
    const current = parseInt(document.getElementById('ov-current').value) || 0;
    const target = parseInt(document.getElementById('ov-target').value) || 100;

    const themeStyles = getThemeCSS(s);

    if (type === 'goal') {
        const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
        const done = current >= target && target > 0;
        const gt = normalizeGoalThemeJS(s.theme);
        const emberFx = gt === 'fire' ? '<span class="ember" style="left:20%"></span><span class="ember" style="left:55%;animation-delay:.6s"></span><span class="ember" style="left:82%;animation-delay:1.1s"></span>' : '';
        const sparkFx = gt === 'gold' ? '<span class="spark" style="left:30%;top:28%"></span><span class="spark" style="left:68%;top:62%;animation-delay:.8s"></span>' : '';
        preview.innerHTML = `
            <div class="sg ${gt}${done ? ' is-done' : ''}" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;">
                <div class="sg-head">
                    <span class="sg-title" style="font-size:${s.fontSize}px;">${title}</span>
                    ${s.showNumbers ? `<span class="sg-nums" style="font-size:${Math.round(s.fontSize * 0.74)}px;">${current.toLocaleString('tr-TR')} / ${target.toLocaleString('tr-TR')}</span>` : ''}
                </div>
                <div class="sg-track">
                    <div class="sg-fill shine ${s.animation || 'smooth'}" style="width:${pct}%;">${emberFx}${sparkFx}</div>
                    ${pct > 1 && pct < 100 ? `<span class="sg-tip" style="left:calc(${pct}% - 5px)"></span>` : ''}
                    ${s.showPercentage ? `<span class="sg-pct">${pct.toFixed(0)}%</span>` : ''}
                </div>
                ${done ? '<div class="sg-done-badge">★ TAMAMLANDI ★</div>' : ''}
            </div>`;
    } else if (type === 'gift-alert') {
        const gt = normalizeGoalThemeJS(s.theme);
        preview.innerHTML = `
            <div class="ov-card ${gt} ov-glow ga-pop" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:24px 34px;text-align:center;min-width:280px;">
                <div class="ga-rays" style="--c:${s.barColor}"></div><div class="ga-halo" style="--c:${s.barColor}"></div>
                <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;">
                    <div class="ga-icon" style="filter:drop-shadow(0 0 18px ${s.barColor}cc);font-size:72px;line-height:1;">🌹</div>
                    <div class="ov-title ga-user" style="color:${s.textColor};font-size:${s.fontSize}px;font-weight:900;">Kullanıcı</div>
                    <div class="ga-gift" style="font-size:${Math.round(s.fontSize*0.86)}px;"><span class="ov-accent">Gül</span><span class="ga-mult" style="--c:${s.barColor}">×5</span></div>
                    <div class="ga-diamonds" style="font-size:${Math.round(s.fontSize*0.66)}px;">💎 5</div>
                </div>
            </div>`;
    } else if (type === 'last-x') {
        const gt = normalizeGoalThemeJS(s.theme);
        preview.innerHTML = `
            <div class="ov-card ${gt}" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:16px 20px;min-width:240px;">
                <div class="lx-head ov-accent"><span>🎯</span><span>${title}</span></div>
                <div class="lx-body"><div style="flex:1;min-width:0;"><div class="ov-title lx-user" style="color:${s.textColor};font-size:${s.fontSize}px;">Kullanıcı Adı</div></div></div>
            </div>`;
    } else if (type === 'leaderboard' || type === 'chart') {
        const gt = normalizeGoalThemeJS(s.theme);
        if (type === 'chart') {
            const data = [['Kullanıcı 1', 100], ['Kullanıcı 2', 62], ['Kullanıcı 3', 35]];
            const rows = data.map(([u, w]) => `<div class="ch-row"><div class="ch-user" style="color:${s.textColor}">${u}</div><div class="ch-track"><div class="ch-fill ov-shine" style="width:${w}%"></div></div><div class="ch-score ov-accent">${(w * 40).toLocaleString('tr-TR')}</div></div>`).join('');
            preview.innerHTML = `<div class="ov-card ${gt}" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:16px 20px;min-width:320px;"><div class="ch-head ov-accent">📊 ${title}</div>${rows}</div>`;
        } else {
            const medals = ['👑', '🥈', '🥉']; const widths = [100, 64, 41];
            const rows = medals.map((m, i) => `<div class="lb-row${i === 0 ? ' lb-first' : ''}"><div class="lb-rankbar" style="width:${widths[i]}%"></div><div class="lb-rank lb-r${i + 1}">${m}</div><div class="lb-user" style="color:${s.textColor}">Kullanıcı ${i + 1}</div><div class="lb-score ov-accent">${(12450 - i * 4000).toLocaleString('tr-TR')}</div></div>`).join('');
            preview.innerHTML = `<div class="ov-card ${gt}" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:16px 18px;min-width:320px;"><div class="lb-head ov-accent">🏆 ${title}</div>${rows}</div>`;
        }
    } else if (type === 'chat') {
        const gt = normalizeGoalThemeJS(s.theme);
        const msgs = [['Kullanıcı1', 'Merhaba! 👋'], ['Kullanıcı2', 'Harika yayın!'], ['Kullanıcı3', 'Devam et 🔥']];
        const html = msgs.map(([u, t]) => `<div class="dk-chatrow"><div class="dk-msg" style="font-size:14px;"><span class="ov-accent dk-user">${u}</span><span style="color:${s.textColor}">${t}</span></div></div>`).join('');
        preview.innerHTML = `<div class="ov-card ${gt}" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:12px;min-width:280px;"><div class="dk-head ov-accent">💬 ${title}</div><div class="dk-scroll">${html}</div></div>`;
    } else if (type === 'event-feed') {
        const gt = normalizeGoalThemeJS(s.theme);
        const events = [['🎁', 'Kullanıcı1', 'Gül gönderdi ×5'], ['❤️', 'Kullanıcı2', 'Beğendi'], ['➕', 'Kullanıcı3', 'Takip etti']];
        const html = events.map(([ic, u, t]) => `<div class="dk-feedrow"><span class="dk-emoji">${ic}</span><div style="flex:1;min-width:0;font-size:14px;color:${s.textColor}"><b class="ov-accent" style="margin-right:5px;">${u}</b><span>${t}</span></div></div>`).join('');
        preview.innerHTML = `<div class="ov-card ${gt}" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:12px;min-width:280px;"><div class="dk-head ov-accent">📋 ${title}</div><div class="dk-scroll">${html}</div></div>`;
    } else if (type === 'subathon') {
        const gt = normalizeGoalThemeJS(s.theme);
        preview.innerHTML = `
            <div class="ov-card ${gt} ov-glow" style="--bar:${s.barColor};--radius:${s.borderRadius}px;border-radius:${s.borderRadius}px;padding:22px 40px;text-align:center;min-width:320px;">
                <div class="sub-label ov-accent">⏱️ ${title}</div>
                <div class="sub-time sub-tick" style="color:${s.textColor};font-size:${Math.max(44, s.fontSize * 2.2)}px;">01:00:00</div>
                <div class="sub-foot"><span class="sub-chip sub-added">+5 dk eklendi</span></div>
            </div>`;
    } else if (type === 'wheel') {
        // Theme-driven wheel: slice colours come from the theme palette (or each
        // slice's own colour), pointer/center use the theme accent. So changing the
        // theme actually changes the wheel, and every theme looks distinct.
        const wheelConf = readWheelConfig();
        const pal = wheelPalette(s.theme);
        const accent = s.barColor || '#ffd000';
        const wslices = (wheelConf.slices && wheelConf.slices.length) ? wheelConf.slices : [{}, {}, {}, {}, {}, {}];
        const n = wslices.length;
        const cx = 100, cy = 100, r = 92, step = 360 / n;
        const polar = (d, rr) => [cx + rr * Math.cos((d - 90) * Math.PI / 180), cy + rr * Math.sin((d - 90) * Math.PI / 180)];
        const paths = wslices.map((sl, i) => {
            const a0 = i * step, a1 = (i + 1) * step;
            const [x0, y0] = polar(a0, r), [x1, y1] = polar(a1, r);
            const large = step > 180 ? 1 : 0;
            const col = sl.color || pal[i % pal.length];
            const mid = a0 + step / 2;
            const [lx, ly] = polar(mid, r * 0.6);
            const lbl = sl.label ? `<text x="${lx}" y="${ly}" fill="#fff" font-size="9" font-weight="800" text-anchor="middle" dominant-baseline="middle" transform="rotate(${mid} ${lx} ${ly})" style="text-shadow:0 1px 2px rgba(0,0,0,0.85)">${escapeHtml(String(sl.label).slice(0, 9))}</text>` : '';
            return `<path d="M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z" fill="${col}" stroke="#0a0a0f" stroke-width="2"/>${lbl}`;
        }).join('');
        preview.innerHTML = `
            <div style="position:relative;width:200px;height:200px;margin:0 auto;">
                <div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:18px solid ${accent};z-index:2;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></div>
                <svg width="200" height="200" viewBox="0 0 200 200" style="filter:drop-shadow(0 6px 16px rgba(0,0,0,0.5));">
                    ${paths}
                    <circle cx="100" cy="100" r="16" fill="#0a0a0f" stroke="${accent}" stroke-width="3"/>
                    <circle cx="100" cy="100" r="6" fill="${accent}"/>
                </svg>
            </div>`;
    } else if (type === 'actions-feed') {
        preview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
                <div style="padding:18px 30px;border-radius:16px;background:linear-gradient(135deg,${s.barColor}33,rgba(15,7,32,0.92));border:1px solid ${s.barColor}66;box-shadow:0 12px 40px rgba(0,0,0,0.4),0 0 40px ${s.barColor}33;text-align:center;">
                    <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;color:#fff;text-shadow:0 0 18px ${s.barColor}aa;">tester Gül gönderdi!</div>
                    <div style="margin-top:6px;font-size:14px;color:#fff;opacity:0.8;">Teşekkürler! 🎉</div>
                </div>
                <div style="font-size:11px;color:#9d8bbf;text-align:center;max-width:300px;line-height:1.5;">Bu overlay aksiyon ateşlendiğinde uyarı/ses/TTS/konfeti gösterir. Yayında <b>şeffaftır</b> — sadece aksiyon olunca görünür.</div>
            </div>`;
    } else if (type === 'interaction-slider') {
        // Animated marquee preview (was static — testers expected it to scroll like
        // the live overlay). Chips are doubled so the loop is seamless (-50%).
        const demo = [['🎁 Gül', 'Blok at'], ['🚀 Roket', 'Çark çevir'], ['🦁 Aslan', '+60sn'], ['💎 Elmas', 'TNT yağmuru'], ['🌟 Yıldız', 'Konfeti']];
        const chip = ([g, a]) => `<div style="display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:${s.barColor}1a;border:1px solid ${s.barColor}44;white-space:nowrap;flex:0 0 auto;"><span style="color:${s.barColor};font-weight:800;font-size:13px;">${g}</span><span style="color:${s.textColor};opacity:0.5;">→</span><span style="color:${s.textColor};font-weight:600;font-size:13px;">${a}</span></div>`;
        const chips = demo.concat(demo).map(chip).join('');
        preview.innerHTML = `
            <style>@keyframes gdSliderMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}</style>
            <div style="width:100%;max-width:460px;padding:12px 0;border-radius:${s.borderRadius}px;${themeStyles.container};overflow:hidden;">
                <div style="display:flex;gap:10px;padding:0 14px;width:max-content;animation:gdSliderMarquee 16s linear infinite;">
                    ${chips}
                </div>
                <div style="font-size:11px;color:#9d8bbf;text-align:center;margin-top:10px;padding:0 14px;">Hediye kurallarından otomatik dolar, yayının altında soldan sağa kayar.</div>
            </div>`;
    } else if (type === 'gift-cannon') {
        // Style-aware: barColor (theme), fontSize, borderRadius now drive the preview.
        const r = s.borderRadius ?? 16;
        const fs = s.fontSize || 15;
        preview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:${r}px;background:linear-gradient(135deg,${s.barColor}22,rgba(15,7,32,0.9));border:1px solid ${s.barColor}55;box-shadow:0 0 26px ${s.barColor}44;">
                    <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${s.barColor},${s.barColor}99);border:3px solid ${s.barColor};box-shadow:0 0 18px ${s.barColor}aa;"></div>
                    <div style="font-size:42px;">🎁</div>
                    <div style="display:flex;flex-direction:column;"><span style="color:${s.textColor};font-weight:800;font-size:${fs}px;">tester</span><span style="color:${s.barColor};font-weight:700;font-size:${Math.round(fs * 0.82)}px;">Gül ×5</span></div>
                </div>
                <div style="font-size:11px;color:#9d8bbf;text-align:center;max-width:300px;line-height:1.5;">Hediye gelince gönderenin profil fotosu + hediye ikonu ekranı boydan boya uçar.</div>
            </div>`;
    } else if (type === 'like-fountain') {
        const fs = s.fontSize || 32;
        preview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                <div style="display:flex;gap:6px;align-items:flex-end;">
                    <span style="color:${s.barColor};font-size:${Math.round(fs)}px;">❤</span><span style="color:${s.barColor};font-size:${Math.round(fs * 0.8)}px;opacity:0.85;">❤</span><span style="color:${s.barColor};font-size:${Math.round(fs * 1.25)}px;">❤</span><span style="color:${s.barColor};font-size:${Math.round(fs * 0.9)}px;opacity:0.9;">❤</span><span style="color:${s.barColor};font-size:${Math.round(fs)}px;">❤</span>
                </div>
                <div style="font-size:11px;color:#9d8bbf;text-align:center;max-width:300px;line-height:1.5;">Beğeni geldikçe ekranın altından kalpler yükselir. Renk = Bar Rengi / tema.</div>
            </div>`;
    } else if (type === 'emoji-rain') {
        const fs = s.fontSize || 30;
        preview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                <div style="display:flex;gap:8px;font-size:${fs}px;">🎉 🔥 😍 👏 ✨ 💯</div>
                <div style="font-size:11px;color:#9d8bbf;text-align:center;max-width:300px;line-height:1.5;">Sohbetteki emojiler ekranın üstünden yağar. Emoji boyutu = Font Boyutu.</div>
            </div>`;
    }

    var customCSS = document.getElementById('ov-custom-css');
    if (customCSS && customCSS.value.trim()) {
        var styleEl = document.getElementById('ov-custom-style-tag');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'ov-custom-style-tag';
            preview.appendChild(styleEl);
        }
        styleEl.textContent = customCSS.value;
    }
}

function getThemeCSS(s) {
    const bc = s.barColor || '#ff2eb8';
    const bg = s.backgroundColor || 'rgba(0,0,0,0.6)';
    const themes = {
        neon: {
            container: `background:${bg};border:1px solid ${bc}44;box-shadow:0 0 20px ${bc}33,inset 0 0 20px ${bc}11;`,
            title: `text-shadow:0 0 8px ${bc}66;`,
            numbers: `text-shadow:0 0 6px ${bc}88;`,
            bar: `box-shadow:0 0 16px ${bc}88,0 0 4px ${bc};`
        },
        minimal: {
            container: `background:${bg};border:1px solid rgba(255,255,255,0.08);`,
            title: '', numbers: '',
            bar: `box-shadow:0 0 8px ${bc}44;`
        },
        gaming: {
            container: `background:${bg};border:2px solid ${bc}66;`,
            title: 'letter-spacing:1px;text-transform:uppercase;',
            numbers: '',
            bar: `box-shadow:0 0 8px ${bc}44;`
        },
        gradient: {
            container: `background:linear-gradient(135deg,${bc}22,${bc}08);border:1px solid ${bc}33;`,
            title: '', numbers: '',
            bar: `box-shadow:0 0 8px ${bc}44;`
        },
        glass: {
            container: `background:rgba(255,255,255,0.08);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);`,
            title: '', numbers: '',
            bar: `box-shadow:0 0 8px ${bc}44;`
        }
    };
    return themes[s.theme] || themes.neon;
}

// Gallery
const galleryTemplates = [
    { name: 'Neon Beğeni Hedefi', overlayType: 'goal', subType: 'likes', style: { barColor:'#ff2eb8', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.6)', fontSize:18, borderRadius:12, theme:'neon', animation:'smooth', showPercentage:true, showNumbers:true }, targetValue: 500 },
    { name: 'Gaming Takip Hedefi', overlayType: 'goal', subType: 'follows', style: { barColor:'#ff2eb8', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.7)', fontSize:20, borderRadius:8, theme:'gaming', animation:'bounce', showPercentage:true, showNumbers:true }, targetValue: 200 },
    { name: 'Cam Paylaşım Hedefi', overlayType: 'goal', subType: 'shares', style: { barColor:'#a855f7', textColor:'#fff', backgroundColor:'rgba(255,255,255,0.08)', fontSize:16, borderRadius:16, theme:'glass', animation:'smooth', showPercentage:true, showNumbers:true }, targetValue: 100 },
    { name: 'Degrade Hediye Uyarısı', overlayType: 'gift-alert', subType: 'alert', style: { barColor:'#ffd700', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.5)', fontSize:22, borderRadius:16, theme:'gradient', animation:'bounce' }, config: { duration: 5 } },
    { name: 'Minimal Liderlik Tablosu', overlayType: 'leaderboard', subType: 'gifts', style: { barColor:'#ff2eb8', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.6)', fontSize:16, borderRadius:12, theme:'minimal' }, config: { maxItems: 5 } },
    { name: 'Neon Sohbet Paneli', overlayType: 'chat', subType: 'chat', style: { barColor:'#ff2eb8', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.5)', fontSize:14, borderRadius:12, theme:'neon' }, config: { maxMessages: 20 } },
    { name: 'Cam Olay Akışı', overlayType: 'event-feed', subType: 'events', style: { barColor:'#a855f7', textColor:'#fff', backgroundColor:'rgba(255,255,255,0.08)', fontSize:14, borderRadius:12, theme:'glass' }, config: { maxEvents: 15 } },
    { name: 'Gaming Son Takipçi', overlayType: 'last-x', subType: 'follows', style: { barColor:'#ff2eb8', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.7)', fontSize:24, borderRadius:8, theme:'gaming' } },
    { name: 'Degrade İzleyici Grafiği', overlayType: 'chart', subType: 'viewer_count', style: { barColor:'#a855f7', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.5)', fontSize:16, borderRadius:12, theme:'gradient' }, config: { maxItems: 5 } },
];

// On-page gallery tab switch (so users don't need the sidebar to go back to
// templates after viewing "Kaplamalarım").
function showGalleryTab(which) {
    const isT = which === 'templates';
    document.getElementById('gtab-templates')?.classList.toggle('active', isT);
    document.getElementById('gtab-my')?.classList.toggle('active', !isT);
    if (isT) loadGalleryTemplates(); else loadMyOverlays();
}

function loadGalleryTemplates() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const typeLabels = {
        'goal':'Hedef', 'gift-alert':'Hediye Uyarısı', 'leaderboard':'Liderlik',
        'chat':'Sohbet Paneli', 'event-feed':'Olay Akışı', 'last-x':'Son Kişi', 'chart':'Grafik'
    };

    galleryTemplates.forEach((tmpl) => {
        const s = tmpl.style || {};
        const bar = s.barColor || '#ff2eb8';
        const radius = s.borderRadius || 12;
        const gt = normalizeGoalThemeJS(s.theme); // real animated theme class (neon/cyber/holo/fire/gold/glass…)
        const emberFx = gt === 'fire' ? '<span class="ember" style="left:24%"></span><span class="ember" style="left:64%;animation-delay:.6s"></span>' : '';
        const sparkFx = gt === 'gold' ? '<span class="spark" style="left:34%;top:30%"></span><span class="spark" style="left:72%;top:58%;animation-delay:.7s"></span>' : '';
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.onclick = () => applyGalleryTemplate(tmpl);
        // Real, animated, themed mini goal-bar preview (was a static fake bar that
        // ignored the template's theme — every card looked identical & "flat").
        card.innerHTML = `
            <div class="gallery-card-preview" style="background:linear-gradient(135deg,${bar}11,${bar}22);overflow:hidden;">
                <div class="sg ${gt}" style="--bar:${bar};--radius:${radius}px;border-radius:${radius}px;width:90%;padding:9px 12px;pointer-events:none;">
                    <div class="sg-head" style="gap:6px;">
                        <span class="sg-title" style="font-size:11px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${typeLabels[tmpl.overlayType] || 'Hedef'}</span>
                        <span class="sg-nums" style="font-size:9px;flex-shrink:0;">325 / 500</span>
                    </div>
                    <div class="sg-track">
                        <div class="sg-fill shine smooth" style="width:65%;">${emberFx}${sparkFx}</div>
                        <span class="sg-pct">65%</span>
                    </div>
                </div>
            </div>
            <div class="gallery-card-info">
                <div class="gallery-card-title">${tmpl.name}</div>
                <div class="gallery-card-desc">${typeLabels[tmpl.overlayType] || tmpl.overlayType} · ${s.theme} tema</div>
            </div>`;
        grid.appendChild(card);
    });
}

async function loadMyOverlays() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;color:#9d8bbf;padding:2rem;">Yükleniyor...</div>';

    try {
        const result = await window.api.getOverlays({});
        if (result.success && result.data.length > 0) {
            grid.innerHTML = '';
            result.data.forEach(ov => {
                const color = ov.style?.barColor || '#ff2eb8';
                const liveUrl = buildOverlayLiveUrl(ov);
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.innerHTML = `
                    <div class="gallery-card-preview" style="background:linear-gradient(135deg,${color}11,${color}22);">
                        <div style="font-size:2rem;">${ov.isActive ? '🟢' : '🔴'}</div>
                    </div>
                    <div class="gallery-card-info">
                        <div class="gallery-card-title">${ov.title}</div>
                        <div class="gallery-card-desc">${ov.overlayType} - ${ov.subType || ''}</div>
                        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                            <button class="btn-icon" onclick="event.stopPropagation();copyToClipboard('${liveUrl}')" title="URL Kopyala"><i class="fas fa-copy"></i></button>
                            <button class="btn-icon" onclick="event.stopPropagation();window.api.openExternal('${liveUrl}')" title="Aç"><i class="fas fa-external-link-alt"></i></button>
                            <button class="btn-icon" style="border-color:rgba(255, 46, 184,0.3);color:#ff2eb8;background:rgba(255, 46, 184,0.1);" onclick="event.stopPropagation();deleteOverlayById('${ov._id}')" title="Sil"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<div style="text-align:center;color:#9d8bbf;padding:3rem;"><i class="fas fa-inbox" style="font-size:2.5rem;opacity:0.3;margin-bottom:1rem;display:block;"></i><p>Henüz overlay oluşturmadınız</p></div>';
        }
    } catch (e) {
        grid.innerHTML = '<div style="text-align:center;color:#ff2eb8;padding:2rem;">Yüklenemedi</div>';
    }
}

async function applyGalleryTemplate(tmpl) {
    try {
        const data = {
            title: tmpl.name,
            overlayType: tmpl.overlayType,
            subType: tmpl.subType,
            targetValue: tmpl.targetValue || 0,
            config: tmpl.config || {},
            style: tmpl.style,
            isActive: true
        };
        const result = await window.api.createOverlay(data);
        if (result.success) {
            // Stay on the Templates tab (don't auto-switch to "Kaplamalarım" — that
            // left users stranded with no back button). Just confirm + tell them where.
            showToast('✓ Şablon eklendi — "Kaplamalarım" sekmesinden yönetebilirsin');
        } else {
            showToast('Hata: ' + result.error, true);
        }
    } catch (e) {
        showToast('Bağlantı hatası', true);
    }
}

async function deleteOverlayById(id) {
    if (!confirm('Bu overlay silinecek. Emin misiniz?')) return;
    try {
        const result = await window.api.deleteOverlay(id);
        if (result.success) {
            showToast('Overlay silindi!');
            loadMyOverlays();
        }
    } catch (e) {
        showToast('Silme hatası', true);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Kopyalandı!'));
}

// Gift Scanner
let scannerData = { gifts: [], totalCoins: 0, gifters: {} };

function addToScanner(giftEvent) {
    const { user, giftName, coins, count } = giftEvent;
    scannerData.gifts.unshift({ user, giftName, coins, count, time: new Date() });
    scannerData.totalCoins += (coins || 0) * (count || 1);

    if (!scannerData.gifters[user]) scannerData.gifters[user] = 0;
    scannerData.gifters[user] += (coins || 0) * (count || 1);

    if (scannerData.gifts.length > 500) scannerData.gifts.pop();

    updateScannerUI();
}

function updateScannerUI() {
    document.getElementById('scanner-total').textContent = scannerData.gifts.length;
    document.getElementById('scanner-coins').textContent = scannerData.totalCoins;

    const topGifter = Object.entries(scannerData.gifters).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('scanner-top-gifter').textContent = topGifter ? topGifter[0] : '-';

    const log = document.getElementById('scanner-log');
    if (!log) return;

    const filter = document.getElementById('scanner-filter')?.value || 'all';
    let filtered = scannerData.gifts;
    if (filter === 'high') filtered = filtered.filter(g => g.coins >= 100);
    else if (filter === 'medium') filtered = filtered.filter(g => g.coins >= 10 && g.coins < 100);
    else if (filter === 'low') filtered = filtered.filter(g => g.coins < 10);

    log.innerHTML = filtered.slice(0, 50).map(g =>
        `<div class="scanner-row">
            <span class="sr-time">${g.time.toLocaleTimeString('tr-TR')}</span>
            <span style="font-size:1.1rem;">🎁</span>
            <span class="sr-user">${g.user}</span>
            <span class="sr-gift">${g.giftName} ${g.count > 1 ? 'x' + g.count : ''}</span>
            <span class="sr-value">${g.coins} 💎</span>
        </div>`
    ).join('') || '<div style="text-align:center;color:#9d8bbf;padding:2rem;">Filtre ile eşleşen hediye yok</div>';
}

function filterScannerLog() { updateScannerUI(); }
function clearScannerLog() {
    scannerData = { gifts: [], totalCoins: 0, gifters: {} };
    updateScannerUI();
    document.getElementById('scanner-log').innerHTML = '<div style="text-align:center;color:#9d8bbf;padding:3rem;"><i class="fas fa-gift" style="font-size:2.5rem;opacity:0.3;margin-bottom:1rem;display:block;"></i><p>Hediyeler temizlendi</p></div>';
}

// Toast notification
function showToast(msg, isError = false) {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:0.8rem 1.5rem;border-radius:12px;font-size:0.9rem;font-weight:700;z-index:9999;animation:fadeIn 0.3s ease;backdrop-filter:blur(12px);
        background:${isError ? 'rgba(239, 68, 68, 0.95)' : 'linear-gradient(135deg, #ff2eb8, #a855f7)'};color:#fff;box-shadow:0 8px 28px ${isError ? 'rgba(239,68,68,0.35)' : 'rgba(255,46,184,0.35)'};`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// navigateTo already handles overlay-gallery and gift-scanner pages

// Hook into TikTok event handler to feed the scanner
const _origHandleTikTokEvent = handleTikTokEvent;
handleTikTokEvent = function(msg) {
    _origHandleTikTokEvent(msg);

    const eventType = msg.type || msg.event || '';
    const eventData = msg.data || msg;

    if (eventType === 'WebcastGiftMessage') {
        const user = eventData?.user?.nickname || eventData?.user?.uniqueId || 'Bilinmeyen';
        // Robust gift-name resolution (same cascade the main feed uses) so
        // the scanner doesn't show "Hediye"/0 on stripped payloads.
        const giftId = eventData?.giftId ?? eventData?.gift?.id ?? null;
        let giftName = eventData?.giftName || eventData?.gift?.name || eventData?.gift?.gift_name || '';
        if ((!giftName || /^Hediye/i.test(giftName)) && giftId != null) {
            giftName = resolveGiftNameFromId(giftId) || giftName;
        }
        if (!giftName && giftId != null && Array.isArray(giftCatalogCache)) {
            const hit = giftCatalogCache.find(g => String(g.id) === String(giftId));
            if (hit) giftName = hit.name;
        }
        if (!giftName) giftName = giftId ? `Hediye #${giftId}` : 'Hediye';
        const giftCount = eventData?.repeatCount || eventData?.count || 1;
        const diamonds = (eventData?.gift?.diamond_count || eventData?.diamondCount || 0) * giftCount;

        addToScanner({ user, giftName, coins: diamonds, count: giftCount });

        // Update scanner status (guarded — element only exists on scanner page)
        const dot = document.getElementById('scanner-status-dot');
        const txt = document.getElementById('scanner-status-text');
        if (dot) dot.style.background = '#ff2eb8';
        if (txt) txt.textContent = 'Aktif';
    }
};

// ==================== END OVERLAY SYSTEM ====================

// ==================== SUBATHON TIMER ====================
// Settings UI helpers — reads/writes the per-gift seconds list and the
// start/pause/reset controls hit the backend endpoints we exposed.

const SUBATHON_PRESETS = {
    basic: { 'Gül': 5, 'Kalp': 15, 'Aslan': 60, 'Roket': 300 },
    full: {
        'Gül': 5, 'Kalp': 15, 'Parmak Kalp': 15, 'Dondurma': 30,
        'Gökkuşağı': 60, 'Kuğu': 75, 'Aslan': 60, 'Spor Araba': 150,
        'Havai Fişek': 300, 'Yat': 600, 'Roket': 900, 'Kale': 1800,
        'Gezegen': 3600, 'Evren': 7200,
    },
};

function renderSubathonGiftRows(map) {
    const wrap = document.getElementById('ov-sub-gift-rows');
    if (!wrap) return;
    // Shared datalist so the gift-name field autocompletes from the real catalog
    // (testers couldn't tell which gift names were valid). Coin value shown as hint.
    const dl = (giftCatalogCache || []).map(g =>
        `<option value="${escapeHtml(g.name)}" label="${g.coins} 💎"></option>`).join('');
    wrap.innerHTML = `<datalist id="subathon-gift-names">${dl}</datalist>`;
    const entries = Object.entries(map || {});
    if (entries.length === 0) {
        wrap.insertAdjacentHTML('beforeend', '<div style="color:#9d8bbf;font-size:0.75rem;font-style:italic;padding:0.5rem 0;">Henüz hediye eklenmedi. Yukarıdaki + ile ekle ya da preset seç.</div>');
        return;
    }
    entries.forEach(([gift, sec], i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:0.4rem;align-items:center;';
        row.innerHTML = `
            <input type="text" class="ov-input" list="subathon-gift-names" placeholder="Hediye adı (yaz/seç)" value="${escapeHtml(gift)}" style="flex:1;" data-sub-key="${i}">
            <input type="number" class="ov-input" placeholder="sn" value="${sec}" min="0" step="1" style="width:90px;" data-sub-val="${i}" title="Bu hediye gelince eklenecek saniye">
            <button class="btn-icon" onclick="removeSubathonGiftRow(${i})" style="background:rgba(255, 46, 184,0.08);color:#ff2eb8;" title="Sil"><i class="fas fa-times"></i></button>
        `;
        wrap.appendChild(row);
    });
}

function readSubathonGiftMap() {
    const wrap = document.getElementById('ov-sub-gift-rows');
    if (!wrap) return {};
    const keys = wrap.querySelectorAll('[data-sub-key]');
    const vals = wrap.querySelectorAll('[data-sub-val]');
    const map = {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i].value.trim();
        const v = parseFloat(vals[i].value);
        if (k && v > 0) map[k] = v;
    }
    return map;
}

function readSubathonConfig() {
    const hh = parseInt(document.getElementById('ov-sub-hh')?.value) || 0;
    const mm = parseInt(document.getElementById('ov-sub-mm')?.value) || 0;
    const ss = parseInt(document.getElementById('ov-sub-ss')?.value) || 0;
    const perCoin = parseFloat(document.getElementById('ov-sub-perCoin')?.value) || 0;
    return {
        startSeconds: hh * 3600 + mm * 60 + ss,
        perCoin,
        perGift: readSubathonGiftMap(),
    };
}

function writeSubathonConfig(config) {
    const total = Number(config?.startSeconds || 3600);
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('ov-sub-hh', hh);
    set('ov-sub-mm', mm);
    set('ov-sub-ss', ss);
    set('ov-sub-perCoin', config?.perCoin || 0);
    renderSubathonGiftRows(config?.perGift || {});
}

function addSubathonGiftRow() {
    const map = readSubathonGiftMap();
    map[''] = 0;
    renderSubathonGiftRows(map);
}

function removeSubathonGiftRow(idx) {
    const map = readSubathonGiftMap();
    const entries = Object.entries(map);
    entries.splice(idx, 1);
    renderSubathonGiftRows(Object.fromEntries(entries));
}

function loadSubathonPreset(name) {
    const preset = SUBATHON_PRESETS[name];
    if (!preset) return;
    const merged = { ...readSubathonGiftMap(), ...preset };
    renderSubathonGiftRows(merged);
    showToast?.(`${name === 'basic' ? 'Temel' : 'Detaylı'} preset yüklendi`);
}

function clearSubathonGifts() {
    renderSubathonGiftRows({});
}

async function subathonControl(action) {
    if (!currentOverlayContext?.overlayDbId) {
        showToast?.('Önce kaydet, sonra kontrol et', true);
        return;
    }
    try {
        const res = await window.api.subathonControl?.(currentOverlayContext.overlayDbId, action);
        if (res?.success) {
            const labels = { start: 'başlatıldı', pause: 'durduruldu', reset: 'sıfırlandı' };
            showToast?.(`Zamanlayıcı ${labels[action] || action}`);
            currentOverlayData = res.data;
        } else {
            showToast?.(res?.error || 'Hata', true);
        }
    } catch (e) {
        showToast?.(e.message, true);
    }
}

// Patch populateOverlayForm to also fill subathon fields when loading a draft
const _origPopulate = populateOverlayForm;
populateOverlayForm = function (ov) {
    _origPopulate(ov);
    if (ov.overlayType === 'subathon') {
        // Load the gift catalog first so the per-gift autocomplete has options.
        loadGiftCatalog().then(() => writeSubathonConfig(ov.config || {}));
    }
};
const _origReset = resetOverlayForm;
resetOverlayForm = function (info) {
    _origReset(info);
    if (info.overlayType === 'subathon') {
        loadGiftCatalog().then(() => writeSubathonConfig({ startSeconds: 3600, perCoin: 0, perGift: {} }));
    }
};
// ==================== END SUBATHON TIMER ====================

// ==================== WHEEL OF ACTIONS ====================
const WHEEL_COLORS = ['#ff2eb8', '#a855f7', '#a855f7', '#ff2eb8', '#ffd000', '#ff7800', '#7c3aed', '#10b981'];
const WHEEL_PRESETS = {
    classic: [
        { label: 'Şarkı söyle', weight: 1 },
        { label: '10 şınav', weight: 1 },
        { label: 'Tezahürat', weight: 1 },
        { label: 'Dans et', weight: 1 },
        { label: 'Komik surat', weight: 1 },
        { label: 'Hikaye anlat', weight: 1 },
    ],
    rewards: [
        { label: 'Takip', weight: 2 },
        { label: 'Beğeni Yağmuru', weight: 2 },
        { label: 'Selam Ver', weight: 3 },
        { label: 'Mesaj Oku', weight: 2 },
        { label: 'Şaka Yap', weight: 1 },
        { label: 'Bonus Puan', weight: 1 },
        { label: 'Soru Sor', weight: 1 },
        { label: 'Büyük İkramiye', weight: 0.3 },
    ],
};

function renderWheelSliceRows(slices) {
    const wrap = document.getElementById('ov-wheel-slices');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!slices || slices.length === 0) {
        wrap.innerHTML = '<div style="color:#9d8bbf;font-size:0.75rem;font-style:italic;padding:0.5rem 0;">Henüz dilim yok. + ile ekle ya da preset seç.</div>';
        return;
    }
    slices.forEach((sl, i) => {
        const color = sl.color || WHEEL_COLORS[i % WHEEL_COLORS.length];
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:0.4rem;align-items:center;';
        row.innerHTML = `
            <input type="color" value="${color}" style="width:38px;height:34px;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer;" data-w-color="${i}">
            <input type="text" class="ov-input" placeholder="Dilim etiketi" value="${escapeHtml(sl.label || '')}" style="flex:1;" data-w-label="${i}">
            <input type="number" class="ov-input" placeholder="ağırlık" value="${sl.weight ?? 1}" min="0" step="0.1" style="width:80px;" data-w-weight="${i}" title="Ağırlık (yüksek = daha sık çıkar)">
            <button class="btn-icon" onclick="removeWheelSlice(${i})" style="background:rgba(255, 46, 184,0.08);color:#ff2eb8;" title="Sil"><i class="fas fa-times"></i></button>
        `;
        wrap.appendChild(row);
    });
}

function readWheelSlices() {
    const wrap = document.getElementById('ov-wheel-slices');
    if (!wrap) return [];
    const labels = wrap.querySelectorAll('[data-w-label]');
    const weights = wrap.querySelectorAll('[data-w-weight]');
    const colors = wrap.querySelectorAll('[data-w-color]');
    const out = [];
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i].value.trim();
        const weight = parseFloat(weights[i].value);
        const color = colors[i].value;
        if (label) out.push({ label, weight: isNaN(weight) ? 1 : weight, color });
    }
    return out;
}

function readWheelConfig() {
    return {
        triggerGift: (document.getElementById('ov-wheel-trigger')?.value || '*').trim(),
        slices: readWheelSlices(),
    };
}

function writeWheelConfig(config) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('ov-wheel-trigger', config?.triggerGift || 'Roket');
    renderWheelSliceRows(config?.slices || []);
}

// Recolor the wheel slices to the active theme's palette (in place, keeps labels/
// weights). Called when the theme/style changes so the wheel actually follows the
// theme — both the preview and the saved (live) overlay.
function recolorWheelSlicesToTheme(theme) {
    const wrap = document.getElementById('ov-wheel-slices');
    if (!wrap) return;
    const pal = wheelPalette(theme);
    wrap.querySelectorAll('[data-w-color]').forEach((inp, i) => { inp.value = pal[i % pal.length]; });
}

function addWheelSlice() {
    const slices = readWheelSlices();
    const pal = wheelPalette(document.getElementById('ov-theme')?.value);
    slices.push({ label: '', weight: 1, color: pal[slices.length % pal.length] });
    renderWheelSliceRows(slices);
}

function removeWheelSlice(idx) {
    const slices = readWheelSlices();
    slices.splice(idx, 1);
    renderWheelSliceRows(slices);
}

function loadWheelPreset(name) {
    const preset = WHEEL_PRESETS[name];
    if (!preset) return;
    const colored = preset.map((sl, i) => ({ ...sl, color: WHEEL_COLORS[i % WHEEL_COLORS.length] }));
    renderWheelSliceRows(colored);
    showToast?.(`${name === 'classic' ? 'Klasik' : 'Ödüller'} preset yüklendi`);
}

function clearWheelSlices() {
    renderWheelSliceRows([]);
}

async function wheelTestSpin() {
    if (!currentOverlayContext?.overlayDbId) {
        showToast?.('Önce kaydet, sonra test et', true);
        return;
    }
    try {
        const res = await window.api.wheelSpin?.(currentOverlayContext.overlayDbId);
        if (res?.success) {
            showToast?.(`🎡 Kazanan: ${res.data?.data?.lastSpin?.winnerLabel || '?'}`);
        } else {
            showToast?.(res?.error || 'Hata', true);
        }
    } catch (e) {
        showToast?.(e.message, true);
    }
}

// Round-trip wheel form alongside subathon
const _origPopulateW = populateOverlayForm;
populateOverlayForm = function (ov) {
    _origPopulateW(ov);
    if (ov.overlayType === 'wheel') writeWheelConfig(ov.config || {});
};
const _origResetW = resetOverlayForm;
resetOverlayForm = function (info) {
    _origResetW(info);
    if (info.overlayType === 'wheel') {
        writeWheelConfig({ triggerGift: 'Roket', slices: [] });
    }
};
// ==================== END WHEEL OF ACTIONS ====================

// ==================== PER-MOD ARM/DISARM UI ====================
function updateModArmButton(modId) {
    const btn = document.getElementById('md-arm-btn');
    const status = document.getElementById('md-arm-status');
    if (!btn || !modId) return;
    const armed = isModArmed(modId);
    if (armed) {
        btn.style.background = 'linear-gradient(135deg,#ff2eb8,#ff5722)';
        btn.style.boxShadow = '0 4px 12px rgba(255, 46, 184,0.3)';
        btn.innerHTML = '<i class="fas fa-stop-circle"></i> <span id="md-arm-btn-label">Bu Modu Durdur</span>';
        if (status) { status.textContent = '● AKTİF'; status.style.color = '#ff2eb8'; }
    } else {
        btn.style.background = 'linear-gradient(135deg,#ff2eb8,#a855f7)';
        btn.style.boxShadow = '0 4px 12px rgba(255, 46, 184,0.25)';
        btn.innerHTML = '<i class="fas fa-play-circle"></i> <span id="md-arm-btn-label">Bu Modu Başlat</span>';
        if (status) { status.textContent = '● Pasif'; status.style.color = '#9d8bbf'; }
    }
}

async function toggleCurrentModArm() {
    if (!currentModDetail?._id) return;
    await toggleSingleMod(currentModDetail._id);
}
// ==================== END PER-MOD ARM/DISARM UI ====================

// ════════════════════════════════════════════════════════════════════════
//  AUTOMATION — Actions & Events UI (talks to /api/automation)
// ════════════════════════════════════════════════════════════════════════
let _autoActions = [];
let _autoRules = [];
let _autoEditingRule = null;   // rule being edited (or null = new)
let _autoEditingAction = null; // action being edited (or null = new)
let _autoRuleGift = { name: '', icon: '' };

async function autoApi(path, opts = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BACKEND_URL}/api/automation${path}`, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

// ═══════════════════ KANAL PUANI (Loyalty) ═══════════════════
async function loyApi(path, opts = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BACKEND_URL}/api/loyalty${path}`, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}
async function initLoyalty() {
    try {
        const cfg = await loyApi('/config');
        document.getElementById('loy-enabled').checked = cfg.enabled !== false;
        document.getElementById('loy-name').value = cfg.pointsName || 'Puan';
        const e = cfg.earn || {};
        document.getElementById('loy-perChat').value = e.perChat ?? 2;
        document.getElementById('loy-perLike').value = e.perLike ?? 1;
        document.getElementById('loy-perFollow').value = e.perFollow ?? 50;
        document.getElementById('loy-perShare').value = e.perShare ?? 20;
        document.getElementById('loy-perGiftCoin').value = e.perGiftCoin ?? 1;
    } catch (err) { showToast('Puan ayarları yüklenemedi: ' + err.message, true); }
    await loadLoyaltyLeaderboard();
}
async function saveLoyaltyConfig() {
    try {
        const body = {
            enabled: document.getElementById('loy-enabled').checked,
            pointsName: document.getElementById('loy-name').value.trim() || 'Puan',
            earn: {
                perChat: +document.getElementById('loy-perChat').value || 0,
                perLike: +document.getElementById('loy-perLike').value || 0,
                perFollow: +document.getElementById('loy-perFollow').value || 0,
                perShare: +document.getElementById('loy-perShare').value || 0,
                perGiftCoin: +document.getElementById('loy-perGiftCoin').value || 0,
            },
        };
        await loyApi('/config', { method: 'PUT', body });
        showToast('Puan ayarları kaydedildi ✓');
    } catch (err) { showToast('Kaydedilemedi: ' + err.message, true); }
}
async function loadLoyaltyLeaderboard() {
    const el = document.getElementById('loy-leaderboard');
    if (!el) return;
    try {
        const [lb, stats] = await Promise.all([
            loyApi('/leaderboard?limit=25'),
            loyApi('/stats').catch(() => ({ viewers: 0, totalPoints: 0 })),
        ]);
        const sv = document.getElementById('loy-stat-viewers'); if (sv) sv.textContent = (stats.viewers || 0).toLocaleString('tr-TR');
        const st = document.getElementById('loy-stat-total'); if (st) st.textContent = (stats.totalPoints || 0).toLocaleString('tr-TR');
        const items = lb.items || [];
        if (!items.length) { el.innerHTML = '<div class="auto-empty" style="padding:2rem;"><i class="fas fa-gem"></i>Henüz puan kazanan izleyici yok.</div>'; return; }
        const max = items[0]?.points || 1;
        const medals = ['👑', '🥈', '🥉'];
        el.innerHTML = items.map((it, i) => `<div class="loy-lb-row"><div class="loy-lb-bar" style="width:${Math.max(6, (it.points / max) * 100)}%"></div><div class="loy-lb-rank">${medals[i] || (i + 1)}</div><div class="loy-lb-name">${escapeHtml(it.nickname || it.viewer)}</div><div class="loy-lb-pts">${(it.points || 0).toLocaleString('tr-TR')}</div></div>`).join('');
    } catch (err) { el.innerHTML = `<div class="auto-empty" style="padding:2rem;color:#ef4444;">Yüklenemedi: ${escapeHtml(err.message)}</div>`; }
}
// Live channel-points updates from the backend socket (via main bridge):
// refresh the leaderboard if the page is open, and toast redemption results.
let _loyRefreshTimer = null;
if (window.api?.onPointsUpdate) {
    window.api.onPointsUpdate(() => {
        if (!document.getElementById('loyalty-page')?.classList.contains('active')) return;
        clearTimeout(_loyRefreshTimer);
        _loyRefreshTimer = setTimeout(() => loadLoyaltyLeaderboard().catch(() => {}), 1200);
    });
}
if (window.api?.onRedeemResult) {
    window.api.onRedeemResult((d) => {
        if (d?.ok) showToast(`🎁 ${d.viewer} → "${d.rule}" (${d.cost} puan) kullandı`);
        else showToast(`⚠️ ${d.viewer}: "${d.rule}" için yetersiz puan`, true);
    });
}

async function adjustLoyalty() {
    const viewer = document.getElementById('loy-adj-viewer').value.trim();
    const delta = parseInt(document.getElementById('loy-adj-delta').value) || 0;
    if (!viewer || !delta) return showToast('İzleyici adı ve puan miktarı gerekli', true);
    try {
        await loyApi('/adjust', { method: 'POST', body: { viewer, delta } });
        document.getElementById('loy-adj-delta').value = '';
        showToast(`${viewer}: ${delta > 0 ? '+' : ''}${delta} puan`);
        await loadLoyaltyLeaderboard();
    } catch (err) { showToast('Hata: ' + err.message, true); }
}

async function initAutomation() {
    if (!giftCatalogCache.length) { try { await loadGiftCatalog(); } catch {} }
    await reloadAutomation();
}

async function reloadAutomation() {
    try {
        const [actions, rules] = await Promise.all([
            autoApi('/actions'),
            autoApi('/rules'),
        ]);
        _autoActions = actions || [];
        _autoRules = rules || [];
        renderAutoStats();
        renderRulesList();
        renderActionsList();
    } catch (e) {
        const list = document.getElementById('auto-rules-list');
        if (list) list.innerHTML = `<div class="auto-empty">Yüklenemedi: ${escapeHtml(e.message)}<br><span style="font-size:0.75rem;">Giriş yaptığından ve backend'in açık olduğundan emin ol.</span></div>`;
    }
}

function renderAutoStats() {
    const fireTotal = _autoRules.reduce((n, r) => n + (r.stats?.fireCount || 0), 0);
    const active = _autoRules.filter(r => r.enabled).length;
    setText('auto-rule-count', _autoRules.length);
    setText('auto-action-count', _autoActions.length);
    setText('auto-fire-count', fireTotal.toLocaleString('tr-TR'));
    setText('auto-active-count', active);
}

function switchAutoTab(tab) {
    document.querySelectorAll('.auto-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.auto-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`auto-panel-${tab}`)?.classList.add('active');
    if (tab === 'migrate') renderMigratePreview();
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const TRIGGER_META = {
    gift: { icon: '🎁', label: 'Hediye' }, like: { icon: '❤️', label: 'Beğeni' },
    follow: { icon: '➕', label: 'Takip' }, share: { icon: '🔁', label: 'Paylaşım' },
    subscribe: { icon: '⭐', label: 'Abone' }, chat: { icon: '💬', label: 'Sohbet' },
    command: { icon: '⌨️', label: 'Komut' }, member: { icon: '👋', label: 'Katılma' },
    any: { icon: '✨', label: 'Herhangi' },
};
const ACTION_META = {
    'overlay-alert': { icon: '🔔', label: 'Ekran Uyarısı' }, sound: { icon: '🔊', label: 'Ses' },
    tts: { icon: '🗣️', label: 'TTS' }, confetti: { icon: '🎉', label: 'Konfeti' },
    media: { icon: '🎬', label: 'Medya' }, 'wheel-spin': { icon: '🎡', label: 'Çark' },
    keyboard: { icon: '⌨️', label: 'Tuş' }, mouse: { icon: '🖱️', label: 'Fare' },
    text: { icon: '📝', label: 'Metin' }, launch: { icon: '🚀', label: 'Çalıştır' },
    points: { icon: '💎', label: 'Puan' }, minecraft: { icon: '🟩', label: 'Minecraft' },
};
function actionById(id) { return _autoActions.find(a => String(a._id) === String(id)); }

// ─── RULES list ──────────────────────────────────────────────────────────
function renderRulesList() {
    const el = document.getElementById('auto-rules-list');
    if (!el) return;
    if (!_autoRules.length) {
        el.innerHTML = `<div class="auto-empty"><i class="fas fa-bolt"></i>Henüz kural yok.<br><span style="font-size:0.8rem;">"Yeni Kural" ile ilk otomasyonunu kur — örn. <b>Gül gelince F2 bas</b>.</span></div>`;
        return;
    }
    el.innerHTML = _autoRules.map(r => {
        const tm = TRIGGER_META[r.trigger?.type] || { icon: '⚡', label: r.trigger?.type };
        let triggerLabel = `${tm.icon} ${tm.label}`;
        if (r.trigger?.type === 'gift' && r.trigger.giftName) triggerLabel += `: ${escapeHtml(r.trigger.giftName)}`;
        if (r.trigger?.type === 'command') triggerLabel += `: ${escapeHtml(r.trigger.commandPrefix || '!')}${escapeHtml(r.trigger.command || '')}`;
        const actionPills = (r.actionIds || []).map(a => {
            const ao = (typeof a === 'object') ? a : actionById(a);
            const am = ACTION_META[ao?.type] || { icon: '•', label: ao?.type || '?' };
            return `<span class="auto-flow-pill auto-flow-action">${am.icon} ${escapeHtml(ao?.name || am.label)}</span>`;
        }).join('<span class="auto-flow-arrow">+</span>');
        const cdBits = [];
        if (r.cooldown?.globalMs) cdBits.push(`⏱ ${r.cooldown.globalMs / 1000}sn`);
        if (r.cooldown?.perUserMs) cdBits.push(`👤 ${r.cooldown.perUserMs / 1000}sn`);
        if (r.combo === 'perGift') cdBits.push('🔁 her hediye');
        if (r.roles && r.roles.length && !r.roles.includes('everyone')) cdBits.push('🔒 ' + r.roles.join(','));
        return `
        <div class="auto-card ${r.enabled ? '' : 'disabled'}">
            <div class="auto-card-head">
                <label class="auto-toggle"><input type="checkbox" ${r.enabled ? 'checked' : ''} onchange="toggleRule('${r._id}', this.checked)"><span class="slider"></span></label>
                <div class="auto-card-title">${escapeHtml(r.name)}</div>
                <div class="auto-card-actions">
                    <button class="auto-icon-btn test" onclick="testRuleById('${r._id}')" title="Test et"><i class="fas fa-vial"></i></button>
                    <button class="auto-icon-btn" onclick="editRuleById('${r._id}')" title="Düzenle"><i class="fas fa-pen"></i></button>
                    <button class="auto-icon-btn danger" onclick="deleteRuleById('${r._id}')" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="auto-card-flow">
                <span class="auto-flow-pill auto-flow-trigger">${triggerLabel}</span>
                <span class="auto-flow-arrow"><i class="fas fa-arrow-right"></i></span>
                ${actionPills || '<span style="color:#7a6e94;font-size:0.78rem;">aksiyon yok</span>'}
            </div>
            ${cdBits.length ? `<div style="margin-top:0.5rem;font-size:0.72rem;color:#7a6e94;display:flex;gap:0.6rem;flex-wrap:wrap;">${cdBits.map(b => `<span>${b}</span>`).join('')}${r.stats?.fireCount ? `<span style="margin-left:auto;color:#a855f7;">🔥 ${r.stats.fireCount} kez</span>` : ''}</div>` : (r.stats?.fireCount ? `<div style="margin-top:0.4rem;font-size:0.72rem;color:#a855f7;text-align:right;">🔥 ${r.stats.fireCount} kez</div>` : '')}
        </div>`;
    }).join('');
}

// ─── ACTIONS list ────────────────────────────────────────────────────────
function renderActionsList() {
    const el = document.getElementById('auto-actions-list');
    if (!el) return;
    if (!_autoActions.length) {
        el.innerHTML = `<div class="auto-empty"><i class="fas fa-cubes"></i>Henüz aksiyon yok.<br><span style="font-size:0.8rem;">"Yeni Aksiyon" ile bir tane oluştur — kurallar bunları çalıştırır.</span></div>`;
        return;
    }
    el.innerHTML = _autoActions.map(a => {
        const am = ACTION_META[a.type] || { icon: '•', label: a.type };
        const usedBy = _autoRules.filter(r => (r.actionIds || []).some(x => String((typeof x === 'object') ? x._id : x) === String(a._id))).length;
        let detail = '';
        if (a.type === 'keyboard') detail = a.config?.value || '';
        else if (a.type === 'overlay-alert') detail = a.config?.title || a.config?.message || '';
        else if (a.type === 'sound') detail = a.config?.preset || (a.config?.mp3Url ? 'MP3' : '');
        else if (a.type === 'tts') detail = a.config?.text || '';
        else if (a.type === 'launch') detail = a.config?.command || '';
        else if (a.type === 'minecraft') detail = a.config?.command || '';
        else if (a.type === 'points') detail = `+${a.config?.amount || 0}`;
        return `
        <div class="auto-card">
            <div class="auto-card-head">
                <div style="width:36px;height:36px;border-radius:9px;background:rgba(168,85,247,0.12);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">${am.icon}</div>
                <div style="flex:1;min-width:0;">
                    <div class="auto-card-title">${escapeHtml(a.name)}</div>
                    <div style="font-size:0.74rem;color:#9d8bbf;margin-top:0.1rem;">${am.label}${detail ? ' · ' + escapeHtml(String(detail).slice(0, 40)) : ''}</div>
                </div>
                <div class="auto-card-actions">
                    <span style="font-size:0.68rem;color:#7a6e94;align-self:center;margin-right:0.3rem;">${usedBy} kural</span>
                    <button class="auto-icon-btn test" onclick="testActionById('${a._id}')" title="Test et"><i class="fas fa-vial"></i></button>
                    <button class="auto-icon-btn" onclick="editActionById('${a._id}')" title="Düzenle"><i class="fas fa-pen"></i></button>
                    <button class="auto-icon-btn danger" onclick="deleteActionById('${a._id}')" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── RULE editor ─────────────────────────────────────────────────────────
function openRuleEditor(rule) {
    _autoEditingRule = rule ? JSON.parse(JSON.stringify(rule)) : null;
    document.getElementById('rule-modal-title').innerHTML = rule
        ? '<i class="fas fa-bolt" style="color:#ff2eb8;"></i> Kuralı Düzenle'
        : '<i class="fas fa-bolt" style="color:#ff2eb8;"></i> Yeni Kural';
    document.getElementById('rule-modal-alert').style.display = 'none';
    document.getElementById('rule-name').value = rule?.name || '';
    document.getElementById('rule-trigger-type').value = rule?.trigger?.type || 'gift';
    _autoRuleGift = { name: rule?.trigger?.giftName || '', icon: '' };
    document.getElementById('rule-gift-name').value = _autoRuleGift.name;
    document.getElementById('rule-command-prefix').value = rule?.trigger?.commandPrefix || '!';
    document.getElementById('rule-command').value = rule?.trigger?.command || '';
    document.getElementById('rule-cd-global').value = (rule?.cooldown?.globalMs || 0) / 1000;
    document.getElementById('rule-cd-user').value = (rule?.cooldown?.perUserMs || 0) / 1000;
    document.getElementById('rule-combo').value = rule?.combo || 'once';
    const pcEl = document.getElementById('rule-points-cost'); if (pcEl) pcEl.value = rule?.pointsCost || 0;
    // roles
    const roles = rule?.roles && rule.roles.length ? rule.roles : ['everyone'];
    document.querySelectorAll('#rule-roles input').forEach(cb => { cb.checked = roles.includes(cb.value); });
    // conditions
    renderRuleConditions(rule?.conditions || []);
    // actions picker
    renderRuleActionPicker(rule?.actionIds || []);
    onRuleTriggerTypeChange();
    document.getElementById('rule-test-btn').style.display = rule ? '' : 'none';
    document.getElementById('rule-modal').classList.add('active');
}
function closeRuleEditor() { document.getElementById('rule-modal').classList.remove('active'); _autoEditingRule = null; }

function onRuleTriggerTypeChange() {
    const t = document.getElementById('rule-trigger-type').value;
    document.getElementById('rule-gift-row').style.display = t === 'gift' ? '' : 'none';
    document.getElementById('rule-command-row').style.display = t === 'command' ? '' : 'none';
    document.getElementById('rule-combo-row').style.display = t === 'gift' ? '' : 'none';
}
function pickRuleGift() {
    openGiftPickerFor((name, icon) => {
        _autoRuleGift = { name, icon };
        document.getElementById('rule-gift-name').value = name;
    });
}
function clearRuleGift() { _autoRuleGift = { name: '', icon: '' }; document.getElementById('rule-gift-name').value = ''; }

const COND_FIELDS = [['coins', 'Coin değeri'], ['repeatCount', 'Tekrar sayısı'], ['giftName', 'Hediye adı'], ['likeCount', 'Beğeni sayısı'], ['comment', 'Mesaj']];
const COND_OPS = [['>=', '≥'], ['<=', '≤'], ['>', '>'], ['<', '<'], ['==', '='], ['!=', '≠'], ['includes', 'içerir'], ['startsWith', 'başlar'], ['regex', 'regex']];
function renderRuleConditions(conds) {
    const wrap = document.getElementById('rule-conditions');
    wrap.innerHTML = '';
    (conds || []).forEach(c => addRuleCondition(c));
}
function addRuleCondition(c) {
    const wrap = document.getElementById('rule-conditions');
    const row = document.createElement('div');
    row.className = 'auto-cond-row';
    row.innerHTML = `
        <select class="cond-field">${COND_FIELDS.map(([v, l]) => `<option value="${v}" ${c?.field === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select class="cond-op">${COND_OPS.map(([v, l]) => `<option value="${v}" ${c?.op === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input class="cond-val" placeholder="değer" value="${c ? escapeHtml(String(c.value ?? '')) : ''}">
        <button class="auto-icon-btn danger" onclick="this.parentElement.remove()" title="Kaldır">✕</button>`;
    wrap.appendChild(row);
}
function collectRuleConditions() {
    return [...document.querySelectorAll('#rule-conditions .auto-cond-row')].map(row => ({
        field: row.querySelector('.cond-field').value,
        op: row.querySelector('.cond-op').value,
        value: row.querySelector('.cond-val').value,
    })).filter(c => c.value !== '' || c.op === 'regex');
}

function renderRuleActionPicker(selectedIds) {
    const wrap = document.getElementById('rule-action-picker');
    const sel = (selectedIds || []).map(x => String((typeof x === 'object') ? x._id : x));
    if (!_autoActions.length) {
        wrap.innerHTML = `<div style="color:#7a6e94;font-size:0.8rem;text-align:center;padding:0.6rem;">Henüz aksiyon yok. Önce "Yeni Aksiyon" oluştur.</div>`;
        return;
    }
    wrap.innerHTML = _autoActions.map(a => {
        const am = ACTION_META[a.type] || { icon: '•', label: a.type };
        return `<label class="auto-action-opt">
            <input type="checkbox" value="${a._id}" ${sel.includes(String(a._id)) ? 'checked' : ''}>
            <span>${am.icon}</span><span>${escapeHtml(a.name)}</span>
            <span class="aopt-type">${am.label}</span>
        </label>`;
    }).join('');
}
function collectRuleActionIds() {
    return [...document.querySelectorAll('#rule-action-picker input:checked')].map(i => i.value);
}

function ruleAlert(msg, ok) {
    const el = document.getElementById('rule-modal-alert');
    el.textContent = msg; el.className = 'auto-alert' + (ok ? ' ok' : ''); el.style.display = 'block';
    if (ok) setTimeout(() => { if (el.textContent === msg) el.style.display = 'none'; }, 2500);
}
function buildRulePayload() {
    const type = document.getElementById('rule-trigger-type').value;
    const roles = [...document.querySelectorAll('#rule-roles input:checked')].map(i => i.value);
    const trigger = { type };
    if (type === 'gift') trigger.giftName = _autoRuleGift.name || '';
    if (type === 'command') { trigger.command = document.getElementById('rule-command').value.trim(); trigger.commandPrefix = document.getElementById('rule-command-prefix').value.trim() || '!'; }
    return {
        name: document.getElementById('rule-name').value.trim(),
        trigger,
        conditions: collectRuleConditions(),
        roles: roles.length ? roles : ['everyone'],
        cooldown: {
            globalMs: Math.round((parseFloat(document.getElementById('rule-cd-global').value) || 0) * 1000),
            perUserMs: Math.round((parseFloat(document.getElementById('rule-cd-user').value) || 0) * 1000),
        },
        combo: document.getElementById('rule-combo').value,
        pointsCost: Math.max(0, parseInt(document.getElementById('rule-points-cost')?.value) || 0),
        actionIds: collectRuleActionIds(),
    };
}
async function saveRule() {
    const payload = buildRulePayload();
    if (!payload.name) return ruleAlert('Kural adı gerekli.');
    if (!payload.actionIds.length) return ruleAlert('En az bir aksiyon seç.');
    try {
        if (_autoEditingRule?._id) {
            await autoApi(`/rules/${_autoEditingRule._id}`, { method: 'PUT', body: payload });
        } else {
            const created = await autoApi('/rules', { method: 'POST', body: payload });
            _autoEditingRule = created;
            document.getElementById('rule-test-btn').style.display = '';
        }
        await reloadAutomation();
        ruleAlert('Kaydedildi ✓', true);
        showToast('Kural kaydedildi');
    } catch (e) { ruleAlert('Hata: ' + e.message); }
}
async function testCurrentRule() {
    if (!_autoEditingRule?._id) return;
    // Build a synthetic event matching this rule's trigger.
    const r = _autoRules.find(x => String(x._id) === String(_autoEditingRule._id)) || _autoEditingRule;
    await fireTestEventForRule(r);
}
async function testRuleById(id) { const r = _autoRules.find(x => String(x._id) === String(id)); if (r) await fireTestEventForRule(r); }
async function fireTestEventForRule(r) {
    const t = r.trigger || {};
    const ev = { eventType: t.type === 'command' ? 'chat' : (t.type === 'any' ? 'gift' : t.type), username: 'TestKullanıcı', nickname: 'TestKullanıcı', count: r.combo === 'perGift' ? 3 : 1 };
    if (t.type === 'gift') { ev.giftName = t.giftName || 'Gül'; ev.diamondCount = 100; }
    if (t.type === 'command') ev.comment = `${t.commandPrefix || '!'}${t.command || ''} test`;
    if (t.type === 'like') ev.likeCount = 10;
    try {
        const res = await autoApi('/test-event', { method: 'POST', body: ev });
        showToast(`🧪 Test: ${res.matched} kural eşleşti, ${res.fired} aksiyon ateşlendi`);
        setTimeout(reloadAutomation, 400);
    } catch (e) { showToast('Test hatası: ' + e.message, true); }
}
async function toggleRule(id, enabled) {
    try { await autoApi(`/rules/${id}`, { method: 'PUT', body: { enabled } }); const r = _autoRules.find(x => String(x._id) === String(id)); if (r) r.enabled = enabled; renderAutoStats(); }
    catch (e) { showToast('Hata: ' + e.message, true); }
}
function editRuleById(id) { const r = _autoRules.find(x => String(x._id) === String(id)); if (r) openRuleEditor(r); }
async function deleteRuleById(id) {
    if (!confirm('Bu kural silinsin mi?')) return;
    try { await autoApi(`/rules/${id}`, { method: 'DELETE' }); await reloadAutomation(); showToast('Kural silindi'); }
    catch (e) { showToast('Hata: ' + e.message, true); }
}

// ─── ACTION editor ───────────────────────────────────────────────────────
function openActionEditor(action) {
    _autoEditingAction = action ? JSON.parse(JSON.stringify(action)) : null;
    document.getElementById('action-modal-title').innerHTML = action
        ? '<i class="fas fa-cubes" style="color:#a855f7;"></i> Aksiyonu Düzenle'
        : '<i class="fas fa-cubes" style="color:#a855f7;"></i> Yeni Aksiyon';
    document.getElementById('action-modal-alert').style.display = 'none';
    document.getElementById('action-name').value = action?.name || '';
    document.getElementById('action-type').value = action?.type || 'overlay-alert';
    renderActionConfig();
    document.getElementById('action-test-btn').style.display = action ? '' : 'none';
    document.getElementById('action-modal').classList.add('active');
}
function closeActionEditor() { document.getElementById('action-modal').classList.remove('active'); _autoEditingAction = null; }

// File-based media for actions: read the chosen image/video as a data-URI and put
// it into the media field (embedded → works in the OBS overlay without a server).
// Capped so the action config + per-event socket payload stay reasonable.
function acPickMediaFile(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const MAX = 4 * 1024 * 1024;
    if (f.size > MAX) { showToast('Dosya çok büyük (max 4MB). Büyük videolar için URL kullanın.', true); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
        const el = document.getElementById('ac-mediaUrl');
        if (el) el.value = reader.result;
        const mt = document.getElementById('ac-mediaType');
        if (mt) mt.value = f.type.startsWith('video/') ? 'video' : (f.type === 'image/gif' ? 'gif' : 'image');
        showToast('Dosya eklendi: ' + f.name);
    };
    reader.onerror = () => showToast('Dosya okunamadı', true);
    reader.readAsDataURL(f);
}
window.acPickMediaFile = acPickMediaFile;

function renderActionConfig() {
    const type = document.getElementById('action-type').value;
    const c = _autoEditingAction?.config || {};
    const wrap = document.getElementById('action-config');
    const fld = (label, html, hint) => `<div class="auto-field"><label>${label}</label>${html}${hint ? `<div class="auto-hint">${hint}</div>` : ''}</div>`;
    let html = '';
    if (type === 'overlay-alert') {
        html = fld('Başlık', `<input id="ac-title" class="auto-input" value="${escapeHtml(c.title || '')}" placeholder="%username% %giftName% gönderdi!">`, 'Yer tutucular: %username% %giftName% %repeatCount% %coins%')
            + fld('Alt Yazı', `<input id="ac-message" class="auto-input" value="${escapeHtml(c.message || '')}" placeholder="Teşekkürler!">`)
            + fld('Görsel/Video (ops.)', `<div style="display:flex;gap:0.4rem;align-items:center;"><input id="ac-mediaUrl" class="auto-input" value="${escapeHtml(c.mediaUrl || '')}" placeholder="https://... veya dosya seç →" style="flex:1;min-width:0;"><input type="file" id="ac-mediaFile" accept="image/*,video/*" style="display:none;" onchange="acPickMediaFile(this)"><button type="button" class="btn-secondary" onclick="document.getElementById('ac-mediaFile').click()" style="white-space:nowrap;padding:0.45rem 0.7rem;"><i class="fas fa-folder-open"></i> Dosya</button></div>`, 'URL yapıştır ya da bilgisayardan dosya seç (görsel/küçük video, ≤4MB — yayında gömülü gösterilir).')
            + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">`
            + fld('Süre (sn)', `<input id="ac-duration" type="number" class="auto-input" value="${(c.durationMs || 4000) / 1000}" min="1" step="0.5">`)
            + fld('Animasyon', `<select id="ac-animation" class="auto-input"><option value="pop" ${c.animation === 'pop' ? 'selected' : ''}>Pop</option><option value="slide" ${c.animation === 'slide' ? 'selected' : ''}>Kayma</option><option value="bounce" ${c.animation === 'bounce' ? 'selected' : ''}>Zıplama</option></select>`)
            + `</div>`
            + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">`
            + fld('Vurgu Rengi', `<input id="ac-accent" type="color" class="auto-input" value="${c.accentColor || '#ff2eb8'}" style="height:42px;padding:4px;">`)
            + fld('Yazı Rengi', `<input id="ac-textcolor" type="color" class="auto-input" value="${c.textColor || '#ffffff'}" style="height:42px;padding:4px;">`)
            + `</div>`;
    } else if (type === 'sound') {
        html = fld('Hazır Ses', `<select id="ac-preset" class="auto-input"><option value="">— yok —</option><option value="coin" ${c.preset === 'coin' ? 'selected' : ''}>Coin</option><option value="airhorn" ${c.preset === 'airhorn' ? 'selected' : ''}>Korna</option><option value="applause" ${c.preset === 'applause' ? 'selected' : ''}>Alkış</option><option value="bell" ${c.preset === 'bell' ? 'selected' : ''}>Zil</option><option value="ding" ${c.preset === 'ding' ? 'selected' : ''}>Ding</option></select>`)
            + fld('veya MP3 URL', `<input id="ac-mp3" class="auto-input" value="${escapeHtml(c.mp3Url || '')}" placeholder="https://...mp3">`)
            + fld('Ses Düzeyi', `<input id="ac-volume" type="range" class="auto-input" min="0" max="100" value="${(c.volume ?? 0.8) * 100}" style="padding:0;">`);
    } else if (type === 'tts') {
        html = fld('Okunacak Metin', `<input id="ac-text" class="auto-input" value="${escapeHtml(c.text || '')}" placeholder="%username% diyor ki: %comment%">`, 'Yer tutucular: %username% %comment% %giftName%')
            + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">`
            + fld('Hız', `<input id="ac-rate" type="number" class="auto-input" value="${c.rate ?? 1}" min="0.5" max="2" step="0.1">`)
            + fld('Ton (pitch)', `<input id="ac-pitch" type="number" class="auto-input" value="${c.pitch ?? 1}" min="0" max="2" step="0.1">`)
            + `</div>`
            + fld('Ses (dil/ses adı, ops.)', `<input id="ac-voice" class="auto-input" value="${escapeHtml(c.voice || '')}" placeholder="tr-TR">`);
    } else if (type === 'keyboard') {
        html = fld('Tuş', `<input id="ac-value" class="auto-input" value="${escapeHtml(c.value || '')}" placeholder="Tıkla ve tuşa bas (örn. Shift+F2)" readonly onkeydown="captureActionKey(event)" onclick="this.focus()">`, 'Kutuya tıkla ve istediğin tuş kombinasyonuna bas.')
            + fld('Tekrar Sayısı', `<input id="ac-repeat" type="number" class="auto-input" value="${c.repeatCount || 1}" min="1" max="20">`);
    } else if (type === 'mouse') {
        html = fld('Tıklama', `<select id="ac-value" class="auto-input"><option value="leftclick" ${c.value === 'leftclick' ? 'selected' : ''}>Sol Tık</option><option value="rightclick" ${c.value === 'rightclick' ? 'selected' : ''}>Sağ Tık</option><option value="middleclick" ${c.value === 'middleclick' ? 'selected' : ''}>Orta Tık</option></select>`);
    } else if (type === 'text') {
        html = fld('Yazılacak Metin', `<input id="ac-value" class="auto-input" value="${escapeHtml(c.value || '')}" placeholder="merhaba">`);
    } else if (type === 'launch') {
        html = fld('Komut / Yol', `<input id="ac-command" class="auto-input" value="${escapeHtml(c.command || '')}" placeholder="steam://run/271590 ya da C:\\Game\\game.exe">`, 'Steam URI, .exe, .bat ya da düz komut.');
    } else if (type === 'points') {
        html = fld('Verilecek Puan', `<input id="ac-amount" type="number" class="auto-input" value="${c.amount || 10}" min="1">`, 'Tetikleyen izleyiciye eklenir.');
    } else if (type === 'confetti') {
        html = fld('Yoğunluk', `<input id="ac-intensity" type="range" class="auto-input" min="1" max="10" value="${c.intensity || 5}" style="padding:0;">`)
            + fld('Renkler (virgülle)', `<input id="ac-colors" class="auto-input" value="${escapeHtml((c.colors || ['#ff2eb8', '#a855f7', '#22d3ee']).join(','))}">`);
    } else if (type === 'media') {
        html = fld('Medya (URL veya dosya)', `<div style="display:flex;gap:0.4rem;align-items:center;"><input id="ac-mediaUrl" class="auto-input" value="${escapeHtml(c.mediaUrl || '')}" placeholder="https://...mp4 / .gif veya dosya seç →" style="flex:1;min-width:0;"><input type="file" id="ac-mediaFile" accept="image/*,video/*" style="display:none;" onchange="acPickMediaFile(this)"><button type="button" class="btn-secondary" onclick="document.getElementById('ac-mediaFile').click()" style="white-space:nowrap;padding:0.45rem 0.7rem;"><i class="fas fa-folder-open"></i> Dosya</button></div>`, 'Bilgisayardan görsel/küçük video seç (≤4MB, gömülü) ya da URL gir.')
            + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">`
            + fld('Tip', `<select id="ac-mediaType" class="auto-input"><option value="video" ${c.mediaType === 'video' ? 'selected' : ''}>Video</option><option value="gif" ${c.mediaType === 'gif' ? 'selected' : ''}>GIF</option><option value="image" ${c.mediaType === 'image' ? 'selected' : ''}>Resim</option></select>`)
            + fld('Süre (sn)', `<input id="ac-duration" type="number" class="auto-input" value="${(c.durationMs || 5000) / 1000}" min="1" step="0.5">`)
            + `</div>`;
    } else if (type === 'wheel-spin') {
        html = `<div class="auto-hint" style="padding:0.5rem;">Aktif Şans Çarkı overlay'ini çevirir. Çarkı "Etkileşimli Katmanlar → Şans Çarkı"ndan oluştur.</div>`;
    } else if (type === 'minecraft') {
        const presets = [
            ['💥 TNT yağmuru', 'execute at @r run summon minecraft:tnt ~ ~12 ~'],
            ['🧨 Creeper', 'execute at @r run summon minecraft:creeper ~ ~ ~'],
            ['💎 Elmas ver', 'give @a minecraft:diamond 1'],
            ['⚡ Yıldırım', 'execute at @r run summon minecraft:lightning_bolt ~ ~ ~'],
            ['🐔 Tavuk ordusu', 'execute at @r run summon minecraft:chicken ~ ~3 ~'],
            ['🌙 Gece', 'time set night'],
            ['☀️ Gündüz', 'time set day'],
            ['🧟 Zombi sürüsü', 'execute at @r run summon minecraft:zombie ~ ~ ~'],
            ['🚀 Fırlat', 'execute at @r run summon minecraft:tnt ~ ~ ~ {Motion:[0.0,2.0,0.0]}'],
            ['🏃 Hız', 'effect give @a minecraft:speed 30 2'],
            ['📢 Duyuru', 'say §d%username%§r teşekkürler! 🎉'],
        ];
        html = fld('Minecraft Komutu', `<textarea id="ac-mc-command" class="auto-input" rows="2" style="font-family:'JetBrains Mono',monospace;resize:vertical;line-height:1.4;" placeholder="execute at @r run summon creeper ~ ~ ~">${escapeHtml(c.command || '')}</textarea>`, 'Yer tutucular: %username% %giftName% %repeatCount% %coins% · Hedef: @r rastgele oyuncu, @a herkes, @p en yakın')
            + `<div style="margin-top:0.5rem;"><div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:0.4rem;font-weight:700;">⚡ Hızlı ekle:</div><div style="display:flex;flex-wrap:wrap;gap:0.4rem;">`
            + presets.map(([lbl, cmd]) => `<button type="button" class="btn-icon" data-cmd="${escapeHtml(cmd)}" onclick="mcInsertCmd(this)" style="font-size:0.72rem;background:rgba(91,168,86,0.12);border-color:rgba(91,168,86,0.3);color:#7ec97a;">${lbl}</button>`).join('')
            + `</div></div>`
            + `<div class="auto-hint" style="margin-top:0.6rem;background:rgba(91,168,86,0.08);border:1px solid rgba(91,168,86,0.2);border-radius:8px;padding:0.55rem 0.7rem;">🟩 Komut <b>SeliGames Minecraft sunucusunda</b> (RCON) çalışır. Oyuna katıl: <b style="color:#7ec97a;">187.124.29.94:25565</b> — her sürümden bağlanabilirsin (ViaVersion). <b>@r / @a</b> hedefli komutlar için oyunda en az bir oyuncu olmalı (yoksa sessizce hiçbir şey olmaz); <b>summon / time / weather / say</b> oyuncusuz da çalışır. (Güvenlik: op/ban/stop gibi komutlar engellidir.)</div>`;
    }
    wrap.innerHTML = html;
}
function mcInsertCmd(btn) {
    const t = document.getElementById('ac-mc-command');
    if (t) { t.value = btn.dataset.cmd || ''; t.focus(); }
}
function captureActionKey(e) {
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Cmd');
    const k = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(k)) return;
    parts.push(k.length === 1 ? k.toUpperCase() : k);
    e.target.value = parts.join('+');
}
function actionAlert(msg, ok) {
    const el = document.getElementById('action-modal-alert');
    el.textContent = msg; el.className = 'auto-alert' + (ok ? ' ok' : ''); el.style.display = 'block';
    if (ok) setTimeout(() => { if (el.textContent === msg) el.style.display = 'none'; }, 2500);
}
function collectActionConfig() {
    const type = document.getElementById('action-type').value;
    const v = (id) => document.getElementById(id)?.value;
    if (type === 'overlay-alert') return { title: v('ac-title'), message: v('ac-message'), mediaUrl: v('ac-mediaUrl'), durationMs: Math.round((parseFloat(v('ac-duration')) || 4) * 1000), animation: v('ac-animation'), accentColor: v('ac-accent'), textColor: v('ac-textcolor') };
    if (type === 'sound') return { preset: v('ac-preset'), mp3Url: v('ac-mp3'), volume: (parseInt(v('ac-volume')) || 80) / 100 };
    if (type === 'tts') return { text: v('ac-text'), rate: parseFloat(v('ac-rate')) || 1, pitch: parseFloat(v('ac-pitch')) || 1, voice: v('ac-voice') };
    if (type === 'keyboard') return { value: v('ac-value'), repeatCount: parseInt(v('ac-repeat')) || 1 };
    if (type === 'mouse' || type === 'text') return { value: v('ac-value') };
    if (type === 'launch') return { command: v('ac-command') };
    if (type === 'points') return { amount: parseInt(v('ac-amount')) || 10 };
    if (type === 'confetti') return { intensity: parseInt(v('ac-intensity')) || 5, colors: (v('ac-colors') || '').split(',').map(s => s.trim()).filter(Boolean) };
    if (type === 'media') return { mediaUrl: v('ac-mediaUrl'), mediaType: v('ac-mediaType'), durationMs: Math.round((parseFloat(v('ac-duration')) || 5) * 1000) };
    if (type === 'minecraft') return { command: v('ac-mc-command') };
    return {};
}
async function saveAction() {
    const name = document.getElementById('action-name').value.trim();
    const type = document.getElementById('action-type').value;
    if (!name) return actionAlert('Aksiyon adı gerekli.');
    const config = collectActionConfig();
    try {
        if (_autoEditingAction?._id) {
            await autoApi(`/actions/${_autoEditingAction._id}`, { method: 'PUT', body: { name, type, config } });
        } else {
            const created = await autoApi('/actions', { method: 'POST', body: { name, type, config } });
            _autoEditingAction = created;
            document.getElementById('action-test-btn').style.display = '';
        }
        await reloadAutomation();
        actionAlert('Kaydedildi ✓', true);
        showToast('Aksiyon kaydedildi');
        // Refresh the rule editor's action picker if it's open
        if (document.getElementById('rule-modal').classList.contains('active')) {
            renderRuleActionPicker(collectRuleActionIds());
        }
    } catch (e) { actionAlert('Hata: ' + e.message); }
}
async function testCurrentAction() { if (_autoEditingAction?._id) await testActionById(_autoEditingAction._id); }
async function testActionById(id) {
    try {
        const res = await autoApi(`/actions/${id}/test`, { method: 'POST' });
        if (res.actionType === 'minecraft') {
            // Surface the real RCON response so silent no-ops (e.g. "No entity
            // was found" when no players are in-game) are visible.
            const r = (res.response || '').trim();
            showToast(r ? `🟩 MC: ${r.slice(0, 90)}` : '🟩 MC komutu gönderildi (sunucu yanıt vermedi)');
        } else {
            showToast(`🧪 ${ACTION_META[res.actionType]?.label || res.actionType} test edildi`);
        }
    }
    catch (e) { showToast('Test hatası: ' + e.message, true); }
}
function editActionById(id) { const a = _autoActions.find(x => String(x._id) === String(id)); if (a) openActionEditor(a); }
async function deleteActionById(id) {
    const usedBy = _autoRules.filter(r => (r.actionIds || []).some(x => String((typeof x === 'object') ? x._id : x) === String(id))).length;
    if (!confirm(usedBy ? `Bu aksiyon ${usedBy} kuralda kullanılıyor. Silinsin mi? (kurallardan da çıkarılır)` : 'Bu aksiyon silinsin mi?')) return;
    try { await autoApi(`/actions/${id}`, { method: 'DELETE' }); await reloadAutomation(); showToast('Aksiyon silindi'); }
    catch (e) { showToast('Hata: ' + e.message, true); }
}

// ─── MOD migration ───────────────────────────────────────────────────────
async function renderMigratePreview() {
    const el = document.getElementById('auto-migrate-preview');
    el.innerHTML = '<div style="color:#9d8bbf;font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> Modlar taranıyor...</div>';
    try {
        const result = await window.api.getInstalledMods();
        const mods = (result.success ? result.data : []) || [];
        const rows = [];
        for (const m of mods) {
            const acts = m.config?.giftActions || {};
            for (const [gift, action] of Object.entries(acts)) {
                if (action && action.value) rows.push({ mod: m.title, gift, value: action.value, type: action.type || 'keyboard' });
            }
        }
        if (!rows.length) { el.innerHTML = '<div style="color:#7a6e94;font-size:0.82rem;">Dönüştürülecek mod eşlemesi bulunamadı. Önce Modlar sayfasından bir mod kur ve hediye-tuş ataması yap.</div>'; return; }
        el.innerHTML = `<div style="font-size:0.8rem;color:#c8c8d4;margin-bottom:0.5rem;">${rows.length} eşleme bulundu:</div>` +
            `<div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:0.3rem;">` +
            rows.map(r => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;padding:0.4rem 0.6rem;background:rgba(255,255,255,0.02);border-radius:7px;"><span class="auto-flow-pill auto-flow-trigger" style="font-size:0.7rem;">🎁 ${escapeHtml(r.gift)}</span><i class="fas fa-arrow-right" style="color:#7a6e94;"></i><span class="auto-flow-pill auto-flow-action" style="font-size:0.7rem;">⌨️ ${escapeHtml(r.value)}</span><span style="margin-left:auto;color:#7a6e94;font-size:0.68rem;">${escapeHtml(r.mod)}</span></div>`).join('') +
            `</div>`;
        el._rows = rows;
    } catch (e) { el.innerHTML = `<div style="color:#fca5a5;font-size:0.8rem;">Hata: ${escapeHtml(e.message)}</div>`; }
}
async function runModMigration() {
    const el = document.getElementById('auto-migrate-preview');
    const rows = el._rows;
    if (!rows || !rows.length) { showToast('Önce dönüştürülecek eşleme bulunmalı', true); return; }
    if (!confirm(`${rows.length} eşleme, Aksiyon + Kural olarak oluşturulacak. Devam?`)) return;
    let made = 0;
    try {
        for (const r of rows) {
            const action = await autoApi('/actions', { method: 'POST', body: { name: `${r.gift} → ${r.value}`, type: r.type, config: { value: r.value, repeatCount: 1 } } });
            await autoApi('/rules', { method: 'POST', body: { name: `${r.gift} (${r.mod})`, trigger: { type: 'gift', giftName: r.gift }, combo: 'perGift', actionIds: [action._id] } });
            made++;
        }
        await reloadAutomation();
        switchAutoTab('rules');
        showToast(`✓ ${made} kural oluşturuldu`);
    } catch (e) { showToast(`${made} oluşturuldu, sonra hata: ${e.message}`, true); }
}
// ════════════════════════ END AUTOMATION ════════════════════════
