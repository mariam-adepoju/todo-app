const express = require('express');
const morgan = require('morgan');
const path = require('path');

// Import Custom Loggers and Middleware
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Import Routes
const authRoutes = require('./modules/auth/auth.route');
const todoRoutes = require('./modules/todo/todo.route');

const createApp = (sessionMiddleware) => {
    const app = express();

    // View Engine Setup 
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, './views'));

    // Core Middleware
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // Session 
    app.use(sessionMiddleware);

    // Request Logging (Morgan + Winston)
    app.use(morgan('short', {
        stream: {
            write: message => logger.info(message.trim())
        }
    }));

    // Health Check Endpoint 
    app.get("/health", (req, res) => {
        res.json({
            success: true,
            message: "API is running"
        });
    });

    // Route Mounting
    app.use('/auth', authRoutes);
    app.use('/todos', todoRoutes);

    // Root Redirect Rule
    app.get('/', (req, res) => {
        if (req.session && req.session.userId) {
            return res.redirect('/todos');
        }
        res.redirect('/auth/login');
    });

    // Global Error Handlers
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app
};

module.exports = createApp;