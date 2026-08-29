const express = require('express');
const router = express.Router();
const { getTodos, createTodo, getCreateTodo, updateTodoStatus } = require('./todo.controller');
const isAuthenticated = require('../../middlewares/auth');

// All task routes require authentication
router.use(isAuthenticated);

router.get('/', getTodos);
router.get('/create', getCreateTodo);
router.post('/', createTodo);
router.post('/:id/status', updateTodoStatus);

module.exports = router;