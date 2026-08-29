const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const UserModel = require('../../src/modules/user/user.model');

const app = createTestApp();

describe('Authentication', () => {
    describe('POST /auth/signup', () => {
        it('should create a new user and redirect to todos', async () => {
            const response = await request(app)
                .post('/auth/signup')
                .send({
                    username: 'newuser',
                    password: 'password123'
                });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/todos');
            const user = await UserModel
                .findOne({ username: 'newuser' })
                .select('+password');
            expect(user).not.toBeNull();
            expect(user.username).toBe('newuser');
            expect(user.password).not.toBe('password123');
        });

        it('should reject duplicate username', async () => {
            await UserModel.create({
                username: 'existinguser',
                password: 'password123'
            });
            const response = await request(app)
                .post('/auth/signup')
                .send({
                    username: 'existinguser',
                    password: 'password123'
                });
            expect(response.statusCode).toBe(400);
            expect(response.text).toContain('Username already taken');
        });

        it('should reject a username shorter than 5 characters', async () => {
            const response = await request(app)
                .post('/auth/signup')
                .send({
                    username: 'abc',
                    password: 'password123'
                });

            expect(response.statusCode).toBe(400);
        });

        it('should reject a password shorter than 8 characters', async () => {
            const response = await request(app)
                .post('/auth/signup')
                .send({
                    username: 'testuser',
                    password: 'short'
                });

            expect(response.statusCode).toBe(400);
        });

    });

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            await UserModel.create({
                username: 'testuser',
                password: 'password123'
            });
        });
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                });
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/todos');
            expect(response.headers['set-cookie']).toBeDefined();
        });

        it('should reject an incorrect password', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'testuser',
                    password: 'wrongpassword'
                });
            expect(response.statusCode).toBe(401);
        });

        it('should reject an unknown username', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'unknownuser',
                    password: 'password123'
                });
            expect(response.statusCode).toBe(401);
        });

    });

    describe('Authentication protection', () => {
        it('should redirect unauthenticated users from todos', async () => {
            const response = await request(app)
                .get('/todos');
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/auth/login');
        });
    });

    describe('POST /auth/logout', () => {
        it('should logout an authenticated user', async () => {
            const agent = request.agent(app);
            await UserModel.create({
                username: 'logoutuser',
                password: 'password123'
            });

            await agent
                .post('/auth/login')
                .send({
                    username: 'logoutuser',
                    password: 'password123'
                });
            const response = await agent.post('/auth/logout');
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe('/auth/login');

            const protectedResponse = await agent.get('/todos');
            expect(protectedResponse.statusCode).toBe(302);
            expect(protectedResponse.headers.location).toBe('/auth/login');
        });
    });
    describe('Authentication pages', () => {
        it('should render the login page', async () => {
            const response = await request(app)
                .get('/auth/login');

            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Login');
        });

        it('should render the signup page', async () => {
            const response = await request(app)
                .get('/auth/signup');

            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Create Account');
        });
    });
});