const moment = require('moment-timezone');
const Restaurant = require('../model/Resturant');
const adminCheck = require('../controllers/Admin');
const authMiddleware = require('../controllers/Auth');
const timezoneMiddleware = require('./TimeZ');


exports.getAllRestaurants = async (req, res) => {
    try {
        const timezone = req.headers['x-timezone'] || 'America/New_York';
        console.log('Timezone from header:', req.timezone);

        const restaurants = await Restaurant.find();

        const formattedRestaurants = restaurants.map(restaurant => {
            restaurant.createdAt = moment(restaurant.createdAt).tz(timezone).format();

            restaurant.availableSlots.forEach(slot => {
                if (slot.startTime) {
                    slot.startTime = moment(slot.startTime).tz(timezone).format();
                }
                if (slot.endTime) {
                    slot.endTime = moment(slot.endTime).tz(timezone).format();
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

exports.getRestaurantById = [timezoneMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.status(200).json({ restaurant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving restaurant' });
    }
}];

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
        }
    }
];


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