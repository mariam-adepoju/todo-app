const cron = require('node-cron');
const TodoModel = require('./todo.model');
const UserModel = require('../user/user.model');
const { notifyUser } = require('../notification/websocket');
const { sendOverdueEmail } = require('../../utils/mailer');
const logger = require('../../utils/logger');

// Moves pending tasks whose due date has passed to "overdue" and notifies the owner.
// Each task is claimed with an atomic update, so it is never notified twice
// (even if the cron job, a page load, or several server instances race).
const processOverdueTodos = async (userId) => {
    const now = new Date();
    const filter = { status: 'pending', dueDate: { $lt: now } };
    if (userId) filter.user = userId;

    const candidates = await TodoModel.find(filter).select('_id').lean();
    let count = 0;

    for (const { _id } of candidates) {
        const todo = await TodoModel.findOneAndUpdate(
            { _id, status: 'pending', dueDate: { $lt: now } },
            { status: 'overdue', overdueNotifiedAt: now },
            { returnDocument: 'after' }
        );
        if (!todo) continue; // already handled elsewhere

        count += 1;
        logger.info(`Task ${todo._id} marked overdue`);

        notifyUser(todo.user, 'task:overdue', {
            id: todo._id.toString(),
            title: todo.title,
            dueDate: todo.dueDate,
            message: `Task "${todo.title}" is now overdue`
        });

        const owner = await UserModel.findById(todo.user).select('email');
        if (owner && owner.email) {
            await sendOverdueEmail(owner.email, todo);
        }
    }
    return count;
};

const startOverdueJob = () => {
    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        try {
            await processOverdueTodos();
        } catch (err) {
            logger.error(`Overdue job failed: ${err.message}`);
        } finally {
            running = false;
        }
    };

    run(); // catch up on anything that expired while the server was down
    const task = cron.schedule('* * * * *', run); // then every minute
    logger.info('Overdue job started');
    return task;
};

module.exports = { processOverdueTodos, startOverdueJob };
