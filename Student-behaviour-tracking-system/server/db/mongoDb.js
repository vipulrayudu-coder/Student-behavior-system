// Lazy-required mongoose to prevent startup failure in JSON database mode
let mongoose;
let User, Incident, Notification;

const connect = async () => {
    mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_behavior';

    await mongoose.connect(uri);

    const UserSchema = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'staff', 'student'], default: 'staff' },
        studentId: { type: String, default: null },
        department: { type: String, default: 'General' }
    });

    const IncidentSchema = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        studentId: { type: String, required: true },
        studentName: { type: String, required: true },
        grade: { type: String, default: 'N/A' },
        type: { type: String, default: 'Behavioral' },
        location: { type: String, default: 'N/A' },
        description: { type: String, required: true },
        date: { type: String, default: () => new Date().toISOString() },
        severity: { type: String, default: 'low' },
        parentContact: { type: String, default: '' },
        reportedBy: { type: String, default: '' },
        timestamp: { type: String, default: () => new Date().toISOString() }
    });

    const NotificationSchema = new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, default: 'info' },
        timestamp: { type: String, default: () => new Date().toISOString() },
        read: { type: Boolean, default: false }
    });

    User = mongoose.models.User || mongoose.model('User', UserSchema);
    Incident = mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
    Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
};

const cleanDoc = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj.id || obj._id.toString();
    obj._id = obj.id;
    return obj;
};

module.exports = {
    connect,
    users: {
        find: async (query = {}) => {
            const docs = await User.find(query);
            return docs.map(cleanDoc);
        },
        findOne: async (query = {}) => {
            const doc = await User.findOne(query);
            return cleanDoc(doc);
        },
        create: async (data) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const doc = new User({ id, ...data });
            await doc.save();
            return cleanDoc(doc);
        },
        findByIdAndUpdate: async (id, data) => {
            const doc = await User.findOneAndUpdate({ id }, data, { new: true });
            return cleanDoc(doc);
        },
        findByIdAndDelete: async (id) => {
            const res = await User.deleteOne({ id });
            return res.deletedCount > 0;
        }
    },
    incidents: {
        find: async (query = {}) => {
            const mongoQuery = {};
            for (let key in query) {
                if (key === 'search') {
                    const s = query.search;
                    mongoQuery.$or = [
                        { studentName: { $regex: s, $options: 'i' } },
                        { studentId: { $regex: s, $options: 'i' } },
                        { description: { $regex: s, $options: 'i' } }
                    ];
                    continue;
                }
                if (key === 'type' && (query.type === 'All Categories' || query.type === 'Any Category')) {
                    continue;
                }
                if (key === 'severity' && query.severity === 'Any Severity') {
                    continue;
                }
                if (key === 'severity') {
                    mongoQuery.severity = { $regex: `^${query.severity}$`, $options: 'i' };
                    continue;
                }
                mongoQuery[key] = query[key];
            }
            const docs = await Incident.find(mongoQuery);
            return docs.map(cleanDoc);
        },
        findOne: async (query = {}) => {
            const doc = await Incident.findOne(query);
            return cleanDoc(doc);
        },
        create: async (data) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const doc = new Incident({ id, ...data });
            await doc.save();
            return cleanDoc(doc);
        },
        findByIdAndUpdate: async (id, data) => {
            const doc = await Incident.findOneAndUpdate({ id }, data, { new: true });
            return cleanDoc(doc);
        },
        findByIdAndDelete: async (id) => {
            const res = await Incident.deleteOne({ id });
            return res.deletedCount > 0;
        }
    },
    notifications: {
        find: async (query = {}) => {
            const docs = await Notification.find(query);
            return docs.map(cleanDoc);
        },
        create: async (data) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const doc = new Notification({ id, ...data });
            await doc.save();
            return cleanDoc(doc);
        },
        markAllRead: async () => {
            await Notification.updateMany({}, { read: true });
            const docs = await Notification.find({});
            return docs.map(cleanDoc);
        },
        findByIdAndDelete: async (id) => {
            const res = await Notification.deleteOne({ id });
            return res.deletedCount > 0;
        }
    }
};
