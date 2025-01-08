const express = require('express');
const connectDB = require('./config/database.js');
const bodyParser = require('body-parser');
require('dotenv').config();

const scheduleReminders = require('./controllers/Scheduler.js')
const userRoutes = require('./routes/UserR.js')
const resturantRoutes = require('./routes/ResturantR.js')
const paypalRoutes = require('./controllers/Paypal.js')
const app = express();

connectDB();
scheduleReminders();

app.use(bodyParser.json());

app.use('/api/', userRoutes);
app.use('/api/', resturantRoutes);
app.use('/', paypalRoutes);

app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred',
    });
});

const PORT = process.env.Port || 3001;
app.listen(PORT, () => {
    console.log(`I am running on http://localhost:${PORT}`);
});