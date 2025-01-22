const admin = require('firebase-admin');
const webPush = require('web-push');
const Reservation = require('../model/Reservations');
const {sendEmail} = require('../controllers/email')

const VapidKey = process.env.VAPID_PUBLIC_KEY;
const VapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const notificationEmail = process.env.NOTIFICATION_EMAIL;

webPush.setVapidDetails(
    `mailto:${notificationEmail}`,
   VapidKey,
   VapidPrivateKey                 
);

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

const sendWebPushNotification = async (subscription, title, body) => {
    const payload = JSON.stringify({ title, body });
  
    try {
      await webPush.sendNotification(subscription, payload);
      console.log(`Web Push notification sent.`);
    } catch (error) {
      console.error('Error sending web push notification:', error);
      return false;
    }
  };

const sendWebPushReminder = async (user, reservation) => {
    if (user.webPushSubscription) {
        const subscription = user.webPushSubscription;

        const reservationStartTime = new Date(reservation.startTime);
        const timeRemaining = Math.max(0, reservationStartTime - new Date());
        const reservationTimeFormatted = reservationStartTime.toLocaleTimeString();

        const pushTitle = 'Reservation Reminder';
        const pushBody = `Your reservation is coming up in less than 30 minutes at ${reservationTimeFormatted}.`;
    
        if (timeRemaining <= 30 * 60 * 1000 && timeRemaining > 0) { 
            try {
                const webPushSent = await sendWebPushNotification(subscription, pushTitle, pushBody);

                if (!webPushSent) {
                    console.log(`Failed to send web push notification to user ${user.email} for reservation ${reservation._id}`);
                } else {
                    console.log(`Sent web push notification to ${user.email} for reservation ${reservation._id}`);
                }
            } catch (error) {
                console.error(`Error sending web push to ${user.email} for reservation ${reservation._id}:`, error);
            }
        } else {
            console.log(`Reservation ${reservation._id} is not within the 30-minute reminder threshold.`);
        }
    } else {
        console.log(`User ${user.email} does not have a web push subscription.`);
    }
};


const sendReminderNotifications = async (user, reservation) => {
    if (!reservation || !reservation._id) {
        console.error('Reservation object is invalid or missing.');
        return; 
    }

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
            console.log(`No push token found for user ${email}. Email sent instead.`);
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
};


const handleExpiredReservations = async (reservation) => {
    const restaurant = reservation.restaurantId;
    const slot = restaurant.availableSlots.find(slot => slot._id?.toString() === reservation.slotId?.toString());
    console.log('Reservation:', reservation);

    if (slot) {
        slot.status = true;
        await restaurant.save();
        console.log(`Slot for reservation ${reservation._id} made available.`);
    }

    reservation.status = 'expired';
    await reservation.save();
};

let intervalID; 

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
                    await sendWebPushReminder(user, reservation);
                    await sendReminderNotifications(user, reservation);
                }
            }

            if (timeDiffToEnd <= 0 && reservation.status !== 'arrived') {
                await handleExpiredReservations(reservation);
                console.log(`Stopping interval for reservation ${reservation._id}`);
                stopCheckingReservations();
            }
        }
    } catch (error) {
        console.error('Error checking reservations:', error);
    }
};

const stopCheckingReservations = () => {
    if (intervalID) {
        clearInterval(intervalID);
        intervalID = null;
        console.log('Reservation checking interval cleared.');
    }
};

intervalID = setInterval(checkReservations, 300000); 

module.exports = { sendPushNotification, stopCheckingReservations };