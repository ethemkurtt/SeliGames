// TikTok Live WebSocket Handler Update
// Copy this code and replace the ws.onmessage section in renderer.js

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        // Eulerstream API sends messages with keys like:
        // "webcastChatMessage", "webcastGiftMessage", "webcastMemberMessage", etc.
        const messageKeys = Object.keys(data);

        // Only log if it's not just control messages
        const hasActualData = messageKeys.some(k => !k.toLowerCase().includes('control'));
        if (hasActualData) {
            const simpleTypes = messageKeys
                .filter(k => !k.toLowerCase().includes('control'))
                .map(k => k.replace('webcast', '').replace('Message', '').replace('webCast', ''));
            console.log('📨 Received:', simpleTypes.join(', '));
        }

        // Process each message type
        messageKeys.forEach(key => {
            const normalizedKey = key.toLowerCase();
            const messageData = data[key];

            // Skip empty messages or control messages
            if (!messageData || typeof messageData !== 'object' || normalizedKey.includes('control')) {
                return;
            }

            // Chat/Comment messages
            if (normalizedKey.includes('chat') || normalizedKey.includes('comment')) {
                handleChatMessage(messageData);
            }
            // Gift messages
            else if (normalizedKey.includes('gift')) {
                handleGiftMessage(messageData);
            }
            // Like messages
            else if (normalizedKey.includes('like')) {
                handleLikeMessage(messageData);
            }
            // Member join messages
            else if (normalizedKey.includes('member')) {
                handleMemberMessage(messageData);
            }
            // Social messages (follow, share)
            else if (normalizedKey.includes('social') || normalizedKey.includes('follow') || normalizedKey.includes('share')) {
                handleSocialMessage(messageData);
            }
            // Room stats
            else if (normalizedKey.includes('room') && !normalizedKey.includes('user')) {
                handleRoomStats(messageData);
            }
            // Log unknown types (for debugging new message types)
            else if (!normalizedKey.includes('control')) {
                console.log(`❓ Unknown type: ${key.replace('webcast', '').replace('Message', '')}`);
            }
        });

    } catch (error) {
        console.error('❌ Parse error:', error.message);
    }
};
