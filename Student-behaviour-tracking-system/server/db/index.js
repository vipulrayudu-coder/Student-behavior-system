const jsonDb = require('./jsonDb');

let activeDb = jsonDb;

const connect = async () => {
    const dbType = (process.env.DB_TYPE || 'json').toLowerCase();
    console.log(`[Database] Initializing connection with type: ${dbType}`);
    
    if (dbType === 'mongodb') {
        try {
            const mongoDb = require('./mongoDb');
            await mongoDb.connect();
            activeDb = mongoDb;
            console.log('✅ [Database] Connected successfully to MongoDB.');
        } catch (err) {
            console.error('❌ [Database] Failed to connect to MongoDB. Falling back to JSON database.', err.message);
            activeDb = jsonDb;
        }
    } else if (dbType === 'sqlite') {
        try {
            const sqliteDb = require('./sqliteDb');
            await sqliteDb.connect();
            activeDb = sqliteDb;
            console.log('✅ [Database] Connected successfully to SQLite.');
        } catch (err) {
            console.error('❌ [Database] Failed to connect to SQLite. Falling back to JSON database.', err.message);
            activeDb = jsonDb;
        }
    } else {
        console.log('✅ [Database] Using local JSON database storage.');
    }
};

module.exports = {
    connect,
    users: {
        find: (query) => activeDb.users.find(query),
        findOne: (query) => activeDb.users.findOne(query),
        create: (data) => activeDb.users.create(data),
        findByIdAndUpdate: (id, data) => activeDb.users.findByIdAndUpdate(id, data),
        findByIdAndDelete: (id) => activeDb.users.findByIdAndDelete(id)
    },
    incidents: {
        find: (query) => activeDb.incidents.find(query),
        findOne: (query) => activeDb.incidents.findOne(query),
        create: (data) => activeDb.incidents.create(data),
        findByIdAndUpdate: (id, data) => activeDb.incidents.findByIdAndUpdate(id, data),
        findByIdAndDelete: (id) => activeDb.incidents.findByIdAndDelete(id)
    },
    notifications: {
        find: (query) => activeDb.notifications.find(query),
        create: (data) => activeDb.notifications.create(data),
        markAllRead: () => activeDb.notifications.markAllRead(),
        findByIdAndDelete: (id) => activeDb.notifications.findByIdAndDelete(id)
    }
};
