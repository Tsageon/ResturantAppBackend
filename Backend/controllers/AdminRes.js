const moment = require('moment-timezone');
const Restaurant = require('../model/Resturant');
const adminCheck = require('../controllers/Admin');
const authMiddleware = require('../controllers/Auth');
const timezoneMiddleware = require('./TimeZ');

exports.getRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({}, { name: 1, address: 1, location: 1 });
        res.status(200).json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not fetch restaurants' });
    }
};

exports.getNearbyRestaurants = async (req, res) => {
    const { latitude, longitude, maxDistance } = req.query;

    if (!latitude || !longitude || !maxDistance) {
        return res.status(400).json({ message: 'Latitude, longitude, and maxDistance are required' });
    }

    try {
        const restaurants = await Restaurant.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    $maxDistance: parseFloat(maxDistance) * 1000,
                },
            },
        });
        res.status(200).json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching nearby restaurants' });
    }
};

exports.searchRestaurants = async (req, res) => {
    const { name, cuisine, location, minAmount, maxAmount } = req.query;

    const filter = {};

    if (name) {
        filter.name = { $regex: name, $options: 'i' };
    }

    if (cuisine) {
        filter.cuisine = { $regex: cuisine, $options: 'i' };
    }

    if (location) {
        filter.location = { $regex: location, $options: 'i' };
    }

    const reservationFilter = {};
    if (minAmount || maxAmount) {
        reservationFilter.amount = {};
        if (minAmount) reservationFilter.amount.$gte = minAmount;
        if (maxAmount) reservationFilter.amount.$lte = maxAmount;
    }

    try {
        const reservations = await Reservation.find(reservationFilter).populate('restaurantId');

        const restaurantIds = reservations.map((reservation) => reservation.restaurantId._id);
        const restaurants = await Restaurant.find({
            _id: { $in: restaurantIds },
            ...filter,
        });

        res.status(200).json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error searching for restaurants' });
    }
};

exports.getAllRestaurants = async (req, res) => {
    try {
        const timezone = req.timezone || 'UTC';
        console.log('Using timezone:', timezone);

        const restaurants = await Restaurant.find(); 

        const formattedRestaurants = restaurants.map(restaurant => {
            const originalCreatedAt = restaurant.createdAt;
            console.log('UTC createdAt:', originalCreatedAt);

            restaurant.createdAt = moment(originalCreatedAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss Z');
            console.log('Converted time:', restaurant.createdAt);
        
            restaurant.availableSlots.forEach(slot => {
                if (slot.startTime) {
                    const originalStartTime = slot.startTime;  
                    console.log('Original startTime (UTC):', originalStartTime);
 
                    slot.startTime = moment(originalStartTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss Z');
                    console.log("Converted startTime:", slot.startTime); 
                }
                if (slot.endTime) {
                    const originalEndTime = slot.endTime;
                    console.log('Original endTime (UTC):', originalEndTime); 
                    slot.endTime = moment(originalEndTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss Z');
                    console.log("Converted endTime:", slot.endTime); 
                }
            });
        
            return restaurant;
        });        

        res.status(200).json({ restaurants: formattedRestaurants });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving restaurants' });
    }
};

exports.getRestaurantById = [
    timezoneMiddleware,
    async (req, res) => {
        const { id } = req.params;
        const timezone = req.timezone;

        try {
            const restaurant = await Restaurant.findById(id).lean();
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }

            console.log('Using timezone:', timezone);

            const utcCreatedAt = moment.utc(restaurant.createdAt);
            console.log('UTC createdAt:', utcCreatedAt.format()); 

            const convertedCreatedAt = utcCreatedAt.tz(timezone);
            console.log('Converted createdAt:', convertedCreatedAt.format()); 
            restaurant.createdAt = convertedCreatedAt.format('YYYY-MM-DD HH:mm:ss Z'); 

           
            restaurant.availableSlots = restaurant.availableSlots.map(slot => {
                const updatedSlot = { ...slot }; 

                if (slot.startTime) {
                    const utcStartTime = moment.utc(slot.startTime);
                    console.log('Original startTime (UTC):', utcStartTime.format()); 
                    updatedSlot.startTime = utcStartTime.tz(timezone).format('YYYY-MM-DD HH:mm:ss Z');
                    console.log('Converted startTime:', updatedSlot.startTime); 
                }

                if (slot.endTime) {
                    const utcEndTime = moment.utc(slot.endTime);
                    console.log('Original endTime (UTC):', utcEndTime.format()); 
                    updatedSlot.endTime = utcEndTime.tz(timezone).format('YYYY-MM-DD HH:mm:ss Z');
                    console.log('Converted endTime:', updatedSlot.endTime);
                }

                return updatedSlot;
            });

            res.status(200).json({
                restaurant: {
                    ...restaurant,
                    createdAt: restaurant.createdAt, 
                    availableSlots: restaurant.availableSlots, 
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error retrieving restaurant' });
        }
    }
];


exports.addRestaurant = [
    authMiddleware,
    async (req, res) => {
        const { name, address, location, cuisine, rating, availableSlots, imageUrl } = req.body;

        if (!name || !cuisine || !rating || !location) {
            return res.status(400).json({ message: 'Name, cuisine, location, and rating are required' });
        }

        try {
            let processedSlots = [];
            if (availableSlots && Array.isArray(availableSlots)) {
                processedSlots = availableSlots.map((slot, index) => {
                    const { startTime, endTime, isAvailable } = slot;

                    if (!startTime || !endTime) {
                        throw new Error(`Slot at index ${index} is missing startTime or endTime.`);
                    }

                    const utcStartTime = moment.tz(startTime, req.timezone).utc().toDate();
                    const utcEndTime = moment.tz(endTime, req.timezone).utc().toDate();

                    if (isNaN(utcStartTime) || isNaN(utcEndTime)) {
                        throw new Error(`Invalid date format for slot at index ${index}.`);
                    }

                    if (utcStartTime >= utcEndTime) {
                        throw new Error(`startTime must be before endTime for slot at index ${index}.`);
                    }

                    return {
                        startTime: utcStartTime,
                        endTime: utcEndTime,
                        isAvailable: isAvailable !== undefined ? isAvailable : true,
                    };
                });

                processedSlots.sort((a, b) => a.startTime - b.startTime);

                for (let i = 1; i < processedSlots.length; i++) {
                    const currentSlot = processedSlots[i];
                    const previousSlot = processedSlots[i - 1];

                    if (currentSlot.startTime < previousSlot.endTime) {
                        throw new Error(`Slot at index ${i} overlaps with the previous slot.`);
                    }
                }
            }

            const newRestaurant = new Restaurant({
                name,
                address,
                location,
                cuisine,
                rating,
                availableSlots: processedSlots,
                imageUrl
            });

            await newRestaurant.save();

            res.status(201).json({
                message: 'Restaurant added successfully',
                restaurant: {
                    id: newRestaurant._id,
                    name: newRestaurant.name,
                    address: newRestaurant.address,
                    location: newRestaurant.location,
                    cuisine: newRestaurant.cuisine,
                    rating: newRestaurant.rating,
                    availableSlots: newRestaurant.availableSlots,
                    imageUrl: newRestaurant.imageUrl
                }
            });

        } catch (error) {
            console.error(error);
            if (error.message.includes('Slot')) {
                return res.status(400).json({ message: `Invalid slot configuration: ${error.message}` });
            }
            if (error.message.includes('Invalid date format')) {
                return res.status(400).json({ message: 'One or more slots have an invalid date format.' });
            }
            if (error.message.includes('overlaps')) {
                return res.status(400).json({ message: 'One or more slots overlap with existing slots.' });
            }
            res.status(500).json({ message: 'Error adding restaurant. Please check the provided data.' });
        }}];


exports.updateRestaurant = [
    authMiddleware,
    async (req, res) => {
        const { id } = req.params;
        const { name, address, location, cuisine, rating, availableSlots, imageUrl } = req.body;

        try {
            const restaurant = await Restaurant.findById(id);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }

            if (name) restaurant.name = name;
            if (address) restaurant.address = address;
            if (location) restaurant.location = location;
            if (cuisine) restaurant.cuisine = cuisine;
            if (rating) restaurant.rating = rating;
            if (imageUrl) restaurant.imageUrl = imageUrl;

            if (availableSlots) {
                if (!Array.isArray(availableSlots)) {
                    return res.status(400).json({ message: 'Invalid availableSlots format. Must be an array.' });
                }

                let processedSlots = [];
                let overlappingSlots = false;

                for (let index = 0; index < availableSlots.length; index++) {
                    const { startTime, endTime, isAvailable } = availableSlots[index];

                    if (!startTime || !endTime) {
                        return res.status(400).json({ message: `Slot at index ${index} is missing startTime or endTime.` });
                    }

                    const utcStartTime = moment.tz(startTime, req.timezone).utc().toDate();
                    const utcEndTime = moment.tz(endTime, req.timezone).utc().toDate();

                    if (isNaN(utcStartTime) || isNaN(utcEndTime)) {
                        return res.status(400).json({ message: `Invalid date format for slot at index ${index}.` });
                    }

                    if (utcStartTime >= utcEndTime) {
                        return res.status(400).json({ message: `startTime must be before endTime for slot at index ${index}.` });
                    }

                    for (const slot of processedSlots) {
                        if (
                            (utcStartTime < slot.endTime && utcEndTime > slot.startTime) || 
                            (utcEndTime > slot.startTime && utcStartTime < slot.endTime)     
                        ) {
                            overlappingSlots = true;
                            break;
                        }
                    }

                    if (overlappingSlots) {
                        return res.status(400).json({ message: `Slot at index ${index} overlaps with an existing slot.` });
                    }

                    processedSlots.push({
                        startTime: utcStartTime,
                        endTime: utcEndTime,
                        isAvailable: isAvailable !== undefined ? isAvailable : true,
                    });
                }

                restaurant.availableSlots = processedSlots;
            }

            await restaurant.save();
            res.status(200).json({
                message: 'Restaurant updated successfully',
                restaurant
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating restaurant' });
        }
    }
];


exports.deleteRestaurant = [
    authMiddleware,
    adminCheck,
    async (req, res) => {
        const { id } = req.params;

        try {
            const restaurant = await Restaurant.findById(id);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }

            await restaurant.remove();
            res.status(200).json({ message: 'Restaurant deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting restaurant' });
        }
    }
];

exports. sendNotifications = async (req, res) => {
    const { deviceToken, title, body, icon } = req.body;

    try {
        const payload = JSON.stringify({
            title,
            body,
            icon,
        });

        if (deviceToken) {
            const success = await sendPushNotification(deviceToken, title, body);
            if (success) {
                return res.status(200).json({ message: 'Notification sent successfully!' });
            } else {
                return res.status(500).json({ message: 'Notification failed!' });
            }
        } else {
            const users = await User.find({ 'subscription.endpoint': { $exists: true } });

            const promises = users.map(user =>
                webPush.sendNotification(user.subscription, payload)
                    .catch(error => console.error('Error sending notification to:', user.email, error))
            );

            await Promise.all(promises);

            return res.status(200).json({ message: 'Notifications sent successfully!' });
        }
    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ message: 'Error sending notifications' });
    }
};


exports.Subscribe = async (req, res) => {
    const {email, subscription } = req.body;
    try {
   
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.subscription = subscription;
        await user.save();

        res.status(200).json({ message: 'Subscription saved successfully!' });
    } catch (error) {
        console.error('Error saving subscription:', error);
        res.status(500).json({ message: 'Error saving subscription' });
    }
}


exports.markReservationAsArrived = async (req, res) => {
    try {
        const { reservationId } = req.query;
        const reservation = await Reservation.findById(reservationId);

        if (reservation) {
            reservation.status = 'arrived'; 
            await reservation.save();

            res.status(200).json({ message: 'Reservation confirmed as arrived' });
            res.send('<h1>Thank you! Your reservation has been marked as arrived.</h1>');
        } else {
            res.status(404).send('<h1>Reservation not found.</h1>');
        }
    } catch (error) {
        console.error('Error marking reservation as arrived:', error);
        res.status(500).send('<h1>Something went wrong. Please try again later.</h1>');
        res.status(500).json({ message: 'Server error' });
    }
};