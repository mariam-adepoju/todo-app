const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        statusCode = 400;
    }
    logger.error(
        `${statusCode} - ${err.message} - ${req.method} ${req.originalUrl}`
    );
    const message =
        process.env.NODE_ENV === 'production'
            ? 'Something went wrong!'
            : err.message;
    if (req.accepts('html')) {
        return res.status(statusCode).render('error', {
            message,
            error: process.env.NODE_ENV === 'production' ? {} : err
        });
    }
    return res.status(statusCode).json({
        success: false,
        message,
        data: null
    });
};

const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = { errorHandler, notFoundHandler };