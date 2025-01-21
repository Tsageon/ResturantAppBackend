const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, trim: true, 
        lowercase: true, unique: true},
    password: { type: String, required: true },
    phonenumber: {type: String , required: true, match: /^\+?[0-9\s\-()]*$/ },
    role: { type: String, enum: ['user', 'admin'], default: 'user'},
    fullname: { type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    deviceToken:{ type: String, required: false},
    resetPasswordToken:  {type: String},
    resetPasswordExpires: {type: Date},
    subscription: {
        endpoint: { type: String },
        keys: {
            p256dh: { type: String },
            auth: { type: String },
        },
    },
});

module.exports = mongoose.model('User', userSchema);