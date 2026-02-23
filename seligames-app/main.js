const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { WebcastPushConnection } = require('tiktok-live-connector');

let mainWindow;
let tiktokConnection = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
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

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('login', async (event, { email, password }) => {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', { email, password });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('get-mods', async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/mods');
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-profile', async (event, token) => {
    try {
        const response = await axios.get('http://localhost:3000/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});

ipcMain.handle('connect-tiktok', async (event, { token, tiktokUsername }) => {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/connect-tiktok',
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
        const response = await axios.post('http://localhost:3000/api/auth/toggle-live',
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
        const response = await axios.post('http://localhost:3000/api/auth/change-password',
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
        const response = await axios.get('http://localhost:3000/api/statistics', {
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
            requestPollingIntervalMs: 1000
        });

        // Connect
        const state = await tiktokConnection.connect();
        console.log('✅ Connected to TikTok Live!', state);

        // Send connection success to renderer
        mainWindow.webContents.send('tiktok-connected', {
            username: username,
            roomInfo: state.roomInfo,
            viewerCount: state.viewerCount || 0
        });

        // Event listeners
        tiktokConnection.on('chat', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'chat',
                data: {
                    user: data.uniqueId,
                    nickname: data.nickname,
                    comment: data.comment
                }
            });
        });

        tiktokConnection.on('gift', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'gift',
                data: {
                    user: data.uniqueId,
                    nickname: data.nickname,
                    giftName: data.giftName,
                    giftId: data.giftId,
                    repeatCount: data.repeatCount,
                    diamondCount: data.diamondCount
                }
            });
        });

        tiktokConnection.on('like', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'like',
                data: {
                    user: data.uniqueId,
                    nickname: data.nickname,
                    likeCount: data.likeCount,
                    totalLikeCount: data.totalLikeCount
                }
            });
        });

        tiktokConnection.on('member', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'member',
                data: {
                    user: data.uniqueId,
                    nickname: data.nickname
                }
            });
        });

        tiktokConnection.on('follow', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'follow',
                data: {
                    user: data.uniqueId,
                    nickname: data.nickname
                }
            });
        });

        tiktokConnection.on('share', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'share',
                data: {
                    user: data.uniqueId,
                    nickname: data.nickname
                }
            });
        });

        tiktokConnection.on('roomUser', (data) => {
            mainWindow.webContents.send('tiktok-event', {
                type: 'roomUser',
                data: {
                    viewerCount: data.viewerCount
                }
            });
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
        const response = await axios.get('http://localhost:3000/api/auth/settings', {
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
        const response = await axios.post('http://localhost:3000/api/auth/settings',
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
        const response = await axios.post('http://localhost:3000/api/auth/settings/gift-sounds',
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
        const response = await axios.post('http://localhost:3000/api/auth/settings',
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
        const response = await axios.post('http://localhost:3000/api/auth/profile',
            profileData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
});
