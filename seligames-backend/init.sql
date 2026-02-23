-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mods table
CREATE TABLE IF NOT EXISTS mods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    gameTitle TEXT,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    imageUrl TEXT,
    downloadUrl TEXT,
    features TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mod Usage / Statistics
CREATE TABLE IF NOT EXISTS mod_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mod_id INTEGER,
    usage_count INTEGER DEFAULT 0,
    last_used DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (mod_id) REFERENCES mods(id)
);

-- TikTok Connections
CREATE TABLE IF NOT EXISTS tiktok_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    tiktok_username TEXT,
    is_active BOOLEAN DEFAULT 0,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
