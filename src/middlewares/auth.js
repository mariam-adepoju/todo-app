const UserModel = require("../modules/user/user.model");

const isAuthenticated = async (req, res, next) => {
    try {
        if (!req.session?.userId) {
            return res.redirect("/auth/login");
        }
        const user = await UserModel.findById(req.session.userId);
        if (!user) {
            return req.session.destroy(() => {
                res.redirect("/auth/login");
            });
        }
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = isAuthenticated;