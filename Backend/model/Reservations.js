const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    startTime: { type: Date, required: true }, 
    endTime: { type: Date, required: true },
    tableType: {  type: String, 
        enum: ['regular', 'vip', 'outdoor'], 
        default: 'regular', required: true 
    },
    amount: { 
        type: Number, 
        required: true
    },
    numberOfGuests: { type: Number, required: true },
    notifications: [
        {
            time: { type: Date }, 
            success: { type: Boolean, default: false }, 
        }],
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

reservationSchema.pre('save', function(next) {
    let basePrice = 20;

    if (this.tableType === 'vip') {
        basePrice = 50;
    } else if (this.tableType === 'outdoor') {
        basePrice = 30;
    }

    this.amount = basePrice * this.numberOfGuests;

    next(); 
});

module.exports = mongoose.model('Reservation', reservationSchema);