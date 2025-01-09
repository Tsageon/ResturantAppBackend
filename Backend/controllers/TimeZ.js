const timezoneMiddleware = (req, res, next) => {
    req.timezone = req.headers['x-timezone'] || 'America/New_York';
    next();
};

module.exports = timezoneMiddleware;