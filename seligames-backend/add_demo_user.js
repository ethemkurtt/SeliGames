const bcrypt = require('bcryptjs');
const sequelize = require('./src/database');
const User = require('./src/models/User');

async function addDemoUser() {
    try {
        // Sync database
        await sequelize.sync();

        const email = 'demo@seligames.com';
        const password = 'demo123';
        const username = 'DemoUser';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            console.log('⚠️  Demo kullanıcı zaten mevcut!');
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email: demo@seligames.com');
            console.log('🔑 Şifre: demo123');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            console.log('🎮 Bu bilgilerle giriş yapabilirsiniz!');
            process.exit(0);
            return;
        }

        // Create user
        await User.create({
            email,
            password: hashedPassword,
            username,
            role: 'user',
            subscriptionPlan: 'pro', // Demo için pro plan
            subscriptionStatus: 'active'
        });

        console.log('✅ Demo kullanıcı başarıyla eklendi!');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: demo@seligames.com');
        console.log('🔑 Şifre: demo123');
        console.log('👤 Kullanıcı Adı: DemoUser');
        console.log('🎁 Plan: Pro (Demo)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('🎮 Artık giriş yapabilirsiniz!');

    } catch (error) {
        console.error('❌ Hata:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Also add a few more demo users for testing
async function addMultipleDemoUsers() {
    try {
        await sequelize.sync();

        const users = [
            {
                email: 'demo@seligames.com',
                password: 'demo123',
                username: 'DemoUser',
                subscriptionPlan: 'pro'
            },
            {
                email: 'admin@seligames.com',
                password: 'admin123',
                username: 'Admin',
                role: 'admin',
                subscriptionPlan: 'ultra'
            },
            {
                email: 'test@test.com',
                password: 'test123',
                username: 'TestUser',
                subscriptionPlan: 'free'
            }
        ];

        console.log('🚀 Demo kullanıcılar ekleniyor...\n');

        for (const userData of users) {
            const existing = await User.findOne({ where: { email: userData.email } });

            if (!existing) {
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                await User.create({
                    ...userData,
                    password: hashedPassword,
                    role: userData.role || 'user',
                    subscriptionStatus: 'active'
                });
                console.log(`✅ ${userData.username} eklendi`);
            } else {
                console.log(`⚠️  ${userData.username} zaten mevcut`);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 GİRİŞ BİLGİLERİ:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('1️⃣  Demo Kullanıcı (Pro):');
        console.log('   📧 demo@seligames.com');
        console.log('   🔑 demo123');
        console.log('');
        console.log('2️⃣  Admin (Ultra):');
        console.log('   📧 admin@seligames.com');
        console.log('   🔑 admin123');
        console.log('');
        console.log('3️⃣  Test Kullanıcı (Free):');
        console.log('   📧 test@test.com');
        console.log('   🔑 test123');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎮 Herhangi biriyle giriş yapabilirsiniz!');
        console.log('');

    } catch (error) {
        console.error('❌ Hata:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Run multiple users version
addMultipleDemoUsers();
