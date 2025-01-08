const Restaurant = require('../model/Resturant');
const adminCheck = require('../controllers/Admin');
const authMiddleware = require('../controllers/Auth');

exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        res.status(200).json({ restaurants });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving restaurants' });
    }
};

exports.getRestaurantById = async (req, res) => {
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
};

exports.addRestaurant = [
    authMiddleware,
    async (req, res) => {
        const { name, address, location, cuisine, rating, availableSlots, imageUrl } = req.body;

        if (!name || !cuisine || !rating || !location) {
            return res.status(400).json({ message: 'Name, cuisine,location and rating are required' });
        }

        try {
            let processedSlots = [];
            if (availableSlots && Array.isArray(availableSlots)) {
                processedSlots = availableSlots.map(slot => ({
                    startTime: new Date(slot.startTime),
                    endTime: new Date(slot.endTime),
                    isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true,
                }));
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
            res.status(500).json({ message: 'Error adding restaurant' });
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
                if (Array.isArray(availableSlots)) {
                    restaurant.availableSlots = availableSlots.map(slot => ({
                        startTime: new Date(slot.startTime),
                        endTime: new Date(slot.endTime),
                        isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true,
                    }));
                } else {
                    return res.status(400).json({ message: 'Invalid availableSlots format. Must be an array.' });
                }
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