const path = require('path');
let dbConn;

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        dbConn.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        dbConn.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        dbConn.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
};

const connect = async () => {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/database.sqlite');
    
    dbConn = new sqlite3.Database(dbPath);
    
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            studentId TEXT,
            department TEXT
        )
    `);
    
    await run(`
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            studentId TEXT NOT NULL,
            studentName TEXT NOT NULL,
            grade TEXT,
            type TEXT,
            location TEXT,
            description TEXT NOT NULL,
            date TEXT,
            severity TEXT,
            parentContact TEXT,
            reportedBy TEXT,
            timestamp TEXT
        )
    `);
    
    await run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT,
            timestamp TEXT,
            read INTEGER DEFAULT 0
        )
    `);
};

const normalize = (row) => {
    if (!row) return null;
    const clean = { ...row };
    clean._id = clean.id;
    if (clean.read !== undefined) {
        clean.read = clean.read === 1;
    }
    return clean;
};

module.exports = {
    connect,
    users: {
        find: async (query = {}) => {
            let sql = 'SELECT * FROM users';
            const params = [];
            const conditions = [];
            for (let key in query) {
                conditions.push(`${key} = ?`);
                params.push(query[key]);
            }
            if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
            const rows = await all(sql, params);
            return rows.map(normalize);
        },
        findOne: async (query = {}) => {
            let sql = 'SELECT * FROM users';
            const params = [];
            const conditions = [];
            for (let key in query) {
                conditions.push(`${key} = ?`);
                params.push(query[key]);
            }
            if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
            sql += ' LIMIT 1';
            const row = await get(sql, params);
            return normalize(row);
        },
        create: async (data) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const keys = ['id', ...Object.keys(data)];
            const placeholders = keys.map(() => '?').join(', ');
            const values = [id, ...Object.values(data)];
            await run(`INSERT INTO users (${keys.join(', ')}) VALUES (${placeholders})`, values);
            return normalize({ id, ...data });
        },
        findByIdAndUpdate: async (id, data) => {
            const assignments = [];
            const params = [];
            for (let key in data) {
                assignments.push(`${key} = ?`);
                params.push(data[key]);
            }
            params.push(id);
            await run(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, params);
            const row = await get('SELECT * FROM users WHERE id = ?', [id]);
            return normalize(row);
        },
        findByIdAndDelete: async (id) => {
            const res = await run('DELETE FROM users WHERE id = ?', [id]);
            return res.changes > 0;
        }
    },
    incidents: {
        find: async (query = {}) => {
            let sql = 'SELECT * FROM incidents';
            const params = [];
            const conditions = [];
            for (let key in query) {
                if (key === 'search') {
                    conditions.push('(studentName LIKE ? OR studentId LIKE ? OR description LIKE ?)');
                    const searchVal = `%${query.search}%`;
                    params.push(searchVal, searchVal, searchVal);
                    continue;
                }
                if (key === 'type' && (query.type === 'All Categories' || query.type === 'Any Category')) {
                    continue;
                }
                if (key === 'severity' && query.severity === 'Any Severity') {
                    continue;
                }
                if (key === 'severity') {
                    conditions.push('LOWER(severity) = LOWER(?)');
                    params.push(query.severity);
                    continue;
                }
                conditions.push(`${key} = ?`);
                params.push(query[key]);
            }
            if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
            const rows = await all(sql, params);
            return rows.map(normalize);
        },
        findOne: async (query = {}) => {
            let sql = 'SELECT * FROM incidents';
            const params = [];
            const conditions = [];
            for (let key in query) {
                conditions.push(`${key} = ?`);
                params.push(query[key]);
            }
            if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
            sql += ' LIMIT 1';
            const row = await get(sql, params);
            return normalize(row);
        },
        create: async (data) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const keys = ['id', ...Object.keys(data)];
            const placeholders = keys.map(() => '?').join(', ');
            const values = [id, ...Object.values(data)];
            await run(`INSERT INTO incidents (${keys.join(', ')}) VALUES (${placeholders})`, values);
            return normalize({ id, ...data });
        },
        findByIdAndUpdate: async (id, data) => {
            const assignments = [];
            const params = [];
            for (let key in data) {
                assignments.push(`${key} = ?`);
                params.push(data[key]);
            }
            params.push(id);
            await run(`UPDATE incidents SET ${assignments.join(', ')} WHERE id = ?`, params);
            const row = await get('SELECT * FROM incidents WHERE id = ?', [id]);
            return normalize(row);
        },
        findByIdAndDelete: async (id) => {
            const res = await run('DELETE FROM incidents WHERE id = ?', [id]);
            return res.changes > 0;
        }
    },
    notifications: {
        find: async (query = {}) => {
            let sql = 'SELECT * FROM notifications';
            const params = [];
            const conditions = [];
            for (let key in query) {
                conditions.push(`${key} = ?`);
                params.push(query[key]);
            }
            if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
            const rows = await all(sql, params);
            return rows.map(normalize);
        },
        create: async (data) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const finalData = { ...data };
            if (finalData.read !== undefined) {
                finalData.read = finalData.read ? 1 : 0;
            }
            const keys = ['id', ...Object.keys(finalData)];
            const placeholders = keys.map(() => '?').join(', ');
            const values = [id, ...Object.values(finalData)];
            await run(`INSERT INTO notifications (${keys.join(', ')}) VALUES (${placeholders})`, values);
            return normalize({ id, ...data });
        },
        markAllRead: async () => {
            await run('UPDATE notifications SET read = 1');
            const rows = await all('SELECT * FROM notifications');
            return rows.map(normalize);
        },
        findByIdAndDelete: async (id) => {
            const res = await run('DELETE FROM notifications WHERE id = ?', [id]);
            return res.changes > 0;
        }
    }
};
