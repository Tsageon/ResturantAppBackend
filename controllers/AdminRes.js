const Restaurant = require('../model/Restaurant');
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
    adminCheck, 
    async (req, res) => {
        const { name, address, location, cuisine, rating, availableSlots, imageUrl } = req.body;

        if (!name || !cuisine || !rating ||!location) {
            return res.status(400).json({ message: 'Name, cuisine,location and rating are required' });
        }

        try {
            const newRestaurant = new Restaurant({
                name,
                address,
                location, 
                cuisine,
                rating,
                availableSlots,
                imageUrl  
            });

            await newRestaurant.save();

            res.status(201).json({
                message: 'Restaurant added successfully',
                restaurant: {
                    name: newRestaurant.name,
                    address: newRestaurant.address,
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
    adminCheck, 
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
            if (availableSlots) restaurant.availableSlots = availableSlots;
            if (imageUrl) restaurant.imageUrl = imageUrl;

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
