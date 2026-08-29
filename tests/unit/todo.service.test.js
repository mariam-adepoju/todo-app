jest.mock('../../src/modules/todo/todo.model');
const TaskModel = require('../../src/modules/todo/todo.model');
const { createTodoForUser, updateTodoStatusForUser } = require('../../src/modules/todo/todo.service');

describe('Todo Service', () => {
    beforeEach(() => { jest.resetAllMocks() });

    describe('createTodoForUser', () => {
        it('should throw an error when title is missing', async () => {
            await expect(
                createTodoForUser('user123', '', 'Test description')
            ).rejects.toMatchObject({
                message: 'Task title is required',
                statusCode: 400
            });
            expect(TaskModel.create).not.toHaveBeenCalled();
        });

        it('should throw an error when description is missing', async () => {
            await expect(
                createTodoForUser('user123', 'Test Todo', '')
            ).rejects.toMatchObject({
                message: 'Task description is required',
                statusCode: 400
            });
            expect(TaskModel.create).not.toHaveBeenCalled();
        });

        it('should create a todo successfully', async () => {
            const mockTodo = {
                _id: 'todo123',
                title: 'Learn Jest',
                description: 'Write tests',
                user: 'user123',
                status: 'pending'
            };
            TaskModel.create.mockResolvedValue(mockTodo);
            const result = await createTodoForUser(
                'user123',
                '  Learn Jest  ',
                '  Write tests  '
            );

            expect(TaskModel.create).toHaveBeenCalledWith({
                title: 'Learn Jest',
                description: 'Write tests',
                user: 'user123'
            });
            expect(result).toEqual(mockTodo);
        });
    });

    describe('updateTodoStatusForUser', () => {
        it('should reject an invalid status', async () => {
            await expect(
                updateTodoStatusForUser(
                    'todo123',
                    'user123',
                    'invalid'
                )
            ).rejects.toMatchObject({
                message: 'Invalid status provided',
                statusCode: 400
            });

            expect(TaskModel.findOneAndUpdate).not.toHaveBeenCalled();
        });


        it('should throw 404 when todo does not exist', async () => {
            TaskModel.findOneAndUpdate.mockResolvedValue(null);
            await expect(updateTodoStatusForUser(
                'todo123',
                'user123',
                'completed'
            )).rejects.toMatchObject({
                message: 'Task not found',
                statusCode: 404
            });
        });

        it('should update todo status successfully', async () => {
            const updatedTodo = {
                _id: 'todo123',
                title: 'Learn Jest',
                status: 'completed',
                user: 'user123'
            };
            TaskModel.findOneAndUpdate.mockResolvedValue(updatedTodo);
            const result = await updateTodoStatusForUser(
                'todo123',
                'user123',
                'completed'
            );
            expect(TaskModel.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: 'todo123',
                    user: 'user123'
                },
                {
                    status: 'completed'
                },
                {
                    returnDocument: "after",
                    runValidators: true
                }
            );
            expect(result).toEqual(updatedTodo);
        });
    });
});