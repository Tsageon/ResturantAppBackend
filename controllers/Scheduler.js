const NOTIFICATION_INTERVALS = [30 * 60 * 1000, 10 * 60 * 1000]; 
const schedule = require('node-schedule');
const Reservation = require('../model/Reservations');
const sendPushNotification = require('../controllers/Notification');

const scheduleReminders = () => {
    schedule.scheduleJob('* * * * *', async () => {
        const now = new Date();

        try {
            const reservations = await Reservation.find({
                date: { $gte: now },
                status: 'confirmed',
            }).populate('userId');

            for (const reservation of reservations) {
                const timeToReservation = reservation.date.getTime() - now.getTime();

                for (const interval of NOTIFICATION_INTERVALS) {
                    if (timeToReservation <= interval && !isNotificationSent(reservation, interval)) {
                        const user = reservation.userId;

                        if (user.deviceToken) {
                            const title = `Reminder: Your reservation`;
                            const body = `Your reservation at ${reservation.restaurantId} is in ${
                                interval / (60 * 1000)
                            } minutes!`;

                            const success = await sendPushNotification(user.deviceToken, title, body);

                            if (success) {
                                await Reservation.findByIdAndUpdate(reservation._id, {
                                    $push: { notifications: { time: new Date(), success: true } },
                                });
                            } else {
                                retryNotification(reservation, interval, user.deviceToken, title, body);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in scheduler:', error);
        }
    });
};


const isNotificationSent = (reservation, interval) => {
    const notificationTime = new Date(reservation.date.getTime() - interval).toISOString();
    return reservation.notifications.some((n) => new Date(n.time).toISOString() === notificationTime);
};


const retryNotification = async (reservation, interval, deviceToken, title, body) => {
    const retryInterval = 5 * 60 * 1000;
    const maxRetries = 3;

    let retries = 0;

    const retryJob = schedule.scheduleJob(new Date(Date.now() + retryInterval), async function retry() {
        if (retries >= maxRetries) {
            console.error('Max retries reached for reservation:', reservation._id);
            retryJob.cancel();
            return;
        }

        try {
            const success = await sendPushNotification(deviceToken, title, body);
            if (success) {
                console.log('Notification retry successful');
                await Reservation.findByIdAndUpdate(reservation._id, {
                    $push: { notifications: { time: new Date(), success: true } },
                });
                retryJob.cancel(); 
            } else {
                console.log('Retrying notification...');
                retries++;
            }
        } catch (error) {
            console.error('Error during notification retry:', error);
        }
    });
};

module.exports = scheduleReminders;