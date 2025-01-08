const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            serverSelectionTimeoutMS: 50000,
            socketTimeoutMS: 45000 
        });
        console.log(`MongoDB connected to cluster: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);

    }
};

module.exports = connectDB;