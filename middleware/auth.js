const isAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
};


const blockAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/rooms');
    } else {
        return next();
    }
};

module.exports = { isAuth, blockAuth };