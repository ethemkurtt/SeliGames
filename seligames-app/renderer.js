// Login functionality
const loginForm = document.getElementById('login-form');
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const result = await window.api.login({ email, password });

        if (result.success) {
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.user));

            loginOverlay.classList.add('hidden');
            appContainer.classList.add('active');

            loadUserInfo(result.data.user);
            loadDashboard();

            window.api.connectBackendSocket().then(res => {
                if (res.success) console.log('✅ Backend socket bridge connected');
                else console.warn('⚠️ Backend socket bridge failed:', res.error);
            });
        } else {
            alert('Giriş başarısız: ' + result.error);
        }
    } catch (error) {
        alert('Bağlantı hatası');
    }
});

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

    const username = user.username || user.email.split('@')[0];
    const email = user.email;

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
        if (typeof loadGalleryTemplates === 'function') loadGalleryTemplates();
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
                        ? `<span style="color:#00ff9d">● CANLI</span><br><small style="color:#8b8b9a">@${u.tiktokUsername}</small>`
                        : `<span style="color:#8b8b9a">● OFFLINE</span><br><small style="color:#8b8b9a">@${u.tiktokUsername}</small>`;
                } else {
                    statusEl.innerHTML = `<span style="color:#ff006e;font-size:0.75rem">Profilden bağla</span>`;
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
                    <b style="color:#00ff9d;">${escapeHtml(user)}</b> <span style="color:#8b8b9a;">${desc}</span>
                </div>
                <span style="color:#8b8b9a;font-size:0.68rem;flex-shrink:0;">${time}</span>
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
    lineHeight: 0,
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
        top:    { label: 'Üst Hediyeler',  icon: '↑', color: '#bd00ff' },
        left:   { label: 'Sol Hediyeler',  icon: '←', color: '#00d9ff' },
        right:  { label: 'Sağ Hediyeler',  icon: '→', color: '#00ff9d' },
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
                        <input type="text" value="${escapeHtml(item.text || '')}" placeholder="${escapeHtml(item.giftName || 'metin')}"
                               oninput="patchGiftItem('${slot}','${item.id}','text',this.value)">
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
        list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#8b8b9a;padding:2rem;">Eşleşen hediye yok</div>';
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

function pickGiftForSlot(giftName, iconUrlEncoded) {
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
        const TOP_RESERVED = giftDesign.giftSize + giftDesign.textGap + giftDesign.fontSize + PAD;

        // Corner-anchored layout:
        //   top    → top-left corner, items extend right
        //   right  → top-right corner, items extend down
        //   left   → top-left, but pushed down past the top row
        //   bottom → bottom-left corner, items extend right
        if (slot === 'top') {
            container.style.top = PAD + 'px';
            container.style.left = PAD + 'px';
        } else if (slot === 'right') {
            container.style.top = PAD + 'px';
            container.style.right = PAD + 'px';
        } else if (slot === 'left') {
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
        container.style.gap = giftDesign.lineHeight + 'px';
        // Anchor cards to the start edge of the slot — keeps multi-card rows
        // flush at the corner instead of drifting toward center.
        const startAlign = (slot === 'right') ? 'flex-end' : 'flex-start';
        container.style.alignItems = startAlign;
        container.style.justifyContent = 'flex-start';

        rows.forEach((rowItems) => {
            const rowEl = document.createElement('div');
            rowEl.style.display = 'flex';
            rowEl.style.flexDirection = isHorizontal ? 'row' : 'column';
            rowEl.style.gap = giftDesign.giftGap + 'px';
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

function renderGiftCardEl(item) {
    const card = document.createElement('div');
    card.className = 'gd-card';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'flex-start';
    card.style.textAlign = 'center';
    // Card width = icon width. This forces every card to occupy the SAME
    // horizontal footprint regardless of label length, so icons line up
    // pixel-perfect across rows. Long labels wrap to multiple lines below.
    card.style.width = giftDesign.giftSize + 'px';
    card.style.flex = '0 0 auto';

    const img = document.createElement('img');
    img.src = item.iconUrl ? gdProxify(item.iconUrl) : 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="rgba(189,0,255,0.3)"/><text x="50%" y="58%" text-anchor="middle" font-size="44" fill="#bd00ff" font-weight="bold">♪</text></svg>'
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
    card.appendChild(img);

    const text = item.text || item.giftName || '';
    if (text) {
        const txtEl = document.createElement('div');
        txtEl.className = 'gd-card-text';
        txtEl.textContent = text;
        txtEl.style.textAlign = 'center';
        txtEl.style.marginTop = giftDesign.textGap + 'px';
        // Auto-shrink long labels so single short words like "GÜL" stay big
        // while longer phrases like "SENİ SEVİYORUM" still fit within the
        // icon-wide card cleanly. Step-down by character count.
        const len = text.length;
        const baseFs = giftDesign.fontSize;
        let fs = baseFs;
        if (len > 18) fs = Math.max(10, Math.round(baseFs * 0.65));
        else if (len > 12) fs = Math.max(11, Math.round(baseFs * 0.78));
        else if (len > 8) fs = Math.max(12, Math.round(baseFs * 0.9));
        txtEl.style.fontSize = fs + 'px';
        txtEl.style.color = item.color || giftDesign.textColor;
        txtEl.style.fontFamily = `'${giftDesign.font}', sans-serif`;
        // Constrain text to icon width — long labels wrap (multi-line) instead
        // of stretching the card and breaking icon alignment.
        txtEl.style.width = giftDesign.giftSize + 'px';
        txtEl.style.maxWidth = giftDesign.giftSize + 'px';
        txtEl.style.wordBreak = 'break-word';
        txtEl.style.overflowWrap = 'break-word';
        txtEl.style.lineHeight = '1.05';
        // Multi-shadow stroke
        if (giftDesign.borderWidth > 0) {
            const w = giftDesign.borderWidth;
            const c = giftDesign.borderColor;
            const shadows = [];
            for (let a = 0; a < 8; a++) {
                const x = (Math.cos((a * Math.PI) / 4) * w).toFixed(1);
                const y = (Math.sin((a * Math.PI) / 4) * w).toFixed(1);
                shadows.push(`${x}px ${y}px 0 ${c}`);
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
        const user = e.data?.nickname || e.data?.user || 'Unknown';
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
    console.log('toggleAccordion called', el);
    var body = el.nextElementSibling;
    console.log('body found:', body, body ? body.className : 'null');
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
    console.log('body open now:', body.classList.contains('open'));
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
            btn.style.background = 'rgba(0, 255, 157, 0.4)';
            
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
        list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#8b8b9a;padding:1.5rem;">Eşleşen hediye yok</div>';
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
async function loadSettings() {
    try {
        const result = await window.api.getSettings();
        if (result.success && result.data.settings) {
            const settings = result.data.settings;
            
            // Update checkboxes based on settings
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
                if (checkbox) {
                    checkbox.checked = value !== false; // default to true if undefined
                }
            });
            
            console.log('✅ Settings loaded from backend');
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    // Load gift sound map grid (catalog + user's mapping)
    renderGiftSoundMap().catch(err => console.warn('renderGiftSoundMap failed', err));
}

// Update setting in backend
async function updateSetting(settingName, value) {
    try {
        const settings = {};
        settings[settingName] = value;
        const result = await window.api.updateSettings(settings);
        if (result.success) {
            console.log('✅ Setting updated:', settingName, value);
        }
    } catch (error) {
        console.error('Failed to update setting:', error);
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

    if (sidebar.classList.contains('collapsed')) {
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

let modActionsArmed = false;
let armedGiftIndex = new Map(); // giftName (lower) → [{ modTitle, action }]
let lastActionLog = [];

async function armModActions() {
    try {
        const result = await window.api.getInstalledMods();
        if (!result.success) throw new Error(result.error || 'load failed');
        const mods = result.data || [];
        armedGiftIndex.clear();
        let total = 0;
        for (const m of mods) {
            const actions = m.config?.giftActions || {};
            for (const [giftName, action] of Object.entries(actions)) {
                if (!action || !action.value) continue;
                const key = giftName.toLocaleLowerCase('tr-TR');
                if (!armedGiftIndex.has(key)) armedGiftIndex.set(key, []);
                armedGiftIndex.get(key).push({ modTitle: m.title, modId: m._id, giftName, action });
                total++;
            }
        }
        modActionsArmed = true;
        updateArmBadge();
        showToast(`🎮 ${mods.length} modda ${total} aksiyon silahlandı — oyunu ön plana getir`);
        return { mods: mods.length, actions: total };
    } catch (err) {
        showToast('Silahlanamadı: ' + err.message, true);
        return null;
    }
}

function disarmModActions() {
    modActionsArmed = false;
    armedGiftIndex.clear();
    updateArmBadge();
    showToast('🔒 Mod aksiyonları durduruldu');
}

function updateArmBadge() {
    const totalActions = [...armedGiftIndex.values()].reduce((n, arr) => n + arr.length, 0);
    // TikTok Canlı page badge
    const armedEl = document.getElementById('mod-armed-status');
    const armedBtnEl = document.getElementById('mod-armed-toggle');
    const armedCountEl = document.getElementById('mod-armed-count');
    if (armedEl) {
        armedEl.innerHTML = modActionsArmed
            ? `<span style="color:#00ff9d;font-weight:700;">● AKTİF</span>`
            : `<span style="color:#8b8b9a;">● Pasif</span>`;
    }
    if (armedCountEl) armedCountEl.textContent = modActionsArmed ? `${totalActions} aksiyon hazır` : '';
    if (armedBtnEl) {
        armedBtnEl.innerHTML = modActionsArmed
            ? '<i class="fas fa-stop-circle"></i> Mod Aksiyonlarını Durdur'
            : '<i class="fas fa-play-circle"></i> Mod Aksiyonlarını Başlat';
        armedBtnEl.style.background = modActionsArmed
            ? 'linear-gradient(135deg,#ff006e,#ff5722)'
            : 'linear-gradient(135deg,#00ff9d,#00f0ff)';
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
async function dispatchModActions(giftName, repeatCount = 1) {
    if (!modActionsArmed || !giftName) return;
    const entries = armedGiftIndex.get(giftName.toLocaleLowerCase('tr-TR'));
    if (!entries || !entries.length) return;
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
        el.innerHTML = '<div style="color:#8b8b9a;text-align:center;padding:1rem;font-size:0.75rem;font-style:italic;">Henüz fire edilen aksiyon yok</div>';
        return;
    }
    el.innerHTML = lastActionLog.slice(0, 15).map(l => `
        <div style="display:flex;gap:0.5rem;align-items:center;padding:0.35rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.72rem;">
            <span style="color:${l.ok ? '#00ff9d' : '#ff006e'};font-size:0.8rem;">${l.ok ? '✓' : '✗'}</span>
            <span style="color:#fff;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.giftName)} → <span style="color:#ffd700;">${escapeHtml(l.action.value)}</span></span>
            <span style="color:#8b8b9a;font-size:0.65rem;">${l.modTitle}</span>
            <span style="color:#8b8b9a;font-size:0.65rem;">${l.time.toLocaleTimeString('tr-TR')}</span>
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

async function loadMods() {
    const modsGrid = document.getElementById('mods-grid');
    const noMods = document.getElementById('no-mods');
    if (modsGrid) modsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#8b8b9a;padding:3rem;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;opacity:0.5;"></i><p style="margin-top:0.75rem;">Yükleniyor...</p></div>';
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
        if (modsGrid) modsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ff006e;padding:3rem;"><i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i><p style="margin-top:0.75rem;">Modlar yüklenemedi</p></div>';
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
        const img = mod.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect fill="%23101018" width="600" height="400"/></svg>';
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
}
function closeAddGameModal() {
    const m = document.getElementById('add-game-modal');
    if (m) m.classList.remove('active');
    // Reset form
    ['ag-title', 'ag-game', 'ag-description', 'ag-image', 'ag-download'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const ver = document.getElementById('ag-version'); if (ver) ver.value = '1.0.0';
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
        tags: []
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

// ═══════════════════ MOD DETAIL PAGE ═══════════════════

let currentModDetail = null;   // full mod object
let currentModConfig = null;   // { installed, installPath, giftActions: {...} }

async function openModDetail(modId) {
    // Fetch mod + config in parallel
    try {
        const mod = allMods.find(m => m._id === modId)
            || (await fetch(`http://localhost:3000/api/mods/${modId}`).then(r => r.json()).catch(() => null));
        if (!mod || !mod._id) { showToast('Mod bulunamadı', true); return; }

        const cfgRes = await window.api.getModConfig(modId);
        currentModDetail = mod;
        currentModConfig = cfgRes.success ? cfgRes.data : { installed: false, giftActions: {} };

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
    if (heroBg && mod.imageUrl) heroBg.style.backgroundImage = `url('${mod.imageUrl.replace(/'/g, "\\'")}')`;
    else if (heroBg) heroBg.style.backgroundImage = 'linear-gradient(135deg, #1a1a2e, #0a0a0f)';

    // Install/uninstall button states
    const isInstalled = !!currentModConfig?.installed;
    const installBtn = document.getElementById('md-install-btn');
    const uninstallBtn = document.getElementById('md-uninstall-btn');
    if (installBtn) {
        installBtn.innerHTML = isInstalled
            ? '<i class="fas fa-check-circle"></i> Yüklü ✓'
            : '<i class="fas fa-download"></i> Kur';
        installBtn.disabled = isInstalled;
        installBtn.style.opacity = isInstalled ? '0.7' : '1';
        installBtn.style.cursor = isInstalled ? 'default' : 'pointer';
    }
    if (uninstallBtn) uninstallBtn.style.display = isInstalled ? 'inline-flex' : 'none';
}

function renderModGiftActions() {
    const grid = document.getElementById('md-gift-grid');
    if (!grid) return;

    const q = (document.getElementById('md-search')?.value || '').toLocaleLowerCase('tr-TR').trim();
    const mode = document.getElementById('md-filter')?.value || 'all';
    const actions = currentModConfig?.giftActions || {};

    let items = [...giftCatalogCache];
    if (q) items = items.filter(g => g.name.toLocaleLowerCase('tr-TR').includes(q) || String(g.coins).includes(q));
    if (mode === 'mapped') items = items.filter(g => actions[g.name]);
    else if (mode === 'unmapped') items = items.filter(g => !actions[g.name]);
    else if (mode === 'low') items = items.filter(g => g.coins < 10);
    else if (mode === 'mid') items = items.filter(g => g.coins >= 10 && g.coins < 100);
    else if (mode === 'high') items = items.filter(g => g.coins >= 100 && g.coins < 1000);
    else if (mode === 'epic') items = items.filter(g => g.coins >= 1000);
    items.sort((a, b) => a.coins - b.coins);

    // Update badges
    const totalGifts = giftCatalogCache.length;
    const mapped = Object.keys(actions).length;
    const kbCount = Object.values(actions).filter(a => a && a.type === 'keyboard').length;
    setText('md-gifts-total', totalGifts);
    setText('md-actions-count', mapped);
    setText('md-kb-count', kbCount);
    setText('md-unmapped-count', totalGifts - mapped);

    if (!items.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#8b8b9a;padding:2rem;">Eşleşen hediye yok</div>';
        return;
    }

    grid.innerHTML = items.map(g => {
        const act = actions[g.name];
        const hasAction = !!act;
        const type = act?.type || 'keyboard';
        const value = act?.value || '';
        return `
            <div class="md-gift-row ${hasAction ? 'mapped' : ''}" data-name="${escapeHtml(g.name)}">
                <img class="md-gift-icon" src="${g.icon}" alt="" onerror="this.style.display='none'">
                <div class="md-gift-info">
                    <div class="md-gift-name">${escapeHtml(g.name)}</div>
                    <div class="md-gift-coins">💎 ${g.coins}</div>
                </div>
                <div class="md-action-controls">
                    <select class="md-action-type" onchange="updateGiftActionType('${escapeHtml(g.name).replace(/'/g, "\\'")}', this.value)">
                        <option value="keyboard" ${type === 'keyboard' ? 'selected' : ''}>⌨ Klavye</option>
                        <option value="text" ${type === 'text' ? 'selected' : ''}>📝 Metin</option>
                        <option value="mouse" ${type === 'mouse' ? 'selected' : ''}>🖱 Fare</option>
                    </select>
                    <input type="text" class="md-shortcut-input" readonly
                        value="${escapeHtml(value)}"
                        placeholder="${type === 'keyboard' ? 'Tıkla + tuş bas' : type === 'mouse' ? 'Tıkla + fare bas' : 'yazı gir'}"
                        data-name="${escapeHtml(g.name)}"
                        onclick="startShortcutCapture(this, '${escapeHtml(g.name).replace(/'/g, "\\'")}')"
                    >
                    <button class="md-gift-btn" onclick="clearGiftAction('${escapeHtml(g.name).replace(/'/g, "\\'")}')" title="Temizle">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
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

async function installModAction() {
    if (!currentModDetail) return;
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
    el.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);
        z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;
    `;
    el.innerHTML = `
        <div style="background:#13131a;border:1px solid rgba(0,255,157,0.25);border-radius:16px;padding:1.5rem 1.75rem;max-width:480px;width:100%;box-shadow:0 0 40px rgba(0,255,157,0.15);">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#00ff9d,#00f0ff);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-download" style="color:#0a0a0f;font-size:1.1rem;"></i>
                </div>
                <div style="min-width:0;flex:1;">
                    <div style="color:#fff;font-weight:700;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mod.title)}</div>
                    <div id="ip-phase" style="color:#8b8b9a;font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;margin-top:0.15rem;">Hazırlanıyor...</div>
                </div>
                <div id="ip-pct" style="color:#00ff9d;font-weight:800;font-size:1.4rem;font-variant-numeric:tabular-nums;">0%</div>
            </div>
            <div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;margin-bottom:0.5rem;">
                <div id="ip-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00ff9d,#00f0ff);box-shadow:0 0 12px #00ff9d88;transition:width 0.2s ease;"></div>
            </div>
            <div id="ip-meta" style="color:#8b8b9a;font-size:0.72rem;font-variant-numeric:tabular-nums;text-align:right;">—</div>
            <div id="ip-msg" style="display:none;margin-top:0.75rem;padding:0.55rem 0.75rem;border-radius:8px;font-size:0.78rem;"></div>
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
            ? 'background:rgba(255,0,110,0.1);color:#ff6b9d;border:1px solid rgba(255,0,110,0.3);'
            : p.phase === 'warn'
                ? 'background:rgba(255,165,0,0.1);color:#ffa500;border:1px solid rgba(255,165,0,0.3);'
                : 'background:rgba(0,255,157,0.1);color:#00ff9d;border:1px solid rgba(0,255,157,0.3);';
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
            cpuElem.style.color = cpu > 80 ? '#ff006e' : '#00ff9d';
        }
        if (ramElem) ramElem.textContent = `${ram}GB`;
        if (fpsElem) {
            fpsElem.textContent = fps;
            fpsElem.style.color = fps < 30 ? '#ff006e' : '#00ff9d';
        }
    }, 2000);
}

// Start monitor
// TikTok Connection
document.getElementById('btn-connect-tiktok')?.addEventListener('click', () => {
    const username = document.getElementById('tiktok-username').value;
    if (username) {
        alert(`TikTok kullanıcısı @${username} bağlanıyor... (Simülasyon)`);
        // In a real app, this would trigger the backend connection
    } else {
        alert('Lütfen bir kullanıcı adı girin!');
    }
});

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
    document.getElementById('total-comments').textContent = liveStats.comments;
    document.getElementById('total-gifts').textContent = liveStats.gifts;
    document.getElementById('total-likes').textContent = liveStats.likes;
    document.getElementById('total-members').textContent = liveStats.members;
    document.getElementById('live-viewers').textContent = liveStats.viewers;
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
                usernameDisplay.style.color = '#00d9ff';
            }
            console.log('✅ TikTok username loaded from backend:', result.data.tiktokUsername);
        } else {
            if (usernameDisplay) {
                usernameDisplay.textContent = 'Profil sayfasından TikTok kullanıcı adınızı ekleyin';
                usernameDisplay.style.color = '#ff006e';
            }
        }
    } catch (error) {
        console.error('Failed to load username:', error);
        const usernameDisplay = document.getElementById('tiktok-username-text');
        if (usernameDisplay) {
            usernameDisplay.textContent = 'Yüklenemedi';
            usernameDisplay.style.color = '#ff006e';
        }
    }
}

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

    connectToTikTokLive();
}

// Message handlers for different event types
function handleChatMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Unknown';
    const comment = data?.comment || data?.message || data?.text || '';

    if (comment) {
        console.log(`  👤 ${user}: ${comment}`);
        liveStats.comments++;
        addEventToFeed({
            type: 'comment',
            user: user,
            message: comment,
            icon: '💬',
            color: '#00ff9d'
        });
        updateLiveStats();
    }
}

function handleGiftMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Unknown';
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
        color: '#ff0050'
    });
    updateLiveStats();
}

function handleLikeMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Unknown';
    const likeCount = data?.likeCount || data?.count || 1;
    const totalLikes = data?.totalLikeCount || 0;

    console.log(`  ❤️ ${user} liked (${likeCount})`);

    liveStats.likes += likeCount;
    addEventToFeed({
        type: 'like',
        user: user,
        message: `Beğendi${totalLikes > 0 ? ' (Toplam: ' + totalLikes + ')' : ''}`,
        icon: '❤️',
        color: '#00f0ff'
    });
    updateLiveStats();
}

function handleMemberMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Unknown';

    console.log(`  👋 ${user} joined`);
    liveStats.members++;

    addEventToFeed({
        type: 'member',
        user: user,
        message: 'Yayına katıldı',
        icon: '👋',
        color: '#bd00ff'
    });
}

function handleSocialMessage(data) {
    const user = data?.user?.nickname || data?.user?.uniqueId || data?.nickname || 'Unknown';
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
                statusDot.style.background = '#00ff9d';
                statusDot.style.boxShadow = '0 0 10px #00ff9d';
                statusText.textContent = 'Bağlı ✓';
            }

            const container = document.getElementById('live-stream-container');
            const placeholder = document.getElementById('stream-placeholder');
            if (placeholder) placeholder.style.display = 'none';

            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: #00ff9d; padding: 2rem;">
                        <i class="fas fa-check-circle" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                        <p style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">✅ Canlı Bağlantı Aktif!</p>
                        <p style="color: #8b8b9a;">@${username} kullanıcısının canlı yayınına bağlandınız</p>
                        <p style="color: #00ff9d; font-size: 0.85rem; margin-top: 1rem;">🔴 CANLI - Event'ler gerçek zamanlı alınıyor</p>
                    </div>
                `;
            }

            addEventToFeed({
                type: 'system',
                user: 'Sistem',
                message: `@${username} canlı yayınına bağlandı`,
                icon: '✅',
                color: '#00ff9d'
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
                statusDot.style.background = '#ff006e';
                statusDot.style.boxShadow = '0 0 10px #ff006e';
                statusText.textContent = 'Bağlantı Hatası';
            }
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket closed');

            if (statusDot && statusText) {
                statusDot.style.background = '#ff006e';
                statusDot.style.boxShadow = '0 0 10px #ff006e';
                statusText.textContent = 'Bağlantı Kesildi';
            }
        };

    } catch (error) {
        console.error('❌ Connection error:', error);

        if (statusDot && statusText) {
            statusDot.style.background = '#ff006e';
            statusDot.style.boxShadow = '0 0 10px #ff006e';
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

        const giftName = eventData?.gift?.name || 'Hediye';
        const giftCount = eventData?.repeatCount || 1;
        const diamonds = (eventData?.gift?.diamond_count || 0) * giftCount;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';

        playGiftSound(giftName, diamonds);

        addEventToFeed({
            type: 'gift',
            user: getUserInfo(eventData),
            message: `${giftName} x${giftCount} ${diamonds > 0 ? '(💎 ' + diamonds + ')' : ''}`,
            icon: '🎁',
            color: '#ff006e',
            profilePhoto: profilePhoto
        });

        forwardToBackend('gift', eventData);

        // Fire mapped game shortcut — repeatCount honored (10 gül → 10 keystroke)
        dispatchModActions(giftName, giftCount);
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
            color: '#ff006e',
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
            color: '#00d9ff',
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
                color: '#00d9ff',
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
            color: '#00ff9d'
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
    if (ws) {
        ws.close();
        ws = null;
        console.log('✅ Disconnected from TikTok Live');
    }

    const statusDot = document.getElementById('connection-status-dot');
    const statusText = document.getElementById('connection-status-text');

    if (statusDot && statusText) {
        statusDot.style.background = '#ff006e';
        statusDot.style.boxShadow = '0 0 10px #ff006e';
        statusText.textContent = 'Bağlı Değil';
    }

    // Reset stream container
    const container = document.getElementById('live-stream-container');
    if (container) {
        container.innerHTML = `
            <div id="stream-placeholder" style="text-align: center; color: #8b8b9a;">
                <i class="fab fa-tiktok" style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Canlı Yayın Bağlı Değil</p>
                <p style="font-size: 0.9rem;">Kullanıcı adı girerek bağlanın</p>
            </div>
        `;
    }

    // Reset stats
    liveStats = { comments: 0, gifts: 0, likes: 0, members: 0, actions: 0, viewers: 0 };
    updateLiveStats();

    addEventToFeed({
        type: 'system',
        user: 'Sistem',
        message: 'Bağlantı kapatıldı',
        icon: '🔌',
        color: '#ff006e'
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

    // Remove placeholder if exists
    const placeholder = feed.querySelector('[style*="padding: 4rem"]');
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
                <span style="font-size: 1.2rem;">${event.icon}</span>
                <span style="font-size: 0.7rem; color: #8b8b9a;">${new Date().toLocaleTimeString('tr-TR')}</span>
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
            <div style="text-align: center; color: #8b8b9a; padding: 4rem 2rem;">
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
                    b.style.borderColor = '#00ff9d';
                    b.style.background = 'rgba(0,255,157,0.2)';
                    b.style.color = '#00ff9d';
                    b.classList.add('active');
                } else {
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                    b.style.background = 'rgba(255,255,255,0.05)';
                    b.style.color = '#8b8b9a';
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
    epic: { frequencies: [392, 494, 587, 784, 988, 1175], duration: 2, type: 'sine', volume: 0.5 }
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
let WEB_URL = 'http://localhost:5173';

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
    'goal-likes':       { overlayType: 'goal', subType: 'likes', title: 'Likes Hedefi', icon: '❤️' },
    'goal-shares':      { overlayType: 'goal', subType: 'shares', title: 'Shares Hedefi', icon: '🔁' },
    'goal-follows':     { overlayType: 'goal', subType: 'follows', title: 'Follows Hedefi', icon: '➕' },
    'goal-viewers':     { overlayType: 'goal', subType: 'viewer_count', title: 'Viewer Count Hedefi', icon: '👁️' },
    'goal-coins':       { overlayType: 'goal', subType: 'coins', title: 'Coins Earned Hedefi', icon: '🪙' },
    'goal-subscribers': { overlayType: 'goal', subType: 'subscribers', title: 'New Subscribers Hedefi', icon: '⭐' },
    'goal-custom1':     { overlayType: 'goal', subType: 'custom1', title: 'Custom Goal 1', icon: '🎯' },
    'goal-custom2':     { overlayType: 'goal', subType: 'custom2', title: 'Custom Goal 2', icon: '🎯' },
    'goal-custom3':     { overlayType: 'goal', subType: 'custom3', title: 'Custom Goal 3', icon: '🎯' },
    'gift-alert':       { overlayType: 'gift-alert', subType: 'alert', title: 'Hediye Alert Overlay', icon: '🎁' },
    'gift-ticker':      { overlayType: 'gift-alert', subType: 'ticker', title: 'Hediye Ticker', icon: '📜' },
    'lastx-follower':   { overlayType: 'last-x', subType: 'follows', title: 'Son Takipçi', icon: '➕' },
    'lastx-gift':       { overlayType: 'last-x', subType: 'gifts', title: 'Son Hediye', icon: '🎁' },
    'lastx-like':       { overlayType: 'last-x', subType: 'likes', title: 'Son Beğenen', icon: '❤️' },
    'lastx-share':      { overlayType: 'last-x', subType: 'shares', title: 'Son Paylaşan', icon: '🔁' },
    'lb-gifters':       { overlayType: 'leaderboard', subType: 'gifts', title: 'Top Gifters', icon: '🏆' },
    'lb-likers':        { overlayType: 'leaderboard', subType: 'likes', title: 'Top Likers', icon: '❤️' },
    'chart-viewers':    { overlayType: 'chart', subType: 'viewer_count', title: 'Viewer Grafiği', icon: '📊' },
    'dock-chat':        { overlayType: 'chat', subType: 'chat', title: 'Chat Dock', icon: '💬' },
    'dock-events':      { overlayType: 'event-feed', subType: 'events', title: 'Event Feed Dock', icon: '📋' },
    'subathon-timer':   { overlayType: 'subathon', subType: 'timer', title: 'Subathon Timer', icon: '⏱️' },
    'wheel-actions':    { overlayType: 'wheel', subType: 'actions', title: 'Şans Çarkı', icon: '🎡' },
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
        if (key === 'gallery-templates') loadGalleryTemplates?.();
        else loadMyOverlays?.();
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
    event.target.closest('.nav-sub-item')?.classList.add('active');

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
            const barColor = ov.style?.barColor || '#00ff9d';
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
                    <div class="draft-meta"><span>${ov.overlayType} / ${ov.subType || ''}</span><span style="color:${ov.isActive ? '#00ff9d' : '#ff006e'}">${ov.isActive ? '● AKTİF' : '● PASİF'}</span></div>
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
        listEl.innerHTML = '<div class="ov-drafts-empty" style="color:#ff006e">Taslaklar yüklenemedi</div>';
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
    setColorInput('ov-barColor', s.barColor || '#00ff9d');
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
    setColorInput('ov-barColor', '#00ff9d');
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

// Style carousel
var currentStyleIndex = 0;
var overlayStyles = [
    { name: 'Neon', theme: 'neon', barColor: '#00ff9d', bgColor: '#000000', textColor: '#ffffff' },
    { name: 'Minimal', theme: 'minimal', barColor: '#4fc3f7', bgColor: '#1a1a2e', textColor: '#e0e0e0' },
    { name: 'Gaming', theme: 'gaming', barColor: '#ff006e', bgColor: '#0a0a1a', textColor: '#ffffff' },
    { name: 'Gradient', theme: 'gradient', barColor: '#bd00ff', bgColor: '#0d0d18', textColor: '#ffffff' },
    { name: 'Glass', theme: 'glass', barColor: '#00f0ff', bgColor: '#111122', textColor: '#ffffff' },
    { name: 'Fire', theme: 'neon', barColor: '#ff5722', bgColor: '#1a0a00', textColor: '#ffccbc' },
    { name: 'Gold', theme: 'gradient', barColor: '#ffd700', bgColor: '#1a1500', textColor: '#fff8e1' }
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
    document.getElementById('ov-theme').value = s.theme;
    document.getElementById('ov-barColor').value = s.barColor;
    document.getElementById('ov-bgColor').value = s.bgColor;
    document.getElementById('ov-textColor').value = s.textColor;
    var label = document.getElementById('ov-style-label');
    if (label) label.textContent = 'Style: ' + (currentStyleIndex + 1) + '/' + overlayStyles.length;
    updateOverlayPreview();
}

function testOverlay() {
    var currentEl = document.getElementById('ov-current');
    var targetEl = document.getElementById('ov-target');
    if (currentEl && targetEl) {
        var target = parseInt(targetEl.value) || 100;
        var testVal = Math.floor(target * 0.65);
        currentEl.value = testVal;
        updateOverlayPreview();
        showToast('Test değeri: ' + testVal);
    }
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
        preview.innerHTML = `
            <div style="padding:16px 20px;border-radius:${s.borderRadius}px;min-width:280px;max-width:100%;${themeStyles.container}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="color:${s.textColor};font-size:${s.fontSize}px;font-weight:700;${themeStyles.title}">${title}</div>
                    ${s.showNumbers ? `<div style="color:${s.barColor};font-size:${s.fontSize*0.75}px;font-weight:600;${themeStyles.numbers}">${current.toLocaleString()} / ${target.toLocaleString()}</div>` : ''}
                </div>
                <div style="height:${s.theme==='gaming'?28:22}px;border-radius:${s.borderRadius}px;background:${s.theme==='glass'?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.08)'};overflow:hidden;position:relative;">
                    <div style="height:100%;width:${pct}%;border-radius:${s.borderRadius}px;background:linear-gradient(90deg,${s.barColor},${s.barColor}cc);${themeStyles.bar};transition:width 0.5s ease;position:relative;"></div>
                    ${s.showPercentage ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:12px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,0.9)">${pct.toFixed(0)}%</div>` : ''}
                </div>
                ${done ? `<div style="text-align:center;margin-top:8px;color:${s.barColor};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">TAMAMLANDI!</div>` : ''}
            </div>`;
    } else if (type === 'gift-alert') {
        preview.innerHTML = `
            <div style="text-align:center;padding:20px;border-radius:${s.borderRadius}px;${themeStyles.container}">
                <div style="font-size:48px;margin-bottom:12px;">🎁</div>
                <div style="color:${s.textColor};font-size:${s.fontSize}px;font-weight:700;">Kullanıcı</div>
                <div style="color:${s.barColor};font-size:${s.fontSize*0.8}px;font-weight:600;">Gül x1</div>
            </div>`;
    } else if (type === 'last-x') {
        preview.innerHTML = `
            <div style="padding:16px 20px;border-radius:${s.borderRadius}px;min-width:240px;${themeStyles.container};border:1px solid ${s.barColor}44;">
                <div style="color:${s.barColor};font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px;">${title}</div>
                <div style="color:${s.textColor};font-size:${s.fontSize}px;font-weight:700;">Kullanıcı Adı</div>
            </div>`;
    } else if (type === 'leaderboard' || type === 'chart') {
        const medals = ['👑','🥈','🥉'];
        let rows = '';
        for (let i = 0; i < 3; i++) {
            rows += `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="color:${s.barColor};font-size:18px;font-weight:700;width:28px;text-align:center;">${medals[i]}</div>
                <div style="color:${s.textColor};font-size:15px;font-weight:600;flex:1;">Kullanıcı ${i+1}</div>
                <div style="color:${s.barColor};font-size:15px;font-weight:700;">${100-i*20}</div>
            </div>`;
        }
        preview.innerHTML = `
            <div style="padding:16px 20px;border-radius:${s.borderRadius}px;min-width:280px;${themeStyles.container};border:1px solid ${s.barColor}44;">
                <div style="color:${s.barColor};font-size:14px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:12px;">${title}</div>
                ${rows}
            </div>`;
    } else if (type === 'chat') {
        const msgs = [
            { user: 'Kullanıcı1', text: 'Merhaba!' },
            { user: 'Kullanıcı2', text: 'Harika yayın!' },
            { user: 'Kullanıcı3', text: 'Devam et!' }
        ];
        let html = '';
        msgs.forEach(m => {
            html += `<div style="padding:6px 0;display:flex;gap:8px;"><span style="color:${s.barColor};font-weight:700;font-size:14px;">${m.user}:</span><span style="color:${s.textColor};font-size:14px;">${m.text}</span></div>`;
        });
        preview.innerHTML = `
            <div style="padding:12px;border-radius:${s.borderRadius}px;min-width:280px;max-width:100%;${themeStyles.container};border:1px solid rgba(255,255,255,0.08);">
                ${html}
            </div>`;
    } else if (type === 'event-feed') {
        const events = [
            { icon: '🎁', user: 'Kullanıcı1', text: 'Gül gönderdi' },
            { icon: '❤️', user: 'Kullanıcı2', text: 'Beğendi' },
            { icon: '➕', user: 'Kullanıcı3', text: 'Takip etti' }
        ];
        let html = '';
        events.forEach(e => {
            html += `<div style="padding:6px 0;display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:16px;">${e.icon}</span><span style="color:${s.textColor};font-size:14px;"><b style="color:${s.barColor};">${e.user}</b> ${e.text}</span></div>`;
        });
        preview.innerHTML = `
            <div style="padding:12px;border-radius:${s.borderRadius}px;min-width:280px;max-width:100%;${themeStyles.container};border:1px solid rgba(255,255,255,0.08);">
                ${html}
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
    const bc = s.barColor || '#00ff9d';
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
    { name: 'Neon Like Goal', overlayType: 'goal', subType: 'likes', style: { barColor:'#00ff9d', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.6)', fontSize:18, borderRadius:12, theme:'neon', animation:'smooth', showPercentage:true, showNumbers:true }, targetValue: 500 },
    { name: 'Gaming Follow Goal', overlayType: 'goal', subType: 'follows', style: { barColor:'#ff0050', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.7)', fontSize:20, borderRadius:8, theme:'gaming', animation:'bounce', showPercentage:true, showNumbers:true }, targetValue: 200 },
    { name: 'Glass Share Goal', overlayType: 'goal', subType: 'shares', style: { barColor:'#00d9ff', textColor:'#fff', backgroundColor:'rgba(255,255,255,0.08)', fontSize:16, borderRadius:16, theme:'glass', animation:'smooth', showPercentage:true, showNumbers:true }, targetValue: 100 },
    { name: 'Gradient Gift Alert', overlayType: 'gift-alert', subType: 'alert', style: { barColor:'#ffd700', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.5)', fontSize:22, borderRadius:16, theme:'gradient', animation:'bounce' }, config: { duration: 5 } },
    { name: 'Minimal Leaderboard', overlayType: 'leaderboard', subType: 'gifts', style: { barColor:'#00ff9d', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.6)', fontSize:16, borderRadius:12, theme:'minimal' }, config: { maxItems: 5 } },
    { name: 'Neon Chat Dock', overlayType: 'chat', subType: 'chat', style: { barColor:'#00ff9d', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.5)', fontSize:14, borderRadius:12, theme:'neon' }, config: { maxMessages: 20 } },
    { name: 'Glass Event Feed', overlayType: 'event-feed', subType: 'events', style: { barColor:'#00d9ff', textColor:'#fff', backgroundColor:'rgba(255,255,255,0.08)', fontSize:14, borderRadius:12, theme:'glass' }, config: { maxEvents: 15 } },
    { name: 'Gaming Last Follower', overlayType: 'last-x', subType: 'follows', style: { barColor:'#ff0050', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.7)', fontSize:24, borderRadius:8, theme:'gaming' } },
    { name: 'Gradient Viewer Chart', overlayType: 'chart', subType: 'viewer_count', style: { barColor:'#bd00ff', textColor:'#fff', backgroundColor:'rgba(0,0,0,0.5)', fontSize:16, borderRadius:12, theme:'gradient' }, config: { maxItems: 5 } },
];

function loadGalleryTemplates() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    galleryTemplates.forEach((tmpl, idx) => {
        const themeColors = { neon:'#00ff9d', minimal:'#8b8b9a', gaming:'#ff0050', gradient:'#bd00ff', glass:'#00d9ff' };
        const color = tmpl.style.barColor || themeColors[tmpl.style.theme] || '#00ff9d';
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.onclick = () => applyGalleryTemplate(tmpl);
        card.innerHTML = `
            <div class="gallery-card-preview" style="background:linear-gradient(135deg,${color}11,${color}22);">
                <div style="width:80%;height:20px;border-radius:10px;background:rgba(255,255,255,0.08);overflow:hidden;position:relative;">
                    <div style="width:65%;height:100%;border-radius:10px;background:linear-gradient(90deg,${color},${color}cc);box-shadow:0 0 10px ${color}44;"></div>
                </div>
            </div>
            <div class="gallery-card-info">
                <div class="gallery-card-title">${tmpl.name}</div>
                <div class="gallery-card-desc">${tmpl.overlayType} - ${tmpl.style.theme} tema</div>
            </div>`;
        grid.appendChild(card);
    });
}

async function loadMyOverlays() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;color:#8b8b9a;padding:2rem;">Yükleniyor...</div>';

    try {
        const result = await window.api.getOverlays({});
        if (result.success && result.data.length > 0) {
            grid.innerHTML = '';
            result.data.forEach(ov => {
                const color = ov.style?.barColor || '#00ff9d';
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
                            <button class="btn-icon" style="border-color:rgba(255,0,110,0.3);color:#ff006e;background:rgba(255,0,110,0.1);" onclick="event.stopPropagation();deleteOverlayById('${ov._id}')" title="Sil"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<div style="text-align:center;color:#8b8b9a;padding:3rem;"><i class="fas fa-inbox" style="font-size:2.5rem;opacity:0.3;margin-bottom:1rem;display:block;"></i><p>Henüz overlay oluşturmadınız</p></div>';
        }
    } catch (e) {
        grid.innerHTML = '<div style="text-align:center;color:#ff006e;padding:2rem;">Yüklenemedi</div>';
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
            showToast('Şablon uygulandı! URL: ' + buildOverlayLiveUrl(result.data));
            loadMyOverlays();
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
    ).join('') || '<div style="text-align:center;color:#8b8b9a;padding:2rem;">Filtre ile eşleşen hediye yok</div>';
}

function filterScannerLog() { updateScannerUI(); }
function clearScannerLog() {
    scannerData = { gifts: [], totalCoins: 0, gifters: {} };
    updateScannerUI();
    document.getElementById('scanner-log').innerHTML = '<div style="text-align:center;color:#8b8b9a;padding:3rem;"><i class="fas fa-gift" style="font-size:2.5rem;opacity:0.3;margin-bottom:1rem;display:block;"></i><p>Hediyeler temizlendi</p></div>';
}

// Toast notification
function showToast(msg, isError = false) {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:0.8rem 1.5rem;border-radius:10px;font-size:0.9rem;font-weight:600;z-index:9999;animation:fadeIn 0.3s ease;
        background:${isError ? 'rgba(255,0,110,0.9)' : 'rgba(0,255,157,0.9)'};color:${isError ? '#fff' : '#0a0a0f'};`;
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
        const user = eventData?.user?.nickname || eventData?.user?.uniqueId || 'Unknown';
        const giftName = eventData?.gift?.name || 'Hediye';
        const giftCount = eventData?.repeatCount || 1;
        const diamonds = (eventData?.gift?.diamond_count || 0) * giftCount;

        addToScanner({ user, giftName, coins: diamonds, count: giftCount });

        // Update scanner status
        document.getElementById('scanner-status-dot').style.background = '#00ff9d';
        document.getElementById('scanner-status-text').textContent = 'Aktif';
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
    wrap.innerHTML = '';
    const entries = Object.entries(map || {});
    if (entries.length === 0) {
        wrap.innerHTML = '<div style="color:#8b8b9a;font-size:0.75rem;font-style:italic;padding:0.5rem 0;">Henüz hediye eklenmedi. Yukarıdaki + ile ekle ya da preset seç.</div>';
        return;
    }
    entries.forEach(([gift, sec], i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:0.4rem;align-items:center;';
        row.innerHTML = `
            <input type="text" class="ov-input" placeholder="Hediye adı" value="${escapeHtml(gift)}" style="flex:1;" data-sub-key="${i}">
            <input type="number" class="ov-input" placeholder="sn" value="${sec}" min="0" step="1" style="width:90px;" data-sub-val="${i}">
            <button class="btn-icon" onclick="removeSubathonGiftRow(${i})" style="background:rgba(255,0,110,0.08);color:#ff006e;" title="Sil"><i class="fas fa-times"></i></button>
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
    if (ov.overlayType === 'subathon') writeSubathonConfig(ov.config || {});
};
const _origReset = resetOverlayForm;
resetOverlayForm = function (info) {
    _origReset(info);
    if (info.overlayType === 'subathon') {
        writeSubathonConfig({ startSeconds: 3600, perCoin: 0, perGift: {} });
    }
};
// ==================== END SUBATHON TIMER ====================

// ==================== WHEEL OF ACTIONS ====================
const WHEEL_COLORS = ['#ff006e', '#bd00ff', '#00d9ff', '#00ff9d', '#ffd000', '#ff7800', '#7c3aed', '#10b981'];
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
        { label: 'Like spam', weight: 2 },
        { label: 'Selam ver', weight: 3 },
        { label: 'Mesaj oku', weight: 2 },
        { label: 'Şaka yap', weight: 1 },
        { label: 'Bonus puan', weight: 1 },
        { label: 'Soru sor', weight: 1 },
        { label: 'JACKPOT', weight: 0.3 },
    ],
};

function renderWheelSliceRows(slices) {
    const wrap = document.getElementById('ov-wheel-slices');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!slices || slices.length === 0) {
        wrap.innerHTML = '<div style="color:#8b8b9a;font-size:0.75rem;font-style:italic;padding:0.5rem 0;">Henüz dilim yok. + ile ekle ya da preset seç.</div>';
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
            <button class="btn-icon" onclick="removeWheelSlice(${i})" style="background:rgba(255,0,110,0.08);color:#ff006e;" title="Sil"><i class="fas fa-times"></i></button>
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

function addWheelSlice() {
    const slices = readWheelSlices();
    slices.push({ label: '', weight: 1, color: WHEEL_COLORS[slices.length % WHEEL_COLORS.length] });
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
