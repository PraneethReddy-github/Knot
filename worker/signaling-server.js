const rooms = new Map();

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function broadcast(room, message, excludeId) {
  const raw = JSON.stringify(message);
  for (const [id, peer] of room.entries()) {
    if (id !== excludeId && peer.ws.readyState === 1) {
      peer.ws.send(raw);
    }
  }
}

function handleConnection(ws, url) {
  const params = new URL(url, 'http://localhost').searchParams;
  const roomCode = params.get('room');
  const peerId = params.get('peerId') || generateId();
  const name = params.get('name') || 'Anonymous';
  const color = params.get('color') || '#7C3AED';

  if (!roomCode) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room code required' }));
    ws.close();
    return;
  }

  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Map());
  }

  const room = rooms.get(roomCode);
  room.set(peerId, { ws, name, color });

  const existingPeers = [];
  for (const [id, peer] of room.entries()) {
    if (id !== peerId) {
      existingPeers.push({ peerId: id, name: peer.name, color: peer.color });
    }
  }

  ws.send(JSON.stringify({
    type: 'room_info',
    room: roomCode,
    peers: existingPeers,
    yourId: peerId,
  }));

  broadcast(room, {
    type: 'peer_joined',
    peerId,
    name,
    color,
  }, peerId);

  ws.addEventListener('message', (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'signal' && msg.to) {
      const target = room.get(msg.to);
      if (target && target.ws.readyState === 1) {
        target.ws.send(JSON.stringify({
          type: 'signal',
          from: peerId,
          data: msg.data,
        }));
      }
    }
  });

  ws.addEventListener('close', () => {
    room.delete(peerId);
    broadcast(room, { type: 'peer_left', peerId }, null);

    if (room.size === 0) {
      rooms.delete(roomCode);
    }
  });
}

const server = Bun.serve({
  port: 8787,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req, { data: { url: req.url } });
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return undefined;
    }

    return new Response(JSON.stringify({
      service: 'knot-signaling',
      rooms: rooms.size,
      peers: Array.from(rooms.values()).reduce((sum, r) => sum + r.size, 0),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
  websocket: {
    open(ws) {
      handleConnection(ws, ws.data.url);
    },
    message(ws, message) {
      ws.dispatchEvent?.(new MessageEvent('message', { data: message }));
    },
    close(ws) {
      ws.dispatchEvent?.(new CloseEvent('close'));
    },
  },
});

console.log(`Knot signaling server running on ws://localhost:${server.port}/ws`);
