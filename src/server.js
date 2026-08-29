require('dotenv').config();
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const createApp = require('./app')
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000

const startServer = async () => {
    try {
        const connection = await connectDB();
        const mongoClient = connection.getClient();

        // Session Setup
        const sessionMiddleware = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ client: mongoClient }),
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 1000 * 60 * 60 * 24 // 1 day
            }
        });
        const app = createApp(sessionMiddleware);

        const server = app.listen(PORT, () => {
            logger.info(`Server is running on port: ${PORT}`);

        })
        server.on("error", (error) => {
            logger.error("Server error", error);
            process.exit(1);
        });
    } catch (error) {
        logger.error("Application startup failed", error);
        process.exit(1);
    }
}
startServer()