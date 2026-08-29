const TaskModel = require('./todo.model');
const createError = require('../../utils/createError')

const getTodosByUser = async (userId, status) => {
    let query = { user: userId, status: { $ne: 'deleted' } };
    if (status === 'pending' || status === 'completed') {
        query.status = status;
    }
    return TaskModel.find(query).sort({ createdAt: -1 });
};

const createTodoForUser = async (userId, title, description) => {
    if (!title || !title.trim()) {
        throw createError('Task title is required', 400);
    }
    if (!description || !description.trim()) {
        throw createError('Task description is required', 400);
    }
    return await TaskModel.create({ title: title.trim(), description: description.trim(), user: userId });
};

const updateTodoStatusForUser = async (taskId, userId, status) => {
    const validStatuses = ['pending', 'completed', 'deleted'];
    if (!validStatuses.includes(status)) {
        throw createError('Invalid status provided', 400);
    }

    const task = await TaskModel.findOneAndUpdate(
        { _id: taskId, user: userId },
        { status },
        { returnDocument: "after", runValidators: true }
    );

    if (!task) {
        throw createError('Task not found', 404);
    }

    return task;
};

module.exports = { getTodosByUser, createTodoForUser, updateTodoStatusForUser };