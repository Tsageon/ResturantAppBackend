const timezoneMiddleware = (req, res, next) => {
    const timezoneFromHeader = req.headers['x-timezone'];

    console.log('Timezone from header:', timezoneFromHeader);

    req.timezone = timezoneFromHeader || 'Africa/Johannesburg'; 
    
    next();
};
const testDate = moment('2025-01-16T10:08:00.000Z');
console.log(testDate.tz('Africa/Johannesburg').format());
module.exports = timezoneMiddleware;