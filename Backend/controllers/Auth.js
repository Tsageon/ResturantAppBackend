const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }
    
    const token = authHeader.replace('Bearer ', '').trim(); 

    if (!token) {
        return res.status(401).json({ message: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;

        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();

        if (expirationTime - currentTime <= 5 * 60 * 1000) {
            const newToken = jwt.sign(
                { userId: decoded.userId, role: decoded.role },
                process.env.JWT_SECRET,
                { expiresIn: '5h' }
            );
            res.setHeader('X-New-Token', newToken);
        }

        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;