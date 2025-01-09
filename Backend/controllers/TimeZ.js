const timezoneMiddleware = (req, res, next) => {
    const timezoneFromHeader = req.headers['x-timezone'];

    console.log('Timezone from header:', timezoneFromHeader);

    req.timezone = timezoneFromHeader || 'Africa/Johannesburg'; 
    
    next();
};

module.exports = timezoneMiddleware;