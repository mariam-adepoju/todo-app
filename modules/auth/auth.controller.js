const { signupUser, loginUser } = require('./auth.service')
const logger = require('../../utils/logger');
const { signToken, tokenCookieOptions } = require('../../utils/jwt');

const getLogin = (req, res) => res.render('login', { error: null });
const getSignup = (req, res) => res.render('signup', { error: null });

const postSignup = async (req, res, next) => {
    try {
        const user = await signupUser(req.body);
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        // JWT used to authenticate the WebSocket connection
        res.cookie('token', signToken(user), tokenCookieOptions());
        logger.info(`New user registered: ${user.username}`);
        res.redirect('/todos');
    } catch (err) {
        if (err.statusCode === 400 || err.name === 'ValidationError') {
            return res.status(400).render('signup', { error: err.message });
        }
        next(err);
    }
};

const postLogin = async (req, res, next) => {
    try {
        const user = await loginUser(req.body);
        req.session.regenerate((err) => {
            if (err) return next(err);

            req.session.userId = user._id.toString();
            req.session.username = user.username;
            // JWT used to authenticate the WebSocket connection
            res.cookie('token', signToken(user), tokenCookieOptions());

            logger.info(`User logged in: ${user.username}`);
            res.redirect('/todos');
        })
    } catch (err) {
        if (err.statusCode === 401) {
            return res.status(401).render('login', { error: err.message });
        }
        next(err);
    }
};

const logout = (req, res, next) => {
    req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.clearCookie('token');
        res.redirect('/auth/login');
    });
};

module.exports = { getLogin, getSignup, postLogin, postSignup, logout }
