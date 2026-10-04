import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const DIST = path.join(__dirname, 'dist');
const rooms = new Map();

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function serveStatic(req, res) {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
}

const httpServer = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      service: 'knot',
      rooms: rooms.size,
      peers: Array.from(rooms.values()).reduce((sum, r) => sum + r.size, 0),
    }));
    return;
  }
  serveStatic(req, res);
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
  const roomCode = params.get('room');
  const peerId = params.get('peerId');
  const name = params.get('name') || 'Anonymous';
  const color = params.get('color') || '#7C3AED';

  if (!roomCode || !peerId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room code and peerId required' }));
    ws.close();
    return;
  }

  if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
  const room = rooms.get(roomCode);
  room.set(peerId, { ws, name, color });

  const existingPeers = [];
  for (const [id, peer] of room.entries()) {
    if (id !== peerId) existingPeers.push({ peerId: id, name: peer.name, color: peer.color });
  }

  ws.send(JSON.stringify({ type: 'room_info', room: roomCode, peers: existingPeers, yourId: peerId }));

  for (const [id, peer] of room.entries()) {
    if (id !== peerId && peer.ws.readyState === 1) {
      peer.ws.send(JSON.stringify({ type: 'peer_joined', peerId, name, color }));
    }
  }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'signal' && msg.to) {
      const target = room.get(msg.to);
      if (target && target.ws.readyState === 1) {
        target.ws.send(JSON.stringify({ type: 'signal', from: peerId, data: msg.data }));
      }
    }
  });

  ws.on('close', () => {
    room.delete(peerId);
    for (const [, peer] of room.entries()) {
      if (peer.ws.readyState === 1) {
        peer.ws.send(JSON.stringify({ type: 'peer_left', peerId }));
      }
    }
    if (room.size === 0) rooms.delete(roomCode);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Knot running on http://0.0.0.0:${PORT}`);
});
