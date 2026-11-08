(function () {
    // Show due dates in the viewer's own timezone
    document.querySelectorAll('time[datetime]').forEach(function (el) {
        var date = new Date(el.getAttribute('datetime'));
        if (!isNaN(date)) el.textContent = date.toLocaleString();
    });

    // ---- toasts ----
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;max-width:320px';
    document.body.appendChild(box);

    function toast(text, color) {
        var el = document.createElement('div');
        el.textContent = text;
        el.style.cssText =
            'background:' + color + ';color:#fff;padding:10px 14px;margin-bottom:8px;' +
            'border-radius:6px;font-family:sans-serif;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.25)';
        box.appendChild(el);
        setTimeout(function () { el.remove(); }, 7000);
    }

    // ---- update the card on the page without reloading ----
    function setStatus(id, status) {
        var card = document.querySelector('[data-todo-id="' + id + '"]');
        if (!card) return;
        var label = card.querySelector('.status');
        if (label) {
            label.textContent = status;
            label.className = 'status status-' + status;
        }
        var select = card.querySelector('select[name="status"]');
        if (!select) return;
        if (status === 'overdue') {
            select.innerHTML =
                '<option value="" disabled selected>Overdue - choose action</option>' +
                '<option value="completed">Completed</option>' +
                '<option value="deleted">Deleted</option>';
            select.required = true;
        } else if (status === 'completed') {
            select.value = 'completed';
        }
    }

    // ---- WebSocket (authenticated by the JWT cookie set at login) ----
    var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    var retryDelay = 2000;
    var connectedBefore = false;

    function connect() {
        var ws = new WebSocket(protocol + '://' + location.host + '/ws');

        ws.onopen = function () {
            retryDelay = 2000;
            // We may have missed messages while disconnected: reload so the page
            // shows the true state from the database.
            if (connectedBefore && location.pathname === '/todos') {
                location.reload();
                return;
            }
            connectedBefore = true;
        };

        ws.onmessage = function (e) {
            var msg;
            try { msg = JSON.parse(e.data); } catch (err) { return; }
            if (msg.event === 'task:overdue') {
                toast(msg.data.message, '#c0392b');
                setStatus(msg.data.id, 'overdue');
            } else if (msg.event === 'task:completed') {
                toast(msg.data.message, '#27ae60');
                setStatus(msg.data.id, 'completed');
            }
        };

        ws.onclose = function () {
            setTimeout(connect, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 30000);
        };
    }

    connect();
})();
