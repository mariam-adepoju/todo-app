const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        lowercase: true,
        trim: true,
        minlength: [5, "Username must be at least 5 characters long"]
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        unique: true,
        sparse: true, // allows older users without an email
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false,
        minlength: [8, "Password must be at least 8 characters long"],
        maxlength: [50, "Username cannot exceed 50 characters"]
    }
}, {
    timestamps: true
})

userSchema.pre("save", async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12)
});
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password)
};
const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
