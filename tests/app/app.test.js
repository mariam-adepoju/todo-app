const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');

const app = createTestApp();

describe('Application', () => {
    describe('404 Not Found', () => {
        it('should return 404 for an unknown route', async () => {
            const response = await request(app)
                .get('/does-not-exist');
            expect(response.statusCode).toBe(404);
            expect(response.text).toContain('Something went wrong');
        });
    });
});