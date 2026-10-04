import EventBus from '../utils/events.js';
import { SignalingClient } from './signaling.js';
import { PeerConnection } from './connection.js';
import { TransferEngine } from './transfer.js';
import { SyncController } from './sync.js';
import { MSG } from './protocol.js';
import { getIdentity } from '../utils/identity.js';

function getSignalingUrl() {
  if (import.meta.env.VITE_SIGNALING_URL) return import.meta.env.VITE_SIGNALING_URL;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  if (import.meta.env.DEV) return `${proto}//${window.location.hostname}:8787/ws`;
  return `${proto}//${host}/ws`;
}
const SIGNALING_URL = getSignalingUrl();

export class Room extends EventBus {
  constructor() {
    super();
    this.identity = getIdentity();
    this.code = null;
    this.isHost = false;
    this.peers = new Map();
    this.connections = new Map();
    this.signaling = new SignalingClient(SIGNALING_URL);
    this.transfers = new TransferEngine();
    this.sync = null;
    this._videoElement = null;
    this._mediaStream = null;

    this._bindSignaling();
    this._bindTransfers();
  }

  create() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    this.code = code;
    this.isHost = true;
    this.sync = new SyncController(true);
    this._bindSync();
    this.signaling.connect(this.code, this.identity.id, this.identity);
    this.emit('room:created', { code: this.code });
  }

  join(code) {
    this.code = code.toUpperCase().trim();
    this.isHost = false;
    this.sync = new SyncController(false);
    this._bindSync();
    this.signaling.connect(this.code, this.identity.id, this.identity);
    this.emit('room:joining', { code: this.code });
  }

  leave() {
    this.sync?.stopSyncing();
    for (const conn of this.connections.values()) conn.close();
    this.connections.clear();
    this.peers.clear();
    this.signaling.disconnect();
    this.code = null;
    this.emit('room:left');
  }

  sendFile(peerId, file) {
    const conn = this.connections.get(peerId);
    if (!conn) return null;
    return this.transfers.sendFile(peerId, file, conn);
  }

  sendFileToAll(file) {
    for (const [peerId] of this.connections) {
      this.sendFile(peerId, file);
    }
  }

  acceptTransfer(transferId) {
    this.transfers.acceptFile(transferId);
  }

  rejectTransfer(transferId) {
    this.transfers.rejectFile(transferId);
  }

  setVideoElement(el) {
    this._videoElement = el;
  }

  streamVideo(file) {
    if (!this._videoElement) return;
    const url = URL.createObjectURL(file);
    this._videoElement.src = url;

    this._videoElement.onloadedmetadata = () => {
      this.sync.state.mediaName = file.name;

      if (this._videoElement.captureStream) {
        this._mediaStream = this._videoElement.captureStream();
      } else if (this._videoElement.mozCaptureStream) {
        this._mediaStream = this._videoElement.mozCaptureStream();
      }

      if (this._mediaStream) {
        for (const conn of this.connections.values()) {
          for (const track of this._mediaStream.getTracks()) {
            conn.addTrack(track, this._mediaStream);
          }
        }
      }

      for (const conn of this.connections.values()) {
        conn.sendControl(MSG.STREAM_OFFER, { name: file.name });
      }

      this.emit('stream:ready', { name: file.name });
    };
  }

  hostPlay() {
    if (!this._videoElement || !this.isHost) return;
    this._videoElement.play().catch(() => {});
    this.sync.hostPlay(this._videoElement.currentTime, this.connections);
  }

  hostPause() {
    if (!this._videoElement || !this.isHost) return;
    this._videoElement.pause();
    this.sync.hostPause(this._videoElement.currentTime, this.connections);
  }

  hostSeek(time) {
    if (!this._videoElement || !this.isHost) return;
    this._videoElement.currentTime = time;
    this.sync.hostSeek(time, this.connections);
  }

  _bindSignaling() {
    this.signaling.on('connected', () => {
      this.emit('signaling:connected');
    });

    this.signaling.on('disconnected', () => {
      this.emit('signaling:disconnected');
    });

    this.signaling.on('peer_joined', (msg) => {
      const { peerId, name, color } = msg;
      if (peerId === this.identity.id) return;

      this.peers.set(peerId, { id: peerId, name, color, state: 'connecting' });
      this.emit('peer:joined', { id: peerId, name, color });

      const isInitiator = this.identity.id > peerId;
      const conn = new PeerConnection(peerId, this.signaling, isInitiator);
      this.connections.set(peerId, conn);
      this._bindPeerConnection(peerId, conn);

      if (isInitiator) {
        conn.createOffer();
      }
    });

    this.signaling.on('peer_left', (msg) => {
      const { peerId } = msg;
      this.peers.delete(peerId);
      const conn = this.connections.get(peerId);
      if (conn) {
        conn.close();
        this.connections.delete(peerId);
      }
      this.emit('peer:left', { id: peerId });
    });

    this.signaling.on('signal', (msg) => {
      const { from, data } = msg;
      let conn = this.connections.get(from);
      if (!conn) {
        conn = new PeerConnection(from, this.signaling, false);
        this.connections.set(from, conn);
        this._bindPeerConnection(from, conn);
      }
      conn.handleSignal(data);
    });

    this.signaling.on('room_info', (msg) => {
      if (msg.peers) {
        for (const p of msg.peers) {
          if (p.peerId !== this.identity.id) {
            this.peers.set(p.peerId, { id: p.peerId, name: p.name, color: p.color, state: 'connecting' });
            this.emit('peer:joined', { id: p.peerId, name: p.name, color: p.color });
          }
        }
      }
    });

    this.signaling.on('error', (msg) => {
      this.emit('error', msg);
    });
  }

  _bindPeerConnection(peerId, conn) {
    conn.on('connected', () => {
      const peer = this.peers.get(peerId);
      if (peer) peer.state = 'connected';
      this.emit('peer:connected', { id: peerId });

      if (this.isHost && this._mediaStream) {
        for (const track of this._mediaStream.getTracks()) {
          conn.addTrack(track, this._mediaStream);
        }
        conn.sendControl(MSG.STREAM_OFFER, { name: this.sync.state.mediaName });
      }

      if (this.isHost) {
        this.sync.startSyncing(this.connections);
      }
    });

    conn.on('disconnected', () => {
      const peer = this.peers.get(peerId);
      if (peer) peer.state = 'disconnected';
      this.emit('peer:disconnected', { id: peerId });
    });

    conn.on('message', (msg) => {
      this._handleControlMessage(peerId, msg);
    });

    conn.on('file:message', (msg) => {
      this._handleFileMessage(peerId, msg, conn);
    });

    conn.on('file:data', (data) => {
      this.transfers.handleFileData(peerId, data);
    });

    conn.on('track', (event) => {
      this.emit('track', { peerId, event });
    });
  }

  _handleControlMessage(peerId, msg) {
    switch (msg.type) {
      case MSG.PLAY:
      case MSG.PAUSE:
      case MSG.SEEK:
      case MSG.SYNC_STATE:
        if (this.sync) {
          this.sync.handleSyncMessage(msg, this._videoElement);
        }
        break;
      case MSG.STREAM_OFFER:
        this.emit('stream:offer', { peerId, name: msg.payload.name });
        break;
      default:
        this.emit('control:message', { peerId, msg });
    }
  }

  _handleFileMessage(peerId, msg, conn) {
    switch (msg.type) {
      case MSG.FILE_OFFER:
        this.transfers.handleFileOffer(peerId, msg.payload, conn);
        break;
      case MSG.FILE_ACCEPT:
        this.transfers.handleFileAccept(msg.payload.transferId, conn);
        break;
      case MSG.FILE_REJECT:
        this.transfers.handleFileReject(msg.payload.transferId);
        break;
      case MSG.FILE_ACK:
        this.transfers.handleFileAck(msg.payload.transferId);
        break;
      case MSG.FILE_CANCEL:
        this.transfers.cancelTransfer(msg.payload.transferId);
        break;
    }
  }

  _bindTransfers() {
    this.transfers.on('transfer:offer', (data) => this.emit('transfer:offer', data));
    this.transfers.on('transfer:started', (data) => this.emit('transfer:started', data));
    this.transfers.on('transfer:progress', (data) => this.emit('transfer:progress', data));
    this.transfers.on('transfer:complete', (data) => this.emit('transfer:complete', data));
    this.transfers.on('transfer:cancelled', (data) => this.emit('transfer:cancelled', data));
    this.transfers.on('transfer:rejected', (data) => this.emit('transfer:rejected', data));
  }

  _bindSync() {
    this.sync.on('sync:request', () => {
      if (this._videoElement) {
        this.sync.state.position = this._videoElement.currentTime;
        this.sync.state.playing = !this._videoElement.paused;
      }
    });
  }
}
