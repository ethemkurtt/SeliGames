const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/seligames';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            // MongoDB Atlas için gerekli ayarlar
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Atlas bağlantısı başarılı');
    } catch (error) {
        console.error('❌ MongoDB bağlantı hatası:', error.message);
        process.exit(1);
    }
};

// Bağlantı event'lerini dinle
mongoose.connection.on('connected', () => {
    console.log('Mongoose bağlandı');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose bağlantı hatası:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose bağlantısı kesildi');
});

module.exports = { connectDB, mongoose };
