const mongoose = require("mongoose")

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        required: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"]

    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'deleted'],
        default: 'pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const TodoModel = mongoose.model("Todo", todoSchema);
module.exports = TodoModel;