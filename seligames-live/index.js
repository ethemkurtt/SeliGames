// Include TikTok-Live-Connector package.
const { WebcastPushConnection } = require('tiktok-live-connector');
const config = require('./config');

// TikTok kullanıcı adını al (config'den veya komut satırından)
const username = process.argv[2] || config.username;

console.log(`🔄 Connecting to @${username}'s TikTok Live...`);
console.log(`⚠️  Make sure the user is LIVE!`);
console.log('---');

// Create a new connection with options
const tiktokConnection = new WebcastPushConnection(username, config.options);

// Connect to the chat
tiktokConnection.connect().then(state => {
    console.log(`✅ Connected to Room ID: ${state.roomId}`);
    console.log(`👤 Streamer: @${username}`);
    console.log(`📊 Listening for events...`);
    console.log('---\n');
}).catch(err => {
    console.error('❌ Failed to connect:', err.message);
    console.log('\n💡 Tips:');
    console.log('   - Make sure the user is currently LIVE');
    console.log('   - Check if the username is correct');
    console.log('   - Try again in a few moments');
    process.exit(1);
})

// Chat messages
if (config.events.chat) {
    tiktokConnection.on('chat', data => {
        console.log(`💬 ${data.nickname}: ${data.comment}`);
    });
}

// Gifts
if (config.events.gift) {
    tiktokConnection.on('gift', data => {
        if (data.giftType === 1 && !data.repeatEnd) {
            // Skip repeated gifts (like roses) until they're finished
            return;
        }
        console.log(`🎁 ${data.nickname} sent ${data.giftName} x${data.repeatCount} (${data.diamondCount} diamonds)`);
    });
}

// Likes
if (config.events.like) {
    tiktokConnection.on('like', data => {
        console.log(`❤️  ${data.nickname} liked! (Total: ${data.totalLikeCount})`);
    });
}

// New members
if (config.events.member) {
    tiktokConnection.on('member', data => {
        console.log(`👋 ${data.nickname} joined the stream!`);
    });
}

// Room stats
if (config.events.roomUser) {
    tiktokConnection.on('roomUser', data => {
        console.log(`📊 Viewers: ${data.viewerCount}`);
    });
}

// Social (follow)
if (config.events.social) {
    tiktokConnection.on('social', data => {
        console.log(`➕ ${data.nickname} followed the streamer!`);
    });
}

// Subscribe
if (config.events.subscribe) {
    tiktokConnection.on('subscribe', data => {
        console.log(`🔔 ${data.nickname} subscribed!`);
    });
}

// Emote
if (config.events.emote) {
    tiktokConnection.on('emote', data => {
        console.log(`😀 ${data.nickname} sent emote: ${data.emoteId}`);
    });
}

// Envelope
if (config.events.envelope) {
    tiktokConnection.on('envelope', data => {
        console.log(`✉️  Envelope event detected`);
    });
}

// Disconnect handler
tiktokConnection.on('disconnected', () => {
    console.log('\n⚠️  Disconnected from TikTok Live');
    console.log('The stream may have ended or connection was lost.');
});

// Error handler
tiktokConnection.on('error', err => {
    console.error('❌ Error:', err.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    tiktokConnection.disconnect();
    process.exit(0);
});

console.log('💡 Press Ctrl+C to stop\n');
