const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Check both 'x-auth-token' header and standard 'Authorization: Bearer <token>'
    const token = req.header('x-auth-token') || (req.header('Authorization') && req.header('Authorization').startsWith('Bearer ') ? req.header('Authorization').substring(7) : null);

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
