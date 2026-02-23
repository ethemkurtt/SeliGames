const sequelize = require('./src/database');
const Mod = require('./src/models/Mod');

async function addGTAMod() {
    try {
        await sequelize.sync();

        // Check if GTA mod already exists
        const existing = await Mod.findOne({ where: { title: 'GTA V Kaos Modu' } });

        if (existing) {
            console.log('GTA V Kaos Modu zaten mevcut!');
            return;
        }

        // Create GTA Chaos Mod
        const gtaMod = await Mod.create({
            title: 'GTA V Kaos Modu',
            description: 'TikTok canlı yayınında izleyicileriniz oyununuzu kontrol etsin! Hediyeler, yorumlar ve beğeniler ile GTA V\'de kaos yaratın. Araçlar patlasın, havadan para yağsın, polis kovalasın!',
            version: '1.0.0',
            gameTitle: 'Grand Theft Auto V',
            downloadUrl: 'https://seligames.com/downloads/gta-chaos-mod-v1.0.0.zip'
        });

        console.log('✅ GTA V Kaos Modu başarıyla eklendi!');
        console.log(gtaMod.toJSON());

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

addGTAMod();
