const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB connected to cluster: ${mongoose.connection.host}`);  
     } catch (error) {
       console.error('MongoDB connection failed:', error.message); 
       process.exit(1);
        
    }
};

module.exports = connectDB;