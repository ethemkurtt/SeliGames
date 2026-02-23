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

            // Show app
            loginOverlay.classList.add('hidden');
            appContainer.classList.add('active');

            // Load user info
            loadUserInfo(result.data.user);
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
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active to clicked nav item
    event.target.closest('.nav-item').classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show selected page
    document.getElementById(page + '-page').classList.add('active');
    
    // Load page-specific data
    if (page === 'tiktok') {
        loadTikTokUsername();
    } else if (page === 'settings') {
        loadSettings();
    } else if (page === 'profile') {
        loadProfile();
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

async function loadMods() {
    try {
        const modsStatus = document.getElementById('mods-status');
        const modsGrid = document.getElementById('mods-grid');
        const noMods = document.getElementById('no-mods');

        if (modsStatus) modsStatus.style.display = 'block';
        if (modsGrid) modsGrid.innerHTML = '';
        if (noMods) noMods.style.display = 'none';

        const result = await window.api.getMods();

        if (result.success) {
            allMods = result.data;

            if (modsStatus) modsStatus.style.display = 'none';

            // Update stats
            const totalModsEl = document.getElementById('total-mods');
            const featuredModsEl = document.getElementById('featured-mods');
            if (totalModsEl) totalModsEl.textContent = allMods.length;
            if (featuredModsEl) featuredModsEl.textContent = allMods.length;

            filterMods();
        }
    } catch (error) {
        console.error('Failed to load mods:', error);
        const modsStatus = document.getElementById('mods-status');
        if (modsStatus) {
            modsStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ff006e; margin-bottom: 1rem;"></i><p>Modlar yüklenemedi</p>';
        }
    }
}

// Filter Mods
function filterMods() {
    const searchTerm = document.getElementById('mod-search')?.value.toLowerCase() || '';
    const gameFilter = document.getElementById('game-filter')?.value || 'all';
    const sortBy = document.getElementById('mod-sort')?.value || 'newest';

    let filteredMods = [...allMods];

    // Search filter
    if (searchTerm) {
        filteredMods = filteredMods.filter(mod =>
            mod.title.toLowerCase().includes(searchTerm) ||
            mod.description.toLowerCase().includes(searchTerm) ||
            (mod.gameTitle && mod.gameTitle.toLowerCase().includes(searchTerm))
        );
    }

    // Game filter
    if (gameFilter !== 'all') {
        filteredMods = filteredMods.filter(mod => {
            const gameTitle = (mod.gameTitle || mod.title).toLowerCase();
            if (gameFilter === 'gta') return gameTitle.includes('gta');
            if (gameFilter === 'minecraft') return gameTitle.includes('minecraft');
            return true;
        });
    }

    // Sort
    if (sortBy === 'name') {
        filteredMods.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'popular') {
        // Sort by downloads or popularity if available
        filteredMods.reverse();
    }

    displayMods(filteredMods);
}

// Display Mods
function displayMods(mods) {
    const modsGrid = document.getElementById('mods-grid');
    const noMods = document.getElementById('no-mods');

    if (!modsGrid) return;

    modsGrid.innerHTML = '';

    if (mods.length === 0) {
        if (noMods) noMods.style.display = 'block';
        return;
    }

    if (noMods) noMods.style.display = 'none';

    mods.forEach(mod => {
        const modCard = document.createElement('div');
        modCard.className = 'mod-card';
        modCard.onclick = () => openModModal(mod);

        modCard.innerHTML = `
            <div style="position: relative;">
                <div class="mod-badge">OYUN</div>
                <img src="${mod.imageUrl}" alt="${mod.title}" class="mod-image">
            </div>
            <div class="mod-content">
                <div class="mod-title">${mod.gameTitle || mod.title}</div>
                <span class="mod-version">v${mod.version}</span>
                <p class="mod-description">${mod.description}</p>
            </div>
        `;

        modsGrid.appendChild(modCard);
    });
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

// Load mods when mods page is opened
const originalNavigateTo = navigateTo;
navigateTo = function (page) {
    originalNavigateTo.call(this, page);
    if (page === 'mods') {
        loadMods();
    }
};

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

// Start Live Stream (uses backend username)
async function startLiveStream() {
    if (!userTikTokUsername) {
        alert('⚠️ TikTok kullanıcı adınız bulunamadı!\n\nLütfen önce Profil sayfasından TikTok kullanıcı adınızı ekleyin.');
        navigateTo('profile');
        return;
    }
    
    // Start connection
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

function handleTikTokEvent(msg) {
    console.log('🎯 Processing Event:', msg);
    console.log('🔑 Event type:', msg.type || msg.event || msg.action || 'UNKNOWN');
    console.log('📦 Event data:', msg.data || msg);

    // Eulerstream format: msg.type is case-sensitive!
    const eventType = msg.type || msg.event || '';
    const eventData = msg.data || msg;

    // Extract user info with multiple fallbacks
    const getUserInfo = (data) => {
        return data?.user?.nickname ||
            data?.user?.uniqueId ||
            data?.nickname ||
            data?.uniqueId ||
            data?.username ||
            'Unknown User';
    };

    // CHAT MESSAGE
    if (eventType === 'WebcastChatMessage') {
        liveStats.comments++;
        const comment = eventData?.comment || eventData?.message || '';
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';
        console.log('💬 Chat:', getUserInfo(eventData), comment);

        addEventToFeed({
            type: 'comment',
            user: getUserInfo(eventData),
            message: comment,
            icon: '💬',
            color: '#39ff14',
            profilePhoto: profilePhoto
        });
    }
    // GIFT
    else if (eventType === 'WebcastGiftMessage') {
        liveStats.gifts++;
        liveStats.actions++;

        const giftName = eventData?.gift?.name || 'Hediye';
        const giftCount = eventData?.repeatCount || 1;
        const diamonds = (eventData?.gift?.diamond_count || 0) * giftCount;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';

        console.log('🎁 Gift:', getUserInfo(eventData), '→', giftName, 'x', giftCount);

        // Play gift sound based on diamond count
        playGiftSound(giftName, diamonds);

        addEventToFeed({
            type: 'gift',
            user: getUserInfo(eventData),
            message: `${giftName} x${giftCount} ${diamonds > 0 ? '(💎 ' + diamonds + ')' : ''}`,
            icon: '🎁',
            color: '#ff006e',
            profilePhoto: profilePhoto
        });
    }
    // LIKE
    else if (eventType === 'WebcastLikeMessage') {
        liveStats.likes++;
        const likeCount = eventData?.count || 1;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';
        console.log('❤️ Like:', getUserInfo(eventData), 'x', likeCount);

        addEventToFeed({
            type: 'like',
            user: getUserInfo(eventData),
            message: `${likeCount} kalp`,
            icon: '❤️',
            color: '#ff006e',
            profilePhoto: profilePhoto
        });
    }
    // MEMBER JOIN
    else if (eventType === 'WebcastMemberMessage') {
        liveStats.members++;
        const memberCount = eventData?.memberCount || 0;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';
        console.log('👋 Member:', getUserInfo(eventData), `(${memberCount} total)`);
        
        addEventToFeed({
            type: 'member',
            user: getUserInfo(eventData),
            message: `katıldı (${memberCount} izleyici)`,
            icon: '👋',
            color: '#00d9ff',
            profilePhoto: profilePhoto
        });
    }
    // FOLLOW/SHARE (WebcastSocialMessage)
    else if (eventType === 'WebcastSocialMessage') {
        const action = eventData?.action;
        const profilePhoto = eventData?.user?.profilePicture?.url?.[0] || '';
        liveStats.actions++;
        
        if (action === 1 || action === '1') {
            console.log('⭐ Follow:', getUserInfo(eventData));
            addEventToFeed({
                type: 'follow',
                user: getUserInfo(eventData),
                message: 'takip etti!',
                icon: '⭐',
                color: '#ffa500',
                profilePhoto: profilePhoto
            });
        } else if (action === 2 || action === '2') {
            console.log('📤 Share:', getUserInfo(eventData));
            addEventToFeed({
                type: 'share',
                user: getUserInfo(eventData),
                message: 'paylaştı!',
                icon: '📤',
                color: '#00d9ff',
                profilePhoto: profilePhoto
            });
        }
    }
    // VIEWER COUNT
    else if (eventType === 'WebcastRoomUserSeqMessage') {
        const viewerCount = eventData?.total || 0;
        liveStats.viewers = viewerCount;
        console.log(`👥 ${viewerCount} izleyici`);
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
    // Unknown events - still log them
    else {
        console.warn('⚠️ Unknown event type:', eventType);
        console.log('📋 Full message:', JSON.stringify(msg, null, 2));

        // Still try to show it in feed for debugging
        addEventToFeed({
            type: 'unknown',
            user: getUserInfo(eventData),
            message: `${eventType || 'Unknown event'}: ${JSON.stringify(eventData).substring(0, 50)}...`,
            icon: '❓',
            color: '#8b8b9a'
        });
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
        if (result.success && result.data.settings && result.data.settings.giftSounds) {
            Object.assign(giftSoundConfig, result.data.settings.giftSounds);
            
            // Update UI for all categories
            Object.entries(giftSoundConfig).forEach(([category, sound]) => {
                document.querySelectorAll(`.sound-option[data-category="${category}"]`).forEach(option => {
                    option.classList.remove('active');
                });
                document.querySelector(`.sound-option[data-category="${category}"][data-sound="${sound}"]`)?.classList.add('active');
            });
            
            console.log('✅ Sound preferences loaded from backend:', giftSoundConfig);
        }
    } catch (error) {
        console.error('Failed to load sound preferences:', error);
    }
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
function playSound(soundName) {
    // Check if sounds are enabled
    const soundsEnabled = document.getElementById('gift-sounds-toggle')?.checked !== false;
    if (!soundsEnabled) return;
    
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
                
                gainNode.gain.setValueAtTime(sound.volume, startTime);
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
            
            gainNode.gain.setValueAtTime(sound.volume, audioContext.currentTime);
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
    const tier = getGiftTier(coins);
    const soundName = giftSoundConfig[tier];
    
    console.log(`🔊 Playing ${tier} gift sound: ${soundName} for ${giftName} (${coins} coins)`);
    playSound(soundName);
}

// ==================== END SOUND SYSTEM ====================
