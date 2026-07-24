module.exports = function (req, res, next) {
    // Assumes auth middleware has run first and populated req.user
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admin privileges required' });
    }
    next();
};
