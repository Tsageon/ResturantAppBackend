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
    const { restaurantId, date, amount } = req.body;  

    if (!restaurantId || !date || !amount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const newReservation = new Reservation({
            userId,  
            restaurantId, 
            date,  
            amount, 
            status: 'pending'  
        });
        console.log(amount)
        

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

router.get('/payment/cancel', (req, res) => {
    res.status(400).json({ message: 'Payment was canceled' });
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