const timezoneMiddleware = (req, res, next) => {
    const timezoneFromHeader = req.headers['x-timezone'];
    if (!timezoneFromHeader) {
        console.log('Timezone header is missing, defaulting to Africa/Johannesburg');
    } else {
        console.log('Timezone from header:', timezoneFromHeader);
    }
    req.timezone = timezoneFromHeader || 'Africa/Johannesburg';
    next();
};


module.exports = timezoneMiddleware;