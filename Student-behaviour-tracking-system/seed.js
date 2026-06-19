const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'data/users.json');

const seed = async () => {
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const studentPassword = await bcrypt.hash('Student@123', 10);

    const users = [
        {
            id: '1',
            name: 'KLH Admin',
            email: 'klhAdmin@gmail.com',
            password: adminPassword,
            role: 'admin'
        },
        {
            id: '2',
            name: 'Student',
            email: 'Student@gmail.com',
            password: studentPassword,
            role: 'student',
            studentId: 'ST-1001'
        }
    ];

    if (!fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'));
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Database seeded with requested credentials:');
    console.log('Admin: klhAdmin@gmail.com / Admin@123');
    console.log('Student: Student@gmail.com / Student@123');
};

seed();
