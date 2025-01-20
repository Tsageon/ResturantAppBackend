const express = require('express');
const mongoose = require('mongoose'); 
const moment = require('moment-timezone'); 
const Reservation = require('../model/Reservations');
const Restaurant = require('../model/Resturant');
const paypalClient = require('../config/paypal'); 
const authMiddleware = require('./Auth');
const timezoneMiddleware = require('./TimeZ');
const router = express.Router();

router.get('/reservations', timezoneMiddleware, authMiddleware, async (req, res) => {
    const { userId } = req; 

    try {
        const reservations = await Reservation.find({ userId: userId })
            .populate('userId')
            .populate('restaurantId');

        if (reservations.length === 0) {
            return res.status(404).json({ message: 'No reservations found' });
        }

        res.json(reservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
});

router.get('/reservation/:id', timezoneMiddleware, authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { userId } = req; 

    try {
        const reservation = await Reservation.findOne({ 
            _id: id,
            userId: userId  
        }).populate('userId').populate('restaurantId');

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found or you do not have access' });
        }

        res.json(reservation);
    } catch (error) {
        console.error('Error fetching reservation details:', error);
        res.status(500).json({ message: 'Failed to fetch reservation details' });
    }
});


router.post('/reservation', authMiddleware, async (req, res) => {
    const { userId } = req;  
    const { restaurantId, startTime, endTime, amount } = req.body;  

    if (!restaurantId || !startTime || !endTime || !amount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
        return res.status(400).json({ message: 'Start time must be before end time' });
    }

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const availableSlot = restaurant.availableSlots.find(slot => {
            const slotStartTime = new Date(slot.startTime);
            const slotEndTime = new Date(slot.endTime);
            const requestedStartTime = new Date(startTime);
            const requestedEndTime = new Date(endTime);

            return (
                requestedStartTime >= slotStartTime && 
                requestedEndTime <= slotEndTime && 
                slot.status === true
            );
        });

        if (!availableSlot) {
            return res.status(400).json({ message: 'The selected time slot is not available' });
        }

        const utcStartTime = moment.tz(startTime, req.timezone).utc().toDate();
        const utcEndTime = moment.tz(endTime, req.timezone).utc().toDate();

        const newReservation = new Reservation({
            userId,  
            restaurantId, 
            startTime: utcStartTime, 
            endTime: utcEndTime,
            amount, 
            status: 'pending'
        });

        availableSlot.status = false;
        
        await restaurant.save();
        await newReservation.save();

        res.status(201).json({
            message: 'Reservation created successfully',
            reservation: newReservation
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ message: 'Failed to create reservation' });
    }
});

router.put('/reservation/:id', authMiddleware, timezoneMiddleware, async (req, res) => {
    const { id } = req.params;
    const { startTime, endTime, amount } = req.body;

    if (!startTime || !endTime || !amount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
        return res.status(400).json({ message: 'Start time must be before end time' });
    }

    try {
        const reservation = await Reservation.findById(id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        const restaurant = await Restaurant.findById(reservation.restaurantId);
        const availableSlot = restaurant.availableSlots.find(slot => 
            new Date(slot.startTime).getTime() === new Date(startTime).getTime() &&
            new Date(slot.endTime).getTime() === new Date(endTime).getTime() && 
            slot.status === true
        );

        if (!availableSlot) {
            return res.status(400).json({ message: 'The selected time slot is not available' });
        }

        const convertedStartTime = moment.tz(startTime, req.timezone).utc().toDate();
        const convertedEndTime = moment.tz(endTime, req.timezone).utc().toDate();

        reservation.startTime = convertedStartTime;
        reservation.endTime = convertedEndTime;
        reservation.amount = amount;
        reservation.status = 'pending';

        availableSlot.status = false;

        await restaurant.save();
        await reservation.save();

        res.status(200).json({
            message: 'Reservation updated successfully',
            reservation
        });
    } catch (error) {
        console.error('Error updating reservation:', error);
        res.status(500).json({ message: 'Failed to update reservation' });
    }
});


router.post('/pay', authMiddleware, async (req, res) => {
    const { reservationId, amount } = req.body;
    const { userId } = req;  

    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
        return res.status(400).json({ message: 'Invalid reservation ID' });
    }

    try {
        const reservation = await Reservation.findOne({ 
            _id: reservationId,
            userId: userId   
        });

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found or you do not have access' });
        }

        if (reservation.status !== 'pending') {
            return res.status(400).json({ message: 'Reservation already processed' });
        }

        if (reservation.amount !== amount) {
            return res.status(400).json({ message: 'Payment amount mismatch' });
        }

        console.log('Reservation Details:', reservation);
        console.log('Amount:', amount);

        const createPaymentJson = {
            intent: 'sale',
            payer: {
                payment_method: 'paypal'
            },
            transactions: [{
                amount: {
                    total: amount,
                    currency: 'USD'
                },
                description: `Reservation Payment for ${reservationId}`,
                custom: reservationId 
            }],
            redirect_urls: {
                return_url: `${process.env.CLIENT_URL}/payment/success`,
                cancel_url: `${process.env.CLIENT_URL}/payment/cancel`
            }
        };

        paypalClient.payment.create(createPaymentJson, (error, payment) => {
            if (error) {
                console.error('Error creating PayPal payment:', error.response ? error.response : error);
                return res.status(500).json({ message: 'Payment initiation failed' });
            }

            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.json({ approvalUrl });
        });
    } catch (error) {
        console.error('Error creating PayPal order:', error);
        res.status(500).json({ message: 'Payment initiation failed' });
    }
});

router.get('/payment/success', async (req, res) => {
    const { paymentId, PayerID } = req.query;

    if (!paymentId || !PayerID) {
        return res.status(400).json({ message: 'Payment details are missing' });
    }

    try {
        const executePaymentJson = { payer_id: PayerID };

        paypalClient.payment.execute(paymentId, executePaymentJson, async (error, payment) => {
            if (error) {
                console.error('Error capturing PayPal payment:', error);
                return res.status(500).json({ message: 'Payment capture failed' });
            }

            const reservationId = payment.transactions[0].custom;

            const reservation = await Reservation.findByIdAndUpdate(
                reservationId, 
                { status: 'confirmed' }, 
                { new: true }
            );
            console.log('Payment Successful:', payment);
            console.log('Reservation updated:', reservation);
            res.json({ message: 'Payment successful', payment, reservation });
        });
    } catch (error) {
        console.error('Error handling payment success:', error);
        res.status(500).json({ message: 'Payment success handling failed' });
    }
});


router.get('/payment/cancel', async (req, res) => {
    try {
        const reservationId = req.query.reservationId;
        const reservation = await Reservation.findById(reservationId);
        
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        reservation.status = 'canceled';
        await reservation.save();

        const restaurant = await Restaurant.findById(reservation.restaurantId);
        const slot = restaurant.availableSlots.find(slot => slot._id.toString() === reservation.slotId.toString());
        if (slot) {
            slot.status = true; 
            await restaurant.save();
        }

        res.status(200).json({ message: 'Reservation canceled and slot made available' });
    } catch (error) {
        console.error('Error canceling reservation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/capture', async (req, res) => {
    const { paymentId, payerId, reservationId } = req.body;

    try {
        const executePaymentJson = { payer_id: payerId };

        paypalClient.payment.execute(paymentId, executePaymentJson, async (error, payment) => {
            if (error) {
                console.error('Error capturing PayPal payment:', error);
                return res.status(500).json({ message: 'Payment capture failed' });
            }

            await Reservation.findByIdAndUpdate(reservationId, { status: 'confirmed' });

            res.json({ message: 'Payment successful', details: payment });
        });
    } catch (error) {
        console.error('Error capturing PayPal payment:', error);
        res.status(500).json({ message: 'Payment capture failed' });
    }
});

module.exports = router;