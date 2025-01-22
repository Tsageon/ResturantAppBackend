const express = require('express');
const router = express.Router();
const timezoneMiddleware = require('../controllers/TimeZ');
const { getRestaurants, getAllRestaurants, getRestaurantById, getNearbyRestaurants, searchRestaurants, addRestaurant, updateRestaurant, deleteRestaurant, markReservationAsArrived } = require('../controllers/AdminRes');

router.get('/restaurants', getRestaurants);
router.get('/nearbyR', getNearbyRestaurants);
router.get('/searchR', searchRestaurants);
router.get('/getR',timezoneMiddleware, getAllRestaurants);
router.get('/getR/:id',timezoneMiddleware , getRestaurantById);
router.get('/reservation-arrived', timezoneMiddleware, markReservationAsArrived );
router.post('/addR', addRestaurant);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);

module.exports = router;