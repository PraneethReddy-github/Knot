import EventBus from '../utils/events.js';
import { createMessage, parseMessage } from './protocol.js';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class PeerConnection extends EventBus {
  constructor(remotePeerId, signalingClient, isInitiator) {
    super();
    this.remotePeerId = remotePeerId;
    this._signaling = signalingClient;
    this._isInitiator = isInitiator;
    this._pc = null;
    this._controlChannel = null;
    this._fileChannel = null;
    this._state = 'new';
    this._mediaStream = null;

    this._create();
  }

  get state() { return this._state; }

  _create() {
    this._pc = new RTCPeerConnection(RTC_CONFIG);

    this._pc.onicecandidate = (event) => {
      if (event.candidate) {
        this._signaling.signal(this.remotePeerId, {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this._pc.onconnectionstatechange = () => {
      const s = this._pc.connectionState;
      this._state = s;
      this.emit('state', s);
      if (s === 'connected') this.emit('connected');
      if (s === 'failed' || s === 'closed') this.emit('disconnected');
    };

    this._pc.ontrack = (event) => {
      this.emit('track', event);
    };

    this._pc.ondatachannel = (event) => {
      if (event.channel.label === 'knot-control') {
        this._controlChannel = event.channel;
        this._bindControlChannel(event.channel);
      }
      if (event.channel.label === 'knot-file') {
        this._fileChannel = event.channel;
        this._bindFileChannel(event.channel);
      }
    };

    if (this._isInitiator) {
      this._controlChannel = this._pc.createDataChannel('knot-control', { ordered: true });
      this._bindControlChannel(this._controlChannel);

      this._fileChannel = this._pc.createDataChannel('knot-file', { ordered: true });
      this._bindFileChannel(this._fileChannel);
    }
  }

  _bindControlChannel(ch) {
    ch.onopen = () => this.emit('control:open');
    ch.onclose = () => this.emit('control:close');
    ch.onmessage = (event) => {
      const msg = parseMessage(event.data);
      if (msg) this.emit('message', msg);
    };
  }

  _bindFileChannel(ch) {
    ch.binaryType = 'arraybuffer';
    ch.onopen = () => this.emit('file:open');
    ch.onclose = () => this.emit('file:close');
    ch.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.emit('file:data', event.data);
      } else {
        const msg = parseMessage(event.data);
        if (msg) this.emit('file:message', msg);
      }
    };
  }

  async createOffer() {
    const offer = await this._pc.createOffer();
    await this._pc.setLocalDescription(offer);
    this._signaling.signal(this.remotePeerId, {
      type: 'sdp',
      sdp: this._pc.localDescription,
    });
  }

  async handleSignal(data) {
    if (data.type === 'sdp') {
      await this._pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === 'offer') {
        const answer = await this._pc.createAnswer();
        await this._pc.setLocalDescription(answer);
        this._signaling.signal(this.remotePeerId, {
          type: 'sdp',
          sdp: this._pc.localDescription,
        });
      }
    } else if (data.type === 'ice-candidate' && data.candidate) {
      try {
        await this._pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    }
  }

  sendControl(type, payload = {}) {
    if (!this._controlChannel || this._controlChannel.readyState !== 'open') return false;
    this._controlChannel.send(JSON.stringify(createMessage(type, payload)));
    return true;
  }

  sendFileData(buffer) {
    if (!this._fileChannel || this._fileChannel.readyState !== 'open') return false;
    this._fileChannel.send(buffer);
    return true;
  }

  sendFileMessage(type, payload = {}) {
    if (!this._fileChannel || this._fileChannel.readyState !== 'open') return false;
    this._fileChannel.send(JSON.stringify(createMessage(type, payload)));
    return true;
  }

  addTrack(track, stream) {
    if (this._pc) this._pc.addTrack(track, stream);
  }

  get fileChannelBufferedAmount() {
    return this._fileChannel ? this._fileChannel.bufferedAmount : 0;
  }

  close() {
    if (this._pc) {
      try { this._pc.close(); } catch {}
      this._pc = null;
    }
    this._state = 'closed';
  }
}
