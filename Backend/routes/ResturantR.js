const express = require('express');
const router = express.Router();
const Restaurant = require('../model/Resturant');
const Reservation = require('../model/Reservations');
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

router.post('/send-notification', async (req, res) => {
    const { deviceToken, title, body } = req.body;

    try {
        const success = await sendPushNotification(deviceToken, title, body);
        if (success) {
            res.status(200).json({ message: 'Notification sent successfully!' });
        } else {
            res.status(500).json({ message: 'Notification failed!' });
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ message: 'Error sending notification!' });
    }
});

router.get('/reservation-arrived', async (req, res) => {
    try {
        const { reservationId } = req.query;

        const reservation = await Reservation.findById(reservationId);

        if (reservation) {
            reservation.status = 'arrived'; 
            await reservation.save();

            res.send('<h1>Thank you! Your reservation has been marked as arrived.</h1>');
        } else {
            res.status(404).send('<h1>Reservation not found.</h1>');
        }
    } catch (error) {
        console.error('Error marking reservation as arrived:', error);
        res.status(500).send('<h1>Something went wrong. Please try again later.</h1>');
    }
});

module.exports = router;