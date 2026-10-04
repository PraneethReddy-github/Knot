const PROTOCOL_VERSION = 1;

let _counter = 0;
function msgId() {
  return `m_${Date.now().toString(36)}_${(++_counter).toString(36)}`;
}

export function createMessage(type, payload = {}) {
  return {
    v: PROTOCOL_VERSION,
    type,
    id: msgId(),
    ts: Date.now(),
    payload,
  };
}

export function parseMessage(raw) {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

export const MSG = {
  HELLO: 'HELLO',
  WELCOME: 'WELCOME',
  FILE_OFFER: 'FILE_OFFER',
  FILE_ACCEPT: 'FILE_ACCEPT',
  FILE_REJECT: 'FILE_REJECT',
  FILE_CHUNK: 'FILE_CHUNK',
  FILE_ACK: 'FILE_ACK',
  FILE_CANCEL: 'FILE_CANCEL',
  FILE_COMPLETE: 'FILE_COMPLETE',
  STREAM_OFFER: 'STREAM_OFFER',
  STREAM_READY: 'STREAM_READY',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  SEEK: 'SEEK',
  SYNC_REQ: 'SYNC_REQ',
  SYNC_STATE: 'SYNC_STATE',
  PEER_JOINED: 'PEER_JOINED',
  PEER_LEFT: 'PEER_LEFT',
  ROOM_CLOSE: 'ROOM_CLOSE',
};
