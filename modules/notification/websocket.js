const { WebSocketServer } = require('ws');
const { verifyToken } = require('../../utils/jwt');
const logger = require('../../utils/logger');

// userId (string) -> Set of open sockets (a user may have several tabs open)
const clients = new Map();

const parseCookies = (header = '') =>
    Object.fromEntries(
        header
            .split(';')
            .map((part) => part.trim().split('='))
            .filter(([key]) => key)
            .map(([key, ...value]) => [key, decodeURIComponent(value.join('='))])
    );

const reject = (socket, statusLine) => {
    socket.write(`HTTP/1.1 ${statusLine}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
};

const initWebSocket = (server) => {
    const wss = new WebSocketServer({ noServer: true });

    // Authenticate during the HTTP upgrade, BEFORE the socket is accepted
    server.on('upgrade', (req, socket, head) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            if (url.pathname !== '/ws') {
                return reject(socket, '404 Not Found');
            }

            // Reject cross-site connection attempts
            const { origin } = req.headers;
            if (origin && new URL(origin).host !== req.headers.host) {
                logger.warn(`WebSocket rejected: bad origin ${origin}`);
                return reject(socket, '403 Forbidden');
            }

            // Same JWT issued at login: cookie first, ?token= for non-browser clients
            const token = parseCookies(req.headers.cookie).token || url.searchParams.get('token');
            if (!token) {
                throw new Error('No token provided');
            }
            const payload = verifyToken(token);

            wss.handleUpgrade(req, socket, head, (ws) => {
                ws.userId = payload.id;
                wss.emit('connection', ws, req);
            });
        } catch (err) {
            logger.warn(`WebSocket authentication failed: ${err.message}`);
            reject(socket, '401 Unauthorized');
        }
    });

    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        if (!clients.has(ws.userId)) clients.set(ws.userId, new Set());
        clients.get(ws.userId).add(ws);
        logger.info(`WebSocket connected: user ${ws.userId}`);

        ws.send(JSON.stringify({ event: 'connected', data: { message: 'Notifications active' } }));

        ws.on('close', () => {
            const sockets = clients.get(ws.userId);
            if (sockets) {
                sockets.delete(ws);
                if (sockets.size === 0) clients.delete(ws.userId);
            }
            logger.info(`WebSocket disconnected: user ${ws.userId}`);
        });
        ws.on('error', (err) => logger.error(`WebSocket error: ${err.message}`));
    });

    // Heartbeat: drops dead connections and keeps idle ones alive behind proxies
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    interval.unref();
    wss.on('close', () => clearInterval(interval));

    return wss;
};

// Sends only to the given user's own open sockets.
// Offline users receive nothing - they see the correct state from the DB on next load.
const notifyUser = (userId, event, data) => {
    const sockets = clients.get(String(userId));
    if (!sockets || sockets.size === 0) return false;

    const message = JSON.stringify({ event, data });
    sockets.forEach((ws) => {
        if (ws.readyState === ws.OPEN) ws.send(message);
    });
    return true;
};

module.exports = { initWebSocket, notifyUser };
