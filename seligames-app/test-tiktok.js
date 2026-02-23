const { WebcastPushConnection } = require('tiktok-live-connector');

async function test() {
    try {
        console.log('🔄 Testing connection...');
        const connection = new WebcastPushConnection('tv_asahi_news');
        
        connection.on('connected', (state) => {
            console.log('✅ Connected!', state);
        });
        
        connection.on('error', (err) => {
            console.error('❌ Error:', err);
        });
        
        await connection.connect();
        console.log('✅ Connection successful!');
        
        setTimeout(() => {
            connection.disconnect();
            process.exit(0);
        }, 3000);
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

test();
