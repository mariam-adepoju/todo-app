const jwt = require('jsonwebtoken');

const getSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set');
    }
    return process.env.JWT_SECRET;
};

const signToken = (user) =>
    jwt.sign(
        { id: user._id.toString(), username: user.username },
        getSecret(),
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

const verifyToken = (token) => jwt.verify(token, getSecret());

// Same lifetime as the session cookie (1 day)
const tokenCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
});

module.exports = { signToken, verifyToken, tokenCookieOptions };
