const admin = require('firebase-admin');
const Reservation = require('../model/Reservations');
const User = require('../model/User');
const {sendEmail} = require('../controllers/email')

const sendPushNotification = async (deviceToken, title, body) => {
    const message = {
        notification: {
            title,
            body,
        },
        token: deviceToken,
    };

    try {
        await admin.messaging().send(message);
        console.log(`Notification sent successfully to ${deviceToken}`);
        return true;
    } catch (error) {
        console.error(`Error sending notification to ${deviceToken}:`, error.message);
        return false;
    }
};


const checkReservations = async () => {
    try {
        const reservations = await Reservation.find({ status: 'confirmed' })
            .populate('userId')  
            .populate('restaurantId');  

        for (const reservation of reservations) {
            const now = new Date();
            const reservationStartTime = new Date(reservation.startTime);
            const reservationEndTime = new Date(reservation.endTime);
            const timeDiffToStart = reservationStartTime - now;
            const timeDiffToEnd = reservationEndTime - now;

            if (timeDiffToStart <= 30 * 60 * 1000 && timeDiffToStart > 0) {
                const user = reservation.userId;

                if (user) {
                    const email = user.email;
                    const pushToken = user.deviceToken;  
                    
                    const subject = 'Reservation Reminder';
                    const text = `Your reservation at the restaurant is coming up in less than 30 minutes. Please get ready!`;
                    const html = `<p>Your reservation at the restaurant is coming up in less than 30 minutes. Please get ready!</p>`;

                    try {
                        await sendEmail(email, subject, text, html);
                        console.log(`Sent email reminder to ${email}`);

                        if (pushToken) {
                            const pushTitle = 'Reservation Reminder';
                            const pushBody = 'Your reservation is coming up in less than 30 minutes. Get Your Wallet ready!';
                            try {
                                await sendPushNotification(pushToken, pushTitle, pushBody);
                                console.log(`Sent push notification to ${email}`);
                            } catch (pushError) {
                                console.error(`Failed to send push notification to ${email}:`, pushError);
                                console.log(`Sending email as backup for push notification failure.`);
                                await sendEmail(email, subject, text, html);
                                console.log(`Sent email reminder to ${email} as a backup.`);
                            }
                        } else {
                            console.log(`No push token found for user ${email}. Email sent instead gawdamn.`);
                        }

                        const checkInUrl = `https://resturantappbackend.onrender.com/reservation-arrived?reservationId=${reservation._id}`;
                        const followUpSubject = 'Did you arrive at the restaurant?';
                        const followUpText = 'Please let us know if you have arrived at the restaurant.';
                        const followUpHtml = `<p>Please let us know if you've arrived at the restaurant by clicking the link below.</p>
                        <a href="${checkInUrl}">Click here to confirm your arrival!</a>`;

                        await sendEmail(email, followUpSubject, followUpText, followUpHtml);
                        console.log(`Sent follow-up email to ${email}`);
                    } catch (emailError) {
                        console.error(`Error sending email to ${email}:`, emailError);
                    }
                }
            }

            if (timeDiffToEnd <= 0 && reservation.status !== 'arrived') {
                const restaurant = reservation.restaurantId;
                const slot = restaurant.availableSlots.find(slot => slot._id.toString() === reservation.slotId.toString());

                if (slot) {
                    slot.status = true;
                    await restaurant.save();
                    console.log(`Slot for reservation ${reservation._id} made available.`);
                }

                reservation.status = 'expired';
                await reservation.save();
            }
        }
    } catch (error) {
        console.error('Error checking reservations:', error);
    }
};

intervalID = setInterval(checkReservations, 300000);

module.exports = { sendPushNotification };