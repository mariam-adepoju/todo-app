const createError = require('../../utils/createError');

describe('createError', () => {
    it('should create an error with message and status code', () => {
        const error = createError('Something went wrong', 400);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Something went wrong');
        expect(error.statusCode).toBe(400);
    });
});