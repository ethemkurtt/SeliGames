const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'seligames.db'));

const mods = [
    {
        title: 'GTA V Kaos Modu',
        gameTitle: 'GTA V',
        description: 'TikTok canlı yayınında izleyicileriniz oyununuzu kontrol etsin! Hediyelerle araçlar spawn edin, hava durumunu değiştirin!',
        version: '1.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-kaos.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Aranma Seviyesini Temizle', type: 'instant' },
                'heart': { action: 'Rastgele Araç Spawn', type: 'spawn' },
                'finger_heart': { action: 'Ateş Mermileri (30sn)', type: 'buff' },
                'diamond': { action: 'Para Yağmuru', type: 'reward' },
                'lion': { action: 'Süper Zıplama', type: 'buff' }
            }
        })
    },
    {
        title: 'Minecraft Kaos Modu',
        gameTitle: 'Minecraft',
        description: 'TikTok canlı yayınlarınızda Minecraft dünyasını izleyicilerinize kontrol ettirin! Mob spawn, blok yerleştirme ve daha fazlası!',
        version: '1.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-kaos.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Tekli Creeper Spawn', type: 'spawn' },
                'heart': { action: 'Rastgele Blok Yerleştir', type: 'build' },
                'finger_heart': { action: 'Elmas Ver (x3)', type: 'reward' },
                'diamond': { action: 'Havai Fişek Gösterisi', type: 'effect' },
                'lion': { action: '10 Mob Spawn', type: 'spawn' }
            }
        })
    },
    {
        title: 'GTA V Hava Durumu Kontrolü',
        gameTitle: 'GTA V',
        description: 'İzleyicileriniz TikTok\'tan hediye göndererek oyundaki hava durumunu kontrol etsin! Yağmur, güneş, fırtına ve daha fazlası!',
        version: '1.2.0',
        imageUrl: 'https://images.unsplash.com/photo-1601134467661-3d775b999c8b?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-weather.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Güneşli Hava', type: 'weather' },
                'heart': { action: 'Yağmurlu Hava', type: 'weather' },
                'finger_heart': { action: 'Fırtına', type: 'weather' },
                'diamond': { action: 'Sis', type: 'weather' },
                'lion': { action: 'Kar Yağışı', type: 'weather' }
            }
        })
    },
    {
        title: 'GTA V Araç Spawn Deluxe',
        gameTitle: 'GTA V',
        description: 'Her TikTok hediyesi için farklı lüks ve özel araçlar! Süper arabalar, helikopterler, tanklar ve daha fazlası!',
        version: '2.1.0',
        imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-vehicles.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Rastgele Araba', type: 'spawn' },
                'heart': { action: 'Süper Araba', type: 'spawn' },
                'finger_heart': { action: 'Helikopter', type: 'spawn' },
                'diamond': { action: 'Tank', type: 'spawn' },
                'lion': { action: 'Jet Uçağı', type: 'spawn' }
            }
        })
    },
    {
        title: 'Minecraft Blok Sihirbazı',
        gameTitle: 'Minecraft',
        description: 'İzleyiciler TikTok\'tan özel bloklar yerleştirsin! TNT, elmas blokları, beacon ve daha fazlası!',
        version: '1.5.0',
        imageUrl: 'https://images.unsplash.com/photo-1580327344181-c1163234e5a0?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-blocks.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Rastgele Blok Yerleştir', type: 'build' },
                'heart': { action: 'TNT Yerleştir', type: 'build' },
                'finger_heart': { action: 'Elmas Bloğu Yerleştir', type: 'build' },
                'diamond': { action: 'Beacon Yerleştir', type: 'build' },
                'lion': { action: 'Ender Portal Yerleştir', type: 'build' }
            }
        })
    },
    {
        title: 'GTA V Para Yağmuru Modu',
        gameTitle: 'GTA V',
        description: 'TikTok hediyeleriyle oyunda para kazanın! Her hediye farklı miktarda para yağmuru!',
        version: '1.3.0',
        imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-money.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: '$1000 Para Ver', type: 'reward' },
                'heart': { action: '$5000 Para Ver', type: 'reward' },
                'finger_heart': { action: '$10000 Para Ver', type: 'reward' },
                'diamond': { action: '$50000 Para Ver', type: 'reward' },
                'lion': { action: '$100000 Para Yağmuru', type: 'reward' }
            }
        })
    },
    {
        title: 'Minecraft Mob Ordusu',
        gameTitle: 'Minecraft',
        description: 'TikTok hediyeleriyle farklı mob orduları spawn edin! Dost veya düşman, sizin seçiminiz!',
        version: '2.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1578641373742-03ca20fdc744?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-mobs.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Köpek Spawn (x3)', type: 'spawn' },
                'heart': { action: 'Zombi Spawn (x5)', type: 'spawn' },
                'finger_heart': { action: 'Creeper Ordusu (x10)', type: 'spawn' },
                'diamond': { action: 'Iskelet Okçuları (x7)', type: 'spawn' },
                'lion': { action: 'Ender Dragon Reset', type: 'boss' }
            }
        })
    },
    {
        title: 'GTA V Zaman Yolcusu',
        gameTitle: 'GTA V',
        description: 'Oyunun zamanını kontrol edin! Gece, gündüz, gün batımı - TikTok hediyeleriyle zaman akışını değiştirin!',
        version: '1.1.0',
        imageUrl: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-time.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Sabah Yap', type: 'time' },
                'heart': { action: 'Öğlen Yap', type: 'time' },
                'finger_heart': { action: 'Akşam Yap', type: 'time' },
                'diamond': { action: 'Gece Yap', type: 'time' },
                'lion': { action: 'Zamanı Hızlandır', type: 'time' }
            }
        })
    },
    {
        title: 'GTA V Silah Armerisi',
        gameTitle: 'GTA V',
        description: 'TikTok hediyeleriyle farklı silahlar edinin! Tabancadan roketlere kadar her şey!',
        version: '1.4.0',
        imageUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-weapons.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Tabanca Ver', type: 'weapon' },
                'heart': { action: 'Makineli Tüfek Ver', type: 'weapon' },
                'finger_heart': { action: 'Roketatar Ver', type: 'weapon' },
                'diamond': { action: 'Minigun Ver', type: 'weapon' },
                'lion': { action: 'Tüm Silahları Ver', type: 'weapon' }
            }
        })
    },
    {
        title: 'Minecraft Havai Fişek Şovu',
        gameTitle: 'Minecraft',
        description: 'İzleyicileriniz TikTok\'tan özel havai fişek gösterileri başlatsın! Renkli ve büyüleyici efektler!',
        version: '1.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-fireworks.zip',
        features: JSON.stringify({
            events: {
                'rose': { action: 'Tek Havai Fişek', type: 'effect' },
                'heart': { action: 'Küçük Gösteri (5 adet)', type: 'effect' },
                'finger_heart': { action: 'Orta Gösteri (15 adet)', type: 'effect' },
                'diamond': { action: 'Büyük Gösteri (30 adet)', type: 'effect' },
                'lion': { action: 'Final Gösterisi (100 adet)', type: 'effect' }
            }
        })
    }
];

// Clear existing mods first
db.run('DELETE FROM mods', [], (err) => {
    if (err) {
        console.error('Error clearing mods:', err);
        return;
    }

    console.log('Cleared existing mods');

    // Insert new mods
    const stmt = db.prepare('INSERT INTO mods (title, gameTitle, description, version, imageUrl, downloadUrl, features) VALUES (?, ?, ?, ?, ?, ?, ?)');

    let insertedCount = 0;
    mods.forEach((mod, index) => {
        stmt.run(
            mod.title,
            mod.gameTitle,
            mod.description,
            mod.version,
            mod.imageUrl,
            mod.downloadUrl,
            mod.features,
            (err) => {
                if (err) {
                    console.error(`Error inserting ${mod.title}:`, err);
                } else {
                    insertedCount++;
                    console.log(`✅ ${insertedCount}/10 - ${mod.title} eklendi`);
                }

                if (insertedCount === mods.length) {
                    stmt.finalize();
                    db.close();
                    console.log('\n🎉 Tüm modlar başarıyla eklendi!');
                }
            }
        );
    });
});
