const mongoose = require('mongoose');
const Restaurant = require('./Resturant')

const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    startTime: { type: Date, required: true }, 
    endTime: { type: Date, required: true },
    tableType: {  type: String, 
        required: true,
        enum: ['regular', 'vip', 'outdoor'], 
        default: 'regular',
    },
    amount: { 
        type: Number, 
    },
    numberOfGuests: { type: Number, required: true  },
    notifications: [
        {
            time: { type: Date }, 
            success: { type: Boolean, default: false }, 
        }],
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'expired'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

reservationSchema.pre('save', async function (next) {
    if (this.isNew) {  
        try {

            const restaurant = await Restaurant.findById(this.restaurantId); 

            let basePrice = restaurant.amount.standard;  

            if (this.tableType === 'vip') {
                basePrice = restaurant.amount.vip;
            } else if (this.tableType === 'outdoor') {
                basePrice = restaurant.amount.outdoor;
            }

            this.amount = basePrice * this.numberOfGuests;
        } catch (error) {
            console.error('Error fetching restaurant:', error);
            return next(error); 
        }
    }
    
    next(); 
});

module.exports = mongoose.model('Reservation', reservationSchema);