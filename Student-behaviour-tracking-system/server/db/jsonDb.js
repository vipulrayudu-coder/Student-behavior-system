const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const INCIDENTS_FILE = path.join(__dirname, '../../data/incidents.json');
const NOTIFICATIONS_FILE = path.join(__dirname, '../../data/notifications.json');

// Helper to read JSON files synchronously (caching reads is handled internally if needed, otherwise read directly)
const readJson = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error(`Error reading database file ${filePath}:`, err);
        return [];
    }
};

// Helper to write JSON files asynchronously
const writeJson = async (filePath, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.error(`Error writing to database file ${filePath}:`, err);
                return reject(err);
            }
            resolve();
        });
    });
};

module.exports = {
    users: {
        find: async (query = {}) => {
            const users = readJson(USERS_FILE);
            return users.filter(u => {
                for (let key in query) {
                    if (u[key] !== query[key]) return false;
                }
                return true;
            }).map(u => ({ ...u, _id: u.id }));
        },
        findOne: async (query = {}) => {
            const users = readJson(USERS_FILE);
            const user = users.find(u => {
                for (let key in query) {
                    if (u[key] !== query[key]) return false;
                }
                return true;
            });
            return user ? { ...user, _id: user.id } : null;
        },
        create: async (data) => {
            const users = readJson(USERS_FILE);
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const newUser = { id, ...data };
            users.push(newUser);
            await writeJson(USERS_FILE, users);
            return { ...newUser, _id: id };
        },
        findByIdAndUpdate: async (id, data) => {
            const users = readJson(USERS_FILE);
            const index = users.findIndex(u => u.id === id);
            if (index === -1) return null;
            users[index] = { ...users[index], ...data, id };
            await writeJson(USERS_FILE, users);
            return { ...users[index], _id: id };
        },
        findByIdAndDelete: async (id) => {
            let users = readJson(USERS_FILE);
            const index = users.findIndex(u => u.id === id);
            if (index === -1) return false;
            users = users.filter(u => u.id !== id);
            await writeJson(USERS_FILE, users);
            return true;
        }
    },
    incidents: {
        find: async (query = {}) => {
            const incidents = readJson(INCIDENTS_FILE);
            return incidents.filter(i => {
                for (let key in query) {
                    if (key === 'search') {
                        const s = query.search.toLowerCase();
                        const matches = 
                            (i.studentName || '').toLowerCase().includes(s) || 
                            (i.studentId || '').toLowerCase().includes(s) ||
                            (i.description || '').toLowerCase().includes(s);
                        if (!matches) return false;
                        continue;
                    }
                    if (key === 'type' && (query.type === 'All Categories' || query.type === 'Any Category')) {
                        continue;
                    }
                    if (key === 'severity' && query.severity === 'Any Severity') {
                        continue;
                    }
                    if (key === 'severity') {
                        if ((i.severity || '').toLowerCase() !== query.severity.toLowerCase()) return false;
                        continue;
                    }
                    if (i[key] !== query[key]) return false;
                }
                return true;
            }).map(i => ({ ...i, _id: i.id }));
        },
        findOne: async (query = {}) => {
            const incidents = readJson(INCIDENTS_FILE);
            const incident = incidents.find(i => {
                for (let key in query) {
                    if (i[key] !== query[key]) return false;
                }
                return true;
            });
            return incident ? { ...incident, _id: incident.id } : null;
        },
        create: async (data) => {
            const incidents = readJson(INCIDENTS_FILE);
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const newIncident = { id, ...data };
            incidents.push(newIncident);
            await writeJson(INCIDENTS_FILE, incidents);
            return { ...newIncident, _id: id };
        },
        findByIdAndUpdate: async (id, data) => {
            const incidents = readJson(INCIDENTS_FILE);
            const index = incidents.findIndex(i => i.id === id);
            if (index === -1) return null;
            incidents[index] = { ...incidents[index], ...data, id };
            await writeJson(INCIDENTS_FILE, incidents);
            return { ...incidents[index], _id: id };
        },
        findByIdAndDelete: async (id) => {
            let incidents = readJson(INCIDENTS_FILE);
            const index = incidents.findIndex(i => i.id === id);
            if (index === -1) return false;
            incidents = incidents.filter(i => i.id !== id);
            await writeJson(INCIDENTS_FILE, incidents);
            return true;
        }
    },
    notifications: {
        find: async (query = {}) => {
            const notifications = readJson(NOTIFICATIONS_FILE);
            return notifications.filter(n => {
                for (let key in query) {
                    if (n[key] !== query[key]) return false;
                }
                return true;
            }).map(n => ({ ...n, _id: n.id }));
        },
        create: async (data) => {
            const notifications = readJson(NOTIFICATIONS_FILE);
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const newNotification = { id, ...data };
            notifications.push(newNotification);
            await writeJson(NOTIFICATIONS_FILE, notifications);
            return { ...newNotification, _id: id };
        },
        markAllRead: async () => {
            const notifications = readJson(NOTIFICATIONS_FILE);
            const updated = notifications.map(n => ({ ...n, read: true }));
            await writeJson(NOTIFICATIONS_FILE, updated);
            return updated.map(n => ({ ...n, _id: n.id }));
        },
        findByIdAndDelete: async (id) => {
            let notifications = readJson(NOTIFICATIONS_FILE);
            const index = notifications.findIndex(n => n.id === id);
            if (index === -1) return false;
            notifications = notifications.filter(n => n.id !== id);
            await writeJson(NOTIFICATIONS_FILE, notifications);
            return true;
        }
    }
};
