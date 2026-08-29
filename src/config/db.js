const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
        logger.info(`MongoDB connected: ${connectionInstance.connection.host}`);

        mongoose.connection.on("error", (err) => {
            logger.error(`MongoDB runtime connection error: ${err.message}`);
        });
        return connectionInstance.connection;
    } catch (error) {
        logger.error(`Initial MongoDB connection error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB