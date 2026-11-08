const UserModel = require('../user/user.model')
const createError = require('../../utils/createError')
const signupUser = async ({ username, password, email }) => {
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
        throw createError("Username already taken", 400);
    }
    const userData = { username, password };
    if (email && email.trim()) {
        userData.email = email.trim();
    }
    try {
        const user = await UserModel.create(userData);
        return user;
    } catch (err) {
        if (err.code === 11000) {
            if (err.keyPattern && err.keyPattern.email) {
                throw createError("Email already in use", 400);
            }
            throw createError("Username already taken", 400);
        }
        throw err;
    }
};

const loginUser = async ({ username, password }) => {
    const user = await UserModel.findOne({ username }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
        throw createError('Invalid username or password', 401);
    }
    return user;
};

module.exports = { signupUser, loginUser };
