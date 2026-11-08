const http = require('http');
const WebSocket = require('ws');
const { initWebSocket, notifyUser } = require('../../modules/notification/websocket');
const { signToken } = require('../../utils/jwt');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('WebSocket notifications', () => {
    let server;
    let wss;
    let port;

    beforeAll((done) => {
        server = http.createServer();
        wss = initWebSocket(server);
        server.listen(0, () => {
            port = server.address().port;
            done();
        });
    });

    afterAll((done) => {
        wss.clients.forEach((client) => client.terminate());
        wss.close();
        server.close(done);
    });

    // Resolves with the open socket (collecting its messages) or rejects with the HTTP status
    const connect = ({ cookie, query = '' } = {}) =>
        new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${port}/ws${query}`, {
                headers: cookie ? { Cookie: cookie } : {}
            });
            ws.messages = [];
            ws.on('message', (raw) => ws.messages.push(JSON.parse(raw.toString())));
            ws.once('open', () => resolve(ws));
            ws.once('unexpected-response', (req, res) =>
                reject(Object.assign(new Error('rejected'), { status: res.statusCode }))
            );
            ws.once('error', reject);
        });

    const tokenFor = (id) => signToken({ _id: id, username: `user-${id}` });

    it('rejects a connection without a token', async () => {
        await expect(connect()).rejects.toMatchObject({ status: 401 });
    });

    it('rejects a connection with an invalid token', async () => {
        await expect(connect({ cookie: 'token=not.a.real.token' })).rejects.toMatchObject({ status: 401 });
    });

    it('accepts a connection with a valid JWT cookie', async () => {
        const ws = await connect({ cookie: `token=${tokenFor('userA')}` });
        await wait(50);
        expect(ws.messages[0].event).toBe('connected');
        ws.close();
    });

    it('delivers notifications only to the owner of the task', async () => {
        const owner = await connect({ cookie: `token=${tokenFor('owner1')}` });
        const other = await connect({ cookie: `token=${tokenFor('other1')}` });

        const delivered = notifyUser('owner1', 'task:completed', { id: 't1', message: 'done' });
        await wait(100);

        expect(delivered).toBe(true);
        expect(owner.messages.some((m) => m.event === 'task:completed')).toBe(true);
        expect(other.messages.some((m) => m.event === 'task:completed')).toBe(false);

        owner.close();
        other.close();
    });

    it('does not deliver to a user who is disconnected', async () => {
        expect(notifyUser('offlineUser', 'task:overdue', { id: 't2' })).toBe(false);
    });
});
