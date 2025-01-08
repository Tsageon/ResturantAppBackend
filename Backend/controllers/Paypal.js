const express = require('express');
const mongoose = require('mongoose'); 
const Reservation = require('../model/Reservations');
const paypalClient = require('../config/paypal'); 
const authMiddleware = require('./Auth')
const router = express.Router();

router.get('/reservation/:id', authMiddleware, async (req, res) => {
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

        const availableSlot = restaurant.availableSlots.find(slot => 
            new Date(slot.startTime).getTime() === new Date(startTime).getTime() &&
            new Date(slot.endTime).getTime() === new Date(endTime).getTime() && 
            slot.status === true
        );


        if (!availableSlot) {
            return res.status(400).json({ message: 'The selected time slot is not available' });
        }

        const newReservation = new Reservation({
            userId,  
            restaurantId, 
            startTime: new Date(startTime), 
            endTime: new Date(endTime),
            amount, 
            status: 'pending'
        });
        console.log(amount)
        availableSlot.status = false;
        
        await restaurant.save();
        await newReservation.save();
        
        console.log(newReservation)

        res.status(201).json({
            message: 'Reservation created successfully',
            reservation: newReservation
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ message: 'Failed to create reservation' });
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