const TaskModel = require('./todo.model');
const createError = require('../../utils/createError')

const FILTERABLE_STATUSES = ['pending', 'completed', 'overdue'];
// "overdue" is set by the system only, never chosen by the user
const USER_SETTABLE_STATUSES = ['pending', 'completed', 'deleted'];

const getTodosByUser = async (userId, status) => {
    let query = { user: userId, status: { $ne: 'deleted' } };
    if (FILTERABLE_STATUSES.includes(status)) {
        query.status = status;
    }
    return TaskModel.find(query).sort({ createdAt: -1 });
};

const parseDueDate = (value) => {
    if (!value) {
        throw createError('Task due date is required', 400);
    }
    const dueDate = new Date(value);
    if (Number.isNaN(dueDate.getTime())) {
        throw createError('Task due date is invalid', 400);
    }
    if (dueDate <= new Date()) {
        throw createError('Task due date must be in the future', 400);
    }
    return dueDate;
};

const createTodoForUser = async (userId, title, description, dueDate) => {
    if (!title || !title.trim()) {
        throw createError('Task title is required', 400);
    }
    if (!description || !description.trim()) {
        throw createError('Task description is required', 400);
    }
    const parsedDueDate = parseDueDate(dueDate);
    return await TaskModel.create({
        title: title.trim(),
        description: description.trim(),
        dueDate: parsedDueDate,
        user: userId
    });
};

const updateTodoStatusForUser = async (taskId, userId, status) => {
    if (!USER_SETTABLE_STATUSES.includes(status)) {
        throw createError('Invalid status provided', 400);
    }

    const filter = { _id: taskId, user: userId };
    if (status === 'pending') {
        // A task whose due date has passed cannot go back to pending
        // (it would immediately become overdue again)
        filter.$or = [{ dueDate: null }, { dueDate: { $gt: new Date() } }];
    }

    const task = await TaskModel.findOneAndUpdate(
        filter,
        { status },
        { returnDocument: "after", runValidators: true }
    );

    if (!task) {
        if (status === 'pending' && await TaskModel.exists({ _id: taskId, user: userId })) {
            throw createError('A task whose due date has passed cannot be set back to pending', 400);
        }
        throw createError('Task not found', 404);
    }

    return task;
};

module.exports = { getTodosByUser, createTodoForUser, updateTodoStatusForUser };
