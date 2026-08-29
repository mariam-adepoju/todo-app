const UserModel = require('../user/user.model')
const createError = require('../../utils/createError')
const signupUser = async ({ username, password }) => {
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
        throw createError("Username already taken", 400);
    }
    try {
        const user = await UserModel.create({ username, password });
        return user;
    } catch (err) {
        if (err.code === 11000) {
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