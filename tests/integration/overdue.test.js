jest.mock('../../modules/notification/websocket', () => ({
    initWebSocket: jest.fn(),
    notifyUser: jest.fn()
}));
jest.mock('../../utils/mailer', () => ({
    sendOverdueEmail: jest.fn().mockResolvedValue()
}));

const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const UserModel = require('../../modules/user/user.model');
const TodoModel = require('../../modules/todo/todo.model');
const { processOverdueTodos } = require('../../modules/todo/overdue.job');
const { notifyUser } = require('../../modules/notification/websocket');
const { sendOverdueEmail } = require('../../utils/mailer');

const app = createTestApp();
const past = () => new Date(Date.now() - 60 * 1000);
const future = () => new Date(Date.now() + 60 * 60 * 1000);

describe('Overdue tasks', () => {
    let user;

    beforeEach(async () => {
        user = await UserModel.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        });
    });

    it('moves a pending task past its due date to overdue and notifies the owner', async () => {
        const todo = await TodoModel.create({
            title: 'Late', description: 'Late task', dueDate: past(), user: user._id
        });

        const count = await processOverdueTodos();

        expect(count).toBe(1);
        expect((await TodoModel.findById(todo._id)).status).toBe('overdue');
        expect(notifyUser).toHaveBeenCalledWith(
            expect.anything(), 'task:overdue', expect.objectContaining({ id: todo._id.toString() })
        );
        expect(sendOverdueEmail).toHaveBeenCalledWith('test@example.com', expect.anything());
    });

    it('does not touch completed tasks or tasks that are not yet due', async () => {
        const completed = await TodoModel.create({
            title: 'Done', description: 'Done', dueDate: past(), status: 'completed', user: user._id
        });
        const upcoming = await TodoModel.create({
            title: 'Soon', description: 'Soon', dueDate: future(), user: user._id
        });

        expect(await processOverdueTodos()).toBe(0);
        expect((await TodoModel.findById(completed._id)).status).toBe('completed');
        expect((await TodoModel.findById(upcoming._id)).status).toBe('pending');
        expect(notifyUser).not.toHaveBeenCalled();
    });

    it('only notifies once per task', async () => {
        await TodoModel.create({ title: 'Late', description: 'Late', dueDate: past(), user: user._id });

        await processOverdueTodos();
        await processOverdueTodos();

        expect(notifyUser).toHaveBeenCalledTimes(1);
        expect(sendOverdueEmail).toHaveBeenCalledTimes(1);
    });

    it('shows the correct overdue state when a user logs back in', async () => {
        await TodoModel.create({ title: 'Missed while offline', description: 'x', dueDate: past(), user: user._id });

        const agent = request.agent(app);
        await agent.post('/auth/login').send({ username: 'testuser', password: 'password123' });
        const response = await agent.get('/todos');

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('Missed while offline');
        expect(response.text).toContain('status-overdue');
    });

    it('allows an overdue task to be completed and notifies the owner', async () => {
        const todo = await TodoModel.create({
            title: 'Late', description: 'Late', dueDate: past(), status: 'overdue', user: user._id
        });
        const agent = request.agent(app);
        await agent.post('/auth/login').send({ username: 'testuser', password: 'password123' });

        const response = await agent.post(`/todos/${todo._id}/status`).send({ status: 'completed' });

        expect(response.statusCode).toBe(302);
        expect((await TodoModel.findById(todo._id)).status).toBe('completed');
        expect(notifyUser).toHaveBeenCalledWith(
            expect.anything(), 'task:completed', expect.objectContaining({ id: todo._id.toString() })
        );
    });

    it('does not allow an expired task to be set back to pending', async () => {
        const todo = await TodoModel.create({
            title: 'Late', description: 'Late', dueDate: past(), status: 'overdue', user: user._id
        });
        const agent = request.agent(app);
        await agent.post('/auth/login').send({ username: 'testuser', password: 'password123' });

        const response = await agent.post(`/todos/${todo._id}/status`).send({ status: 'pending' });

        expect(response.statusCode).toBe(400);
        expect((await TodoModel.findById(todo._id)).status).toBe('overdue');
    });

    it('does not notify when another user\'s task is completed', async () => {
        const other = await UserModel.create({ username: 'otheruser', password: 'password123' });
        const todo = await TodoModel.create({
            title: 'Theirs', description: 'Theirs', dueDate: future(), user: other._id
        });
        const agent = request.agent(app);
        await agent.post('/auth/login').send({ username: 'testuser', password: 'password123' });

        const response = await agent.post(`/todos/${todo._id}/status`).send({ status: 'completed' });

        expect(response.statusCode).toBe(404);
        expect(notifyUser).not.toHaveBeenCalled();
    });
});
