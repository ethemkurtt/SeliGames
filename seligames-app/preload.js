const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('api', {
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    getMods: () => ipcRenderer.invoke('get-mods'),
    getProfile: (token) => ipcRenderer.invoke('get-profile', token),
    connectTiktok: (data) => ipcRenderer.invoke('connect-tiktok', data),
    toggleLive: (data) => ipcRenderer.invoke('toggle-live', data),
    changePassword: (data) => ipcRenderer.invoke('change-password', data),
    getStatistics: (token) => ipcRenderer.invoke('get-statistics', token),
    openExternal: (url) => shell.openExternal(url),
    saveMod: (data) => ipcRenderer.invoke('save-mod', data),
    
    // Settings API
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
    updateGiftSound: (data) => ipcRenderer.invoke('update-gift-sound', data),
    updateTiktokUsername: (username) => ipcRenderer.invoke('update-tiktok-username', username),
    updateProfile: (data) => ipcRenderer.invoke('update-profile', data),
    
    // TikTok Live (native connector)
    connectTikTokLive: (username) => ipcRenderer.invoke('connect-tiktok-live', username),
    disconnectTikTokLive: () => ipcRenderer.invoke('disconnect-tiktok-live'),
    onTikTokConnected: (callback) => ipcRenderer.on('tiktok-connected', (event, data) => callback(data)),
    onTikTokEvent: (callback) => ipcRenderer.on('tiktok-event', (event, data) => callback(data)),
    onTikTokDisconnected: (callback) => ipcRenderer.on('tiktok-disconnected', (event, data) => callback(data))
});
