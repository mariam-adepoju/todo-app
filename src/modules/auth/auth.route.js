const express = require('express');
const router = express.Router();
const { getLogin, postLogin, getSignup, postSignup, logout } = require('./auth.controller');
const isAuthenticated = require('../../middlewares/auth');

router.get('/login', getLogin);
router.post('/login', postLogin);

router.get('/signup', getSignup);
router.post('/signup', postSignup);

router.post('/logout', isAuthenticated, logout);

module.exports = router;