const express = require('express');
const router = express.Router();
const Restaurant = require('../model/Resturant');
const { getAllRestaurants, getRestaurantById, addRestaurant, updateRestaurant, deleteRestaurant } = require('../controllers/AdminRes');

router.post('/addR', addRestaurant);
router.get('/getR', getAllRestaurants);
router.get('/getR/:id', getRestaurantById);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);

router.get('/restaurants', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({}, { name: 1, address: 1, location: 1 });
        res.status(200).json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not fetch restaurants' });
    }
});


router.get('/restaurants/nearby', async (req, res) => {
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
});

router.get('/restaurants/search', async (req, res) => {
    const { name, cuisine } = req.query;

    const filter = {};

    if (name) {
        filter.name = { $regex: name, $options: 'i' };
    }

    if (cuisine) {
        filter.cuisine = { $regex: cuisine, $options: 'i' };
    }

    if (!name && !cuisine) {
        return res.status(400).json({ message: 'Either name or cuisine parameter is required' });
    }

    try {
        const restaurants = await Restaurant.find(filter);
        res.status(200).json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error searching for restaurants' });
    }
});

module.exports = router;