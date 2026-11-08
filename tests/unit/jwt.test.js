const { signToken, verifyToken } = require('../../utils/jwt');

describe('JWT utils', () => {
    it('signs a token that verifies back to the same user', () => {
        const token = signToken({ _id: '507f1f77bcf86cd799439011', username: 'ada' });
        const payload = verifyToken(token);
        expect(payload.id).toBe('507f1f77bcf86cd799439011');
        expect(payload.username).toBe('ada');
    });

    it('rejects a tampered token', () => {
        const token = signToken({ _id: '1', username: 'ada' });
        expect(() => verifyToken(`${token}x`)).toThrow();
    });
});
