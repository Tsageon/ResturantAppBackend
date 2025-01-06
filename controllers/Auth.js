const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization') && req.header('Authorization').replace('Bearer', '').trim();
    if (!token) {
        return res.status(401).json({ message: 'No token given, access denied' });
    }   
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;

        const expirationTime = decoded.exp * 5000;
        const currentTime = Date.now()

        if ( expirationTime - currentTime <= 60 * 60 * 5000) {
            const newToken = jwt.sign({userId: decoded.userId }, process.env.JWT_SECRET, {expiresIn: '5h'});
            res.setHeader('X-New-Token', newToken);
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token'});
    }
};

module.exports = authMiddleware;