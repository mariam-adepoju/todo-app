const { getTodosByUser, createTodoForUser, updateTodoStatusForUser } = require('./todo.service');
const logger = require('../../utils/logger');

const getTodos = async (req, res, next) => {
    try {
        const { status } = req.query;
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
        const { title, description } = req.body
        await createTodoForUser(req.user._id, title, description);
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
        await updateTodoStatusForUser(id, req.user._id, status);
        logger.info(`Task ${id} status updated to ${status} by user: ${req.user.username}`);
        res.redirect('/todos');
    } catch (err) {
        next(err);
    }
};

module.exports = { getTodos, createTodo, getCreateTodo, updateTodoStatus }