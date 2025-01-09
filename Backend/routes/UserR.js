const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const userController = require('../controllers/Users');
const reviewController = require('../controllers/ReviewR')
const authMiddleware = require('../controllers/Auth');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts detected, time to relax and try again later',
    statusCode: 420, 
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 4,
    message: 'Too many registration attempts made,take it easy on your device and try again later.',
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
})

router.post('/register', registerLimiter,userController.registerUser);

router.post('/login', loginLimiter, userController.loginUser);

router.post('/forgot-password', userController.forgotPassword);

router.post('/reset-password/:token', userController.resetPassword);

router.post('/manual-notification', userController.manualSendNotification);

router.post('/reviews', authMiddleware, reviewController.createReview);

router.get('/profile', authMiddleware, userController.getUser);

router.get('/reviews/:restaurantId', authMiddleware, reviewController.getReviews);

router.get('/restaurants/:restaurantsId', reviewController.getRestuarantDetails)

router.put('/edit', authMiddleware, userController.updateUser);

module.exports = router;