const timezoneMiddleware = (req, res, next) => {
    const timezoneFromHeader = req.headers['x-timezone'] || 'America/New_York';
    console.log('Timezone from header:', timezoneFromHeader);
    req.timezone = timezoneFromHeader;
    next();
};

module.exports = timezoneMiddleware;