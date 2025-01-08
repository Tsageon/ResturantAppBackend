const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: {type: String },
    location: { type: { type: String, default: 'Point' },
        coordinates: [Number]},
    cuisine: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    availableSlots: [{ startTime: Date,  endTime: Date,  
                       isAvailable: { type: Boolean, default: true },
                       status: { type: Boolean, default: true }}],
    imageUrl:{type: String },
    createdAt: { type: Date, default: Date.now },
});

restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);