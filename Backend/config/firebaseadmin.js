const admin = require('firebase-admin');
require('dotenv').config();

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase environment variables');
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    })
})

const messaging = admin.messaging();

module.exports = {messaging, admin};