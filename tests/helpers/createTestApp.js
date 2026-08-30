const session = require('express-session');
const createApp = require('../../app');

const createTestApp = () => {
    const sessionMiddleware = session({
        secret: 'test-session-secret',
        resave: false,
        saveUninitialized: false
    });
    return createApp(sessionMiddleware);
};

module.exports = createTestApp;