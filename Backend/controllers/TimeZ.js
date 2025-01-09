const timezoneMiddleware = (req, res, next) => {
    const timezoneFromHeader = req.headers['x-timezone'] || 'America/New_York';
    console.log('Timezone from header:', timezoneFromHeader);
    console.log("Timezone Middleware: x-timezone =", req.headers['x-timezone'])
    req.timezone = timezoneFromHeader || req.headers['x-timezone'] || 'America/New_York';
    next();
};

module.exports = timezoneMiddleware;