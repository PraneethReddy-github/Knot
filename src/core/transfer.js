import EventBus from '../utils/events.js';
import { MSG } from './protocol.js';

const CHUNK_SIZE = 64 * 1024;
const CHUNKS_PER_BLOCK = 32;
const BACKPRESSURE_THRESHOLD = 1024 * 1024;

export class TransferEngine extends EventBus {
  constructor() {
    super();
    this._outgoing = new Map();
    this._incoming = new Map();
  }

  async sendFile(peerId, file, connection) {
    const chunksTotal = Math.ceil(file.size / CHUNK_SIZE);
    const transferId = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const transfer = {
      id: transferId,
      file,
      peerId,
      connection,
      name: file.name,
      size: file.size,
      type: file.type,
      chunksTotal,
      chunksSent: 0,
      startTime: Date.now(),
      cancelled: false,
    };

    this._outgoing.set(transferId, transfer);

    connection.sendFileMessage(MSG.FILE_OFFER, {
      transferId,
      name: file.name,
      size: file.size,
      type: file.type,
      chunksTotal,
    });

    this.emit('transfer:started', {
      id: transferId,
      peerId,
      name: file.name,
      size: file.size,
      direction: 'out',
    });

    return transferId;
  }

  handleFileAccept(transferId, connection) {
    const transfer = this._outgoing.get(transferId);
    if (!transfer) return;
    this._sendNextBlock(transfer);
  }

  handleFileReject(transferId) {
    const transfer = this._outgoing.get(transferId);
    if (!transfer) return;
    this._outgoing.delete(transferId);
    this.emit('transfer:rejected', { id: transferId, peerId: transfer.peerId });
  }

  async _sendNextBlock(transfer) {
    if (transfer.cancelled) return;
    const { file, connection, chunksTotal } = transfer;
    const startChunk = transfer.chunksSent;
    const endChunk = Math.min(startChunk + CHUNKS_PER_BLOCK, chunksTotal);

    for (let i = startChunk; i < endChunk; i++) {
      if (transfer.cancelled) return;

      while (connection.fileChannelBufferedAmount > BACKPRESSURE_THRESHOLD) {
        await new Promise(r => setTimeout(r, 10));
      }

      const offset = i * CHUNK_SIZE;
      const end = Math.min(offset + CHUNK_SIZE, file.size);
      const chunk = file.slice(offset, end);
      const buffer = await chunk.arrayBuffer();
      connection.sendFileData(buffer);
      transfer.chunksSent = i + 1;

      this.emit('transfer:progress', {
        id: transfer.id,
        peerId: transfer.peerId,
        direction: 'out',
        progress: transfer.chunksSent / chunksTotal,
        speed: this._calcSpeed(transfer),
      });
    }

    if (transfer.chunksSent >= chunksTotal) {
      this._outgoing.delete(transfer.id);
      this.emit('transfer:complete', {
        id: transfer.id,
        peerId: transfer.peerId,
        direction: 'out',
        name: transfer.name,
      });
    }
  }

  handleFileOffer(peerId, payload, connection) {
    const transfer = {
      id: payload.transferId,
      peerId,
      connection,
      name: payload.name,
      size: payload.size,
      type: payload.type,
      chunksTotal: payload.chunksTotal,
      chunksReceived: 0,
      chunks: [],
      startTime: null,
    };

    this._incoming.set(transfer.id, transfer);

    this.emit('transfer:offer', {
      id: transfer.id,
      peerId,
      name: payload.name,
      size: payload.size,
      type: payload.type,
    });
  }

  acceptFile(transferId) {
    const transfer = this._incoming.get(transferId);
    if (!transfer) return;
    transfer.startTime = Date.now();
    transfer.connection.sendFileMessage(MSG.FILE_ACCEPT, { transferId });
    this.emit('transfer:started', {
      id: transferId,
      peerId: transfer.peerId,
      name: transfer.name,
      size: transfer.size,
      direction: 'in',
    });
  }

  rejectFile(transferId) {
    const transfer = this._incoming.get(transferId);
    if (!transfer) return;
    transfer.connection.sendFileMessage(MSG.FILE_REJECT, { transferId });
    this._incoming.delete(transferId);
  }

  handleFileData(peerId, data) {
    let transfer = null;
    for (const t of this._incoming.values()) {
      if (t.peerId === peerId) { transfer = t; break; }
    }
    if (!transfer) return;

    transfer.chunks.push(data);
    transfer.chunksReceived++;

    this.emit('transfer:progress', {
      id: transfer.id,
      peerId: transfer.peerId,
      direction: 'in',
      progress: transfer.chunksReceived / transfer.chunksTotal,
      speed: this._calcSpeed(transfer),
    });

    if (transfer.chunksReceived >= transfer.chunksTotal) {
      const blob = new Blob(transfer.chunks, { type: transfer.type });
      transfer.chunks = [];

      this._incoming.delete(transfer.id);

      this.emit('transfer:complete', {
        id: transfer.id,
        peerId: transfer.peerId,
        direction: 'in',
        name: transfer.name,
        blob,
      });

      this._downloadBlob(blob, transfer.name);
    }
  }

  handleFileAck(transferId) {
    const transfer = this._outgoing.get(transferId);
    if (transfer) this._sendNextBlock(transfer);
  }

  cancelTransfer(transferId) {
    const out = this._outgoing.get(transferId);
    if (out) {
      out.cancelled = true;
      out.connection.sendFileMessage(MSG.FILE_CANCEL, { transferId });
      this._outgoing.delete(transferId);
    }
    const inc = this._incoming.get(transferId);
    if (inc) {
      inc.connection.sendFileMessage(MSG.FILE_CANCEL, { transferId });
      this._incoming.delete(transferId);
    }
    this.emit('transfer:cancelled', { id: transferId });
  }

  _calcSpeed(transfer) {
    const elapsed = (Date.now() - transfer.startTime) / 1000;
    if (elapsed === 0) return 0;
    const chunks = transfer.chunksSent || transfer.chunksReceived || 0;
    return (chunks * CHUNK_SIZE) / elapsed;
  }

  _downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
