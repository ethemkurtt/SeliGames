require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('./src/database');
const User = require('./src/models/User');

const args = process.argv.slice(2).filter((a) => a !== '--create');
const createIfMissing = process.argv.includes('--create');
const email = args[0];
const plain = args[1];

if (!email || !plain) {
    console.error('Usage: node set-user-password.js <email> <newPassword> [--create]');
    process.exit(1);
}

(async () => {
    try {
        await connectDB();
        const emailLower = email.toLowerCase();
        const hash = await bcrypt.hash(plain, 10);

        let u = await User.findOne({ email: emailLower });
        if (u) {
            u.password = hash;
            await u.save();
            console.log('Password updated for', emailLower);
        } else if (createIfMissing) {
            u = await User.create({
                email: emailLower,
                username: 'admin_seligames',
                password: hash,
                role: 'admin',
                subscriptionPlan: 'ultra',
                subscriptionStatus: 'active'
            });
            console.log('User created with password for', emailLower);
        } else {
            console.error('User not found:', emailLower, '(use --create to add)');
            process.exit(1);
        }
    } finally {
        await mongoose.connection.close();
    }
})();
