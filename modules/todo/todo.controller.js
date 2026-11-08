const { getTodosByUser, createTodoForUser, updateTodoStatusForUser } = require('./todo.service');
const { processOverdueTodos } = require('./overdue.job');
const { notifyUser } = require('../notification/websocket');
const logger = require('../../utils/logger');

const getTodos = async (req, res, next) => {
    try {
        const { status } = req.query;

        // Make sure states are correct on every load (e.g. user was offline when a task expired)
        try {
            await processOverdueTodos(req.user._id);
        } catch (err) {
            logger.error(`Overdue sync failed for user ${req.user.username}: ${err.message}`);
        }

        const todos = await getTodosByUser(req.user._id, status);

        res.render('todos', {
            todos,
            currentFilter: status || 'all',
            user: req.user
        });
    } catch (err) {
        next(err);
    }
};
const getCreateTodo = (req, res) => {
    res.render('create', {
        user: req.user
    });
};

const createTodo = async (req, res, next) => {
    try {
        const { title, description, dueDate } = req.body
        await createTodoForUser(req.user._id, title, description, dueDate);
        logger.info(`Task created by user: ${req.user.username}`);
        res.redirect('/todos');
    } catch (err) {
        next(err);
    }
};

const updateTodoStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const todo = await updateTodoStatusForUser(id, req.user._id, status);
        logger.info(`Task ${id} status updated to ${status} by user: ${req.user.username}`);

        if (todo.status === 'completed') {
            // Goes only to the task owner's own connections
            notifyUser(todo.user, 'task:completed', {
                id: todo._id.toString(),
                title: todo.title,
                message: `Task "${todo.title}" marked as completed`
            });
        }
        res.redirect('/todos');
    } catch (err) {
        next(err);
    }
};

module.exports = { getTodos, createTodo, getCreateTodo, updateTodoStatus }
