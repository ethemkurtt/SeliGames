const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getAppConfig: () => ipcRenderer.invoke('get-app-config'),
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
    onTikTokDisconnected: (callback) => ipcRenderer.on('tiktok-disconnected', (event, data) => callback(data)),

    // Overlay API
    getOverlays: (query) => ipcRenderer.invoke('get-overlays', query),
    getOverlay: (id) => ipcRenderer.invoke('get-overlay', id),
    createOverlay: (data) => ipcRenderer.invoke('create-overlay', data),
    updateOverlay: (id, data) => ipcRenderer.invoke('update-overlay', id, data),
    deleteOverlay: (id) => ipcRenderer.invoke('delete-overlay', id),
    resetOverlay: (id) => ipcRenderer.invoke('reset-overlay', id),
    incrementOverlay: (id, amount) => ipcRenderer.invoke('increment-overlay', id, amount),

    // Backend Socket Bridge
    connectBackendSocket: () => ipcRenderer.invoke('connect-backend-socket'),
    disconnectBackendSocket: () => ipcRenderer.invoke('disconnect-backend-socket'),
    forwardTikTokEvent: (data) => ipcRenderer.invoke('forward-tiktok-event', data),
    startLiveSession: () => ipcRenderer.invoke('start-live-session'),
    getBackendSocketStatus: () => ipcRenderer.invoke('get-backend-socket-status'),
    onBackendSocketStatus: (callback) => ipcRenderer.on('backend-socket-status', (event, data) => callback(data)),
    onEventProcessed: (callback) => ipcRenderer.on('event-processed', (event, data) => callback(data)),

    // Event API
    getEvents: (query) => ipcRenderer.invoke('get-events', query),
    getEventStats: (query) => ipcRenderer.invoke('get-event-stats', query),
    getEventSessions: () => ipcRenderer.invoke('get-event-sessions'),

    // Gift catalog + per-gift sound map
    getGiftCatalog: () => ipcRenderer.invoke('get-gift-catalog'),
    setGiftSoundMapping: (giftName, entry) => ipcRenderer.invoke('set-gift-sound-mapping', giftName, entry),
    replaceGiftSoundMap: (map) => ipcRenderer.invoke('replace-gift-sound-map', map),

    // Mods & per-user mod config
    createMod: (data) => ipcRenderer.invoke('create-mod', data),
    updateMod: (id, data) => ipcRenderer.invoke('update-mod', id, data),
    deleteMod: (id) => ipcRenderer.invoke('delete-mod', id),
    getModConfig: (modId) => ipcRenderer.invoke('get-mod-config', modId),
    saveModConfig: (modId, data) => ipcRenderer.invoke('save-mod-config', modId, data),
    setModGiftAction: (modId, giftName, action) => ipcRenderer.invoke('set-mod-gift-action', modId, giftName, action),
    installMod: (modId, installPath) => ipcRenderer.invoke('install-mod', modId, installPath),
    uninstallMod: (modId) => ipcRenderer.invoke('uninstall-mod', modId),
    getInstalledMods: () => ipcRenderer.invoke('get-installed-mods'),
    pickInstallDirectory: (modTitle) => ipcRenderer.invoke('pick-install-directory', modTitle),
    executeAction: (action) => ipcRenderer.invoke('execute-action', action)
});
