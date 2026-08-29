jest.mock('../../src/modules/user/user.model');
const UserModel = require('../../src/modules/user/user.model');
const { signupUser, loginUser } = require('../../src/modules/auth/auth.service');

describe('Auth Service', () => {
    beforeEach(() => { jest.resetAllMocks() });

    describe('signupUser', () => {
        it('should create a new user successfully', async () => {
            UserModel.findOne.mockResolvedValue(null);
            const mockUser = {
                _id: 'user123',
                username: 'testuser'
            };
            UserModel.create.mockResolvedValue(mockUser);
            const result = await signupUser({
                username: 'testuser',
                password: 'password123'
            });
            expect(UserModel.findOne).toHaveBeenCalledWith({
                username: 'testuser'
            });
            expect(UserModel.create).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'password123'
            });
            expect(result).toEqual(mockUser);
        });

        it('should reject duplicate username and not create another user', async () => {
            UserModel.findOne.mockResolvedValue({
                username: 'testuser'
            });
            await expect(
                signupUser({
                    username: 'testuser',
                    password: 'password123'
                })
            ).rejects.toMatchObject({
                message: 'Username already taken',
                statusCode: 400
            });
            expect(UserModel.create).not.toHaveBeenCalled();
        });


    });

    describe('loginUser', () => {
        it('should login successfully with valid credentials', async () => {
            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                password: 'hashedPassword',
                comparePassword: jest.fn()
            };
            mockUser.comparePassword.mockResolvedValue(true);
            const selectMock = jest.fn().mockResolvedValue(mockUser);
            UserModel.findOne.mockReturnValue({
                select: selectMock
            });
            const result = await loginUser({
                username: 'testuser',
                password: 'password123'
            });
            expect(UserModel.findOne).toHaveBeenCalledWith({
                username: 'testuser'
            });
            expect(mockUser.comparePassword)
                .toHaveBeenCalledWith('password123');
            expect(result).toEqual(mockUser);
        });

        it('should reject login when username does not exist', async () => {
            const selectMock = jest.fn().mockResolvedValue(null);
            UserModel.findOne.mockReturnValue({
                select: selectMock
            });
            await expect(
                loginUser({
                    username: 'unknownuser',
                    password: 'password123'
                })
            ).rejects.toMatchObject({
                message: 'Invalid username or password',
                statusCode: 401
            });
            expect(selectMock).toHaveBeenCalledWith('+password');
        });

        it('should reject login when password is incorrect', async () => {
            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                password: 'hashedPassword',
                comparePassword: jest.fn()
            };
            mockUser.comparePassword.mockResolvedValue(false);
            const selectMock = jest.fn().mockResolvedValue(mockUser);
            UserModel.findOne.mockReturnValue({
                select: selectMock
            });
            await expect(
                loginUser({
                    username: 'testuser',
                    password: 'wrongpassword'
                })
            ).rejects.toMatchObject({
                message: 'Invalid username or password',
                statusCode: 401
            });
            expect(mockUser.comparePassword)
                .toHaveBeenCalledWith('wrongpassword');
        });

        it('should explicitly select the password for credential verification', async () => {
            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                password: 'hashedPassword',
                comparePassword: jest.fn()
            };
            mockUser.comparePassword.mockResolvedValue(true);
            const selectMock = jest.fn().mockResolvedValue(mockUser);
            UserModel.findOne.mockReturnValue({
                select: selectMock
            });
            const result = await loginUser({
                username: 'testuser',
                password: 'password123'
            });
            expect(result).toEqual(mockUser);
            expect(selectMock).toHaveBeenCalledWith('+password');
        });
    });
});