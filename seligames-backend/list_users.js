const User = require('./src/models/User');
const sequelize = require('./src/database');

async function listUsers() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll();
        console.log('Users:', users.map(u => ({ id: u.id, email: u.email, username: u.username })));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

listUsers();
