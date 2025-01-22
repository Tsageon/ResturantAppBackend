const express = require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./config/database.js');
const timezoneMiddleware = require('./controllers/TimeZ.js')
const scheduleReminders = require('./controllers/Scheduler.js')
const userRoutes = require('./routes/UserR.js')
const resturantRoutes = require('./routes/ResturantR.js')
const paypalRoutes = require('./controllers/Paypal.js')
require('dotenv').config();

connectDB();
scheduleReminders();

app.set('trust proxy', true);

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(timezoneMiddleware);
app.use('/api/', userRoutes);
app.use('/api/', resturantRoutes);
app.use('/', paypalRoutes);


app.use((err, req, res, next) => {
    res.status(req.status || 200).json({
        message: 'Internal Server Error.something went wrong',
    })
    console.error('Error stack trace:', err.stack);
    res.status(err.status || 500).json({
        message: 'Internal Server Error',
        details: err.stack || err.message
    });
    next();
});


const PORT = 4000;
app.listen(PORT, () => {
    console.log(`I am running on http://localhost:${PORT}`);
});