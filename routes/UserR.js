const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const userController = require('../controllers/Users');
const authMiddleware = require('../controllers/Auth');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts detected, time to relax and try again later',
    statusCode: 420, 
});

router.post('/register', userController.registerUser);

router.post('/forgot-password', userController.forgotPassword);

router.post('/reset-password/:token', userController.resetPassword);

router.post('/login', loginLimiter, userController.loginUser);

router.get('/profile', authMiddleware, userController.getUser);

router.put('/edit', authMiddleware, userController.updateUser);

module.exports = router;