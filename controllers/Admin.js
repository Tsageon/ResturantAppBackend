const adminCheck = (req, res, next) => {
    if (req.userRole !== 'admin'){
        return res.status(403).send({ message: 'You do not have the credentials for this action/page' });
    }
    next();
};

module.exports = adminCheck