const sequelize = require('./src/database');
const Mod = require('./src/models/Mod');

const mods = [
    {
        title: 'GTA V Kaos Modu',
        gameTitle: 'GTA V',
        description: 'TikTok canlı yayınında izleyicileriniz oyununuzu kontrol etsin! Hediyelerle araçlar spawn edin, hava durumunu değiştirin!',
        version: '1.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-kaos.zip'
    },
    {
        title: 'Minecraft Kaos Modu',
        gameTitle: 'Minecraft',
        description: 'TikTok canlı yayınlarınızda Minecraft dünyasını izleyicilerinize kontrol ettirin! Mob spawn, blok yerleştirme ve daha fazlası!',
        version: '1.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-kaos.zip'
    },
    {
        title: 'GTA V Hava Durumu Kontrolü',
        gameTitle: 'GTA V',
        description: 'İzleyicileriniz TikTok\'tan hediye göndererek oyundaki hava durumunu kontrol etsin! Yağmur, güneş, fırtına ve daha fazlası!',
        version: '1.2.0',
        imageUrl: 'https://images.unsplash.com/photo-1601134467661-3d775b999c8b?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-weather.zip'
    },
    {
        title: 'GTA V Araç Spawn Deluxe',
        gameTitle: 'GTA V',
        description: 'Her TikTok hediyesi için farklı lüks ve özel araçlar! Süper arabalar, helikopterler, tanklar ve daha fazlası!',
        version: '2.1.0',
        imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-vehicles.zip'
    },
    {
        title: 'Minecraft Blok Sihirbazı',
        gameTitle: 'Minecraft',
        description: 'İzleyiciler TikTok\'tan özel bloklar yerleştirsin! TNT, elmas blokları, beacon ve daha fazlası!',
        version: '1.5.0',
        imageUrl: 'https://images.unsplash.com/photo-1580327344181-c1163234e5a0?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-blocks.zip'
    },
    {
        title: 'GTA V Para Yağmuru Modu',
        gameTitle: 'GTA V',
        description: 'TikTok hediyeleriyle oyunda para kazanın! Her hediye farklı miktarda para yağmuru!',
        version: '1.3.0',
        imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-money.zip'
    },
    {
        title: 'Minecraft Mob Ordusu',
        gameTitle: 'Minecraft',
        description: 'TikTok hediyeleriyle farklı mob orduları spawn edin! Dost veya düşman, sizin seçiminiz!',
        version: '2.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1578641373742-03ca20fdc744?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-mobs.zip'
    },
    {
        title: 'GTA V Zaman Yolcusu',
        gameTitle: 'GTA V',
        description: 'Oyunun zamanını kontrol edin! Gece, gündüz, gün batımı - TikTok hediyeleriyle zaman akışını değiştirin!',
        version: '1.1.0',
        imageUrl: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-time.zip'
    },
    {
        title: 'GTA V Silah Armerisi',
        gameTitle: 'GTA V',
        description: 'TikTok hediyeleriyle farklı silahlar edinin! Tabancadan roketlere kadar her şey!',
        version: '1.4.0',
        imageUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&q=80',
        downloadUrl: 'https://example.com/mods/gta-weapons.zip'
    },
    {
        title: 'Minecraft Havai Fişek Şovu',
        gameTitle: 'Minecraft',
        description: 'İzleyicileriniz TikTok\'tan özel havai fişek gösterileri başlatsın! Renkli ve büyüleyici efektler!',
        version: '1.0.0',
        imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
        downloadUrl: 'https://example.com/mods/minecraft-fireworks.zip'
    }
];

async function seedMods() {
    try {
        // Sync database
        await sequelize.sync({ force: true });
        console.log('✅ Database synced');

        // Clear existing mods
        await Mod.destroy({ where: {} });
        console.log('✅ Cleared existing mods');

        // Insert mods
        for (const mod of mods) {
            await Mod.create(mod);
            console.log(`✅ Added: ${mod.title}`);
        }

        console.log(`\n🎉 Successfully added ${mods.length} mods!`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding mods:', error);
        process.exit(1);
    }
}

seedMods();
