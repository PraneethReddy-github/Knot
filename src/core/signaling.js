import EventBus from '../utils/events.js';

export class SignalingClient extends EventBus {
  constructor(serverUrl) {
    super();
    this._serverUrl = serverUrl;
    this._ws = null;
    this._reconnectTimer = null;
    this._peerId = null;
    this._roomCode = null;
    this._connected = false;
  }

  get connected() { return this._connected; }

  connect(roomCode, peerId, identity) {
    this._peerId = peerId;
    this._roomCode = roomCode;
    this._identity = identity;
    this._doConnect();
  }

  _doConnect() {
    if (this._ws) {
      try { this._ws.close(); } catch {}
    }

    const params = new URLSearchParams({
      room: this._roomCode,
      peerId: this._peerId,
      name: this._identity.name,
      color: this._identity.color,
    });

    const url = `${this._serverUrl}?${params}`;
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      this._connected = true;
      clearTimeout(this._reconnectTimer);
      this.emit('connected', { room: this._roomCode });
    };

    this._ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.emit(msg.type, msg);
      } catch {}
    };

    this._ws.onclose = () => {
      this._connected = false;
      this.emit('disconnected');
      this._scheduleReconnect();
    };

    this._ws.onerror = () => {
      this.emit('error', { message: 'Signaling connection failed' });
    };
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      if (!this._connected && this._roomCode) {
        this._doConnect();
      }
    }, 3000);
  }

  send(type, data = {}) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return false;
    this._ws.send(JSON.stringify({ type, ...data }));
    return true;
  }

  signal(toPeerId, signalData) {
    return this.send('signal', { to: toPeerId, data: signalData });
  }

  disconnect() {
    clearTimeout(this._reconnectTimer);
    this._roomCode = null;
    if (this._ws) {
      this._ws.onclose = null;
      try { this._ws.close(); } catch {}
      this._ws = null;
    }
    this._connected = false;
  }
}
