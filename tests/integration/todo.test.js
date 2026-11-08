const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const UserModel = require('../../modules/user/user.model');
const TodoModel = require('../../modules/todo/todo.model');
const app = createTestApp();
describe('Todo routes', () => {
    let agent;
    let user;

    beforeEach(async () => {
        agent = request.agent(app);
        user = await UserModel.create({
            username: 'testuser',
            password: 'password123'
        });
        await agent
            .post('/auth/login')
            .send({
                username: 'testuser',
                password: 'password123'
            });
    });
    // TODO CREATION
    describe('POST /todos - Todo creation', () => {
        it('should create a todo for authenticated user', async () => {
            const response = await agent
                .post('/todos')
                .send({
                    title: 'Learn Jest',
                    description: 'Write automated tests',
                    dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/todos');

            const todo = await TodoModel.findOne({ title: 'Learn Jest' });
            expect(todo).not.toBeNull();
            expect(todo.dueDate).toBeInstanceOf(Date);
            expect(todo.description).toBe('Write automated tests');
            expect(todo.user.toString()).toBe(user._id.toString());
            expect(todo.status).toBe('pending');
        });

        it('should reject todo without a title', async () => {
            const response = await agent
                .post('/todos')
                .send({
                    title: '',
                    description: 'Something'
                });
            expect(response.statusCode).toBe(400);
        });

        it('should reject todo without a description', async () => {
            const response = await agent
                .post('/todos')
                .send({
                    title: 'Learn Jest',
                    description: ''
                });
            expect(response.statusCode).toBe(400);
        });

        it('should reject a title longer than 200 characters', async () => {
            const response = await agent
                .post('/todos')
                .send({
                    title: 'a'.repeat(201),
                    description: 'Valid description'
                });
            expect(response.statusCode).toBe(400);
        });

        it('should reject a description longer than 1000 characters', async () => {
            const response = await agent
                .post('/todos')
                .send({
                    title: 'Long Todo',
                    description: 'a'.repeat(1001)
                });
            expect(response.statusCode).toBe(400);
        });
    });
    // TODO STATUS
    describe('POST /todos/:id/status - Todo status', () => {
        it('should update todo status to completed', async () => {
            const todo = await TodoModel.create({
                title: 'Complete testing',
                description: 'Finish tests',
                user: user._id
            });
            const response = await agent
                .post(`/todos/${todo._id}/status`)
                .send({ status: 'completed' });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/todos');

            const updatedTodo = await TodoModel.findById(todo._id);
            expect(updatedTodo.status).toBe('completed');
        });


        it('should update todo status to deleted', async () => {
            const todo = await TodoModel.create({
                title: 'Delete testing',
                description: 'Test deleting todo',
                user: user._id
            });

            const response = await agent
                .post(`/todos/${todo._id}/status`)
                .send({ status: 'deleted' });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/todos');

            const updatedTodo = await TodoModel.findById(todo._id);
            expect(updatedTodo.status).toBe('deleted');
        });

        it('should reject an invalid status', async () => {
            const todo = await TodoModel.create({
                title: 'Test status',
                description: 'Testing status',
                user: user._id
            });

            const response = await agent
                .post(`/todos/${todo._id}/status`)
                .send({ status: 'invalid' });
            expect(response.statusCode).toBe(400);
        });
    });
    // TODO FILTERING
    describe('GET /todos - Todo filtering', () => {
        it('should display all non-deleted todos by default', async () => {
            await TodoModel.create([
                {
                    title: 'Pending Todo',
                    description: 'Pending task',
                    status: 'pending',
                    user: user._id
                },
                {
                    title: 'Completed Todo',
                    description: 'Completed task',
                    status: 'completed',
                    user: user._id
                },
                {
                    title: 'Deleted Todo',
                    description: 'Deleted task',
                    status: 'deleted',
                    user: user._id
                }
            ]);

            const response = await agent.get('/todos');
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Pending Todo');
            expect(response.text).toContain('Completed Todo');
            expect(response.text).not.toContain('Deleted Todo');
        });


        it('should filter todos by pending status', async () => {
            await TodoModel.create([
                {
                    title: 'Pending Todo',
                    description: 'Pending task',
                    status: 'pending',
                    user: user._id
                },
                {
                    title: 'Completed Todo',
                    description: 'Completed task',
                    status: 'completed',
                    user: user._id
                }
            ]);

            const response = await agent.get('/todos?status=pending');
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Pending Todo');
            expect(response.text).not.toContain('Completed Todo');
        });

        it('should filter todos by completed status', async () => {
            await TodoModel.create([
                {
                    title: 'Pending Todo',
                    description: 'Pending task',
                    status: 'pending',
                    user: user._id
                },
                {
                    title: 'Completed Todo',
                    description: 'Completed task',
                    status: 'completed',
                    user: user._id
                }
            ]);

            const response = await agent.get('/todos?status=completed');
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Completed Todo');
            expect(response.text).not.toContain('Pending Todo');
        });
    });
    // USER ISOLATION
    describe('User isolation', () => {
        it('should not allow one user to update another user\'s todo', async () => {
            const otherUser = await UserModel.create({
                username: 'otheruser',
                password: 'password123'
            });
            const todo = await TodoModel.create({
                title: 'Private todo',
                description: 'Belongs to another user',
                user: otherUser._id
            });

            const response = await agent
                .post(`/todos/${todo._id}/status`)
                .send({ status: 'completed' });
            expect(response.statusCode).toBe(404);
            const unchangedTodo = await TodoModel.findById(todo._id);
            expect(unchangedTodo.status).toBe('pending');
        });

        it('should only display todos belonging to the logged-in user', async () => {
            const otherUser = await UserModel.create({
                username: 'otheruser',
                password: 'password123'
            });

            await TodoModel.create({
                title: 'My Private Todo',
                description: 'Belongs to me',
                user: user._id
            });

            await TodoModel.create({
                title: 'Other User Todo',
                description: 'Should not be visible',
                user: otherUser._id
            });

            const response = await agent.get('/todos');
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('My Private Todo');
            expect(response.text).not.toContain('Other User Todo');
        });

        it('should reject unauthenticated todo creation', async () => {
            const response = await request(app)
                .post('/todos')
                .send({
                    title: 'Unauthorized Todo',
                    description: 'Should not be created'
                });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/auth/login');
        });

        it('should reject unauthenticated status updates', async () => {
            const todo = await TodoModel.create({
                title: 'Protected Todo',
                description: 'Protected description',
                user: user._id
            });

            const response = await request(app)
                .post(`/todos/${todo._id}/status`)
                .send({
                    status: 'completed'
                });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/auth/login');
        });
    });

    it('should render the create todo page for authenticated users', async () => {
        const agent = request.agent(app);
        await agent
            .post('/auth/login')
            .send({
                username: 'testuser',
                password: 'password123'
            });
        const response = await agent
            .get('/todos/create');
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('Create Todo');
    });
});
