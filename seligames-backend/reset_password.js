const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const sequelize = require('./src/database');

async function resetPassword(email, newPassword) {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User not found');
            return;
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        console.log(`Password for ${email} reset to ${newPassword}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

const email = process.argv[2];
const password = process.argv[3];

if (email && password) {
    resetPassword(email, password);
} else {
    console.log('Usage: node reset_password.js <email> <new_password>');
}
