import EventBus from '../utils/events.js';
import { MSG } from './protocol.js';

export class SyncController extends EventBus {
  constructor(isHost) {
    super();
    this._isHost = isHost;
    this._syncInterval = null;
    this._state = {
      playing: false,
      position: 0,
      mediaName: null,
      timestamp: Date.now(),
    };
  }

  get isHost() { return this._isHost; }
  get state() { return this._state; }

  setHost(isHost) {
    this._isHost = isHost;
  }

  startSyncing(connections) {
    if (!this._isHost) return;
    this.stopSyncing();
    this._syncInterval = setInterval(() => {
      this._broadcastState(connections);
    }, 5000);
  }

  stopSyncing() {
    clearInterval(this._syncInterval);
    this._syncInterval = null;
  }

  hostPlay(position, connections) {
    if (!this._isHost) return;
    this._state.playing = true;
    this._state.position = position;
    this._state.timestamp = Date.now();
    this._broadcast(connections, MSG.PLAY, { position, timestamp: this._state.timestamp });
    this.emit('play', { position });
  }

  hostPause(position, connections) {
    if (!this._isHost) return;
    this._state.playing = false;
    this._state.position = position;
    this._state.timestamp = Date.now();
    this._broadcast(connections, MSG.PAUSE, { position });
    this.emit('pause', { position });
  }

  hostSeek(position, connections) {
    if (!this._isHost) return;
    this._state.position = position;
    this._state.timestamp = Date.now();
    this._broadcast(connections, MSG.SEEK, { position, timestamp: this._state.timestamp });
    this.emit('seek', { position });
  }

  handleSyncMessage(msg, videoElement) {
    if (this._isHost) return;

    switch (msg.type) {
      case MSG.PLAY:
        if (videoElement) {
          videoElement.currentTime = msg.payload.position;
          videoElement.play().catch(() => {});
        }
        this.emit('play', msg.payload);
        break;

      case MSG.PAUSE:
        if (videoElement) {
          videoElement.currentTime = msg.payload.position;
          videoElement.pause();
        }
        this.emit('pause', msg.payload);
        break;

      case MSG.SEEK:
        if (videoElement) {
          videoElement.currentTime = msg.payload.position;
        }
        this.emit('seek', msg.payload);
        break;

      case MSG.SYNC_STATE:
        this._correctDrift(msg.payload, videoElement);
        break;
    }
  }

  _correctDrift(hostState, videoElement) {
    if (!videoElement || !hostState.playing) return;

    const networkDelay = 0.05;
    const expectedPosition = hostState.position + ((Date.now() - hostState.timestamp) / 1000) + networkDelay;
    const drift = videoElement.currentTime - expectedPosition;

    if (Math.abs(drift) > 2) {
      videoElement.currentTime = expectedPosition;
    } else if (Math.abs(drift) > 0.5) {
      videoElement.playbackRate = drift > 0 ? 0.95 : 1.05;
      setTimeout(() => { videoElement.playbackRate = 1.0; }, 2000);
    }
  }

  _broadcastState(connections) {
    this.emit('sync:request');
    const payload = {
      ...this._state,
      timestamp: Date.now(),
    };
    this._broadcast(connections, MSG.SYNC_STATE, payload);
  }

  _broadcast(connections, type, payload) {
    for (const conn of connections.values()) {
      conn.sendControl(type, payload);
    }
  }
}
