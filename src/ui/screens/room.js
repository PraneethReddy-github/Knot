import { el, mount, qs } from '../render.js';
import { createPeerList } from '../components/peer-list.js';
import { createFileDrop } from '../components/file-drop.js';
import { createPlayer } from '../components/player.js';
import { createTransferList, updateTransferItem, completeTransferItem } from '../components/progress.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { formatBytes } from '../../utils/format.js';
import { getInitial } from '../../utils/identity.js';

export function renderRoom(app, room) {
  const { container: playerContainer, video } = createPlayer(room);

  const peerListContainer = el('div', { id: 'peer-list-container' });
  const transferListContainer = createTransferList();
  const activeTransfers = new Map();

  const refreshPeers = () => {
    const newList = createPeerList(room.peers, room.identity, room.isHost);
    peerListContainer.innerHTML = '';
    peerListContainer.appendChild(newList);
  };

  const onFiles = (files) => {
    if (room.connections.size === 0) {
      showToast('No peers connected to send files to', 'warning');
      return;
    }
    for (const file of files) {
      room.sendFileToAll(file);
      showToast(`Sending ${file.name} (${formatBytes(file.size)})`, 'info');
    }
  };

  const fileDrop = createFileDrop(onFiles);

  const videoInput = el('input', { type: 'file', accept: 'video/*', style: { display: 'none' }, id: 'video-file-input' });
  videoInput.addEventListener('change', () => {
    if (videoInput.files.length > 0) {
      const file = videoInput.files[0];
      room.streamVideo(file);
      const placeholder = qs('#video-placeholder');
      if (placeholder) placeholder.style.display = 'none';
      showToast(`Streaming: ${file.name}`, 'success');
    }
  });

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/room/${room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Room link copied to clipboard!', 'success');
    }).catch(() => {
      showToast(`Room code: ${room.code}`, 'info');
    });
  };

  const header = el('div', { className: 'header' },
    el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)' } },
      el('div', { className: 'header-brand' },
        el('div', { className: 'header-brand-icon' }, '🪢'),
        'Knot',
      ),
      el('div', { className: 'divider', style: { width: '1px', height: '24px', margin: '0 var(--space-sm)' } }),
      el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' } },
        el('span', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } }, 'Room:'),
        el('span', {
          style: {
            fontFamily: 'var(--font-mono)', fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-base)', letterSpacing: '0.1em',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          },
          id: 'room-code-display',
        }, room.code),
      ),
    ),
    el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' } },
      el('button', { className: 'btn btn-ghost', onClick: copyLink, id: 'copy-link-btn' },
        el('i', { className: 'ph ph-copy' }),
        'Copy Link',
      ),
      el('button', { className: 'btn btn-ghost btn-danger', onClick: () => room.leave(), id: 'leave-btn' },
        el('i', { className: 'ph ph-sign-out' }),
        'Leave',
      ),
    ),
  );

  const sidebar = el('div', {
    style: {
      width: '260px', flexShrink: '0', borderRight: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', background: 'var(--color-bg-glass)',
      overflow: 'hidden',
    },
  },
    el('div', { style: { padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' } },
      el('div', { style: { fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' } },
        `Peers (${room.peers.size + 1})`
      ),
    ),
    el('div', { style: { padding: 'var(--space-sm)', flex: '1', overflowY: 'auto' } },
      peerListContainer,
    ),
    el('div', { style: { padding: 'var(--space-sm) var(--space-lg)', borderTop: '1px solid var(--color-border)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' } },
      el('span', { className: 'status-dot status-dot-connected', style: { position: 'static', width: '6px', height: '6px', border: 'none' } }),
      el('span', { id: 'connection-status' }, 'Connected'),
    ),
  );

  const mainContent = el('div', {
    style: { flex: '1', display: 'flex', flexDirection: 'column', padding: 'var(--space-lg)', gap: 'var(--space-lg)', overflowY: 'auto', minWidth: '0' },
  },
    playerContainer,
    fileDrop,
    el('div', { id: 'transfers-section', style: { display: 'none' } },
      el('div', { style: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Active Transfers'),
      transferListContainer,
    ),
    videoInput,
  );

  const layout = el('div', { style: { display: 'flex', flex: '1', overflow: 'hidden' } },
    sidebar,
    mainContent,
  );

  const view = el('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh' } },
    header,
    layout,
  );

  mount(app, view);
  refreshPeers();

  setTimeout(() => {
    const selectBtn = qs('#select-video-btn');
    if (selectBtn) {
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        videoInput.click();
      });
    }
  }, 50);

  room.on('peer:joined', (peer) => {
    refreshPeers();
    showToast(`${peer.name} joined the room`, 'info');
    const countEl = sidebar.querySelector('div > div');
    if (countEl && countEl.textContent.startsWith('Peers')) {
      countEl.textContent = `Peers (${room.peers.size + 1})`;
    }
  });

  room.on('peer:connected', () => refreshPeers());
  room.on('peer:disconnected', () => refreshPeers());

  room.on('peer:left', (peer) => {
    refreshPeers();
    showToast('A peer left the room', 'warning');
    const countEl = sidebar.querySelector('div > div');
    if (countEl && countEl.textContent.startsWith('Peers')) {
      countEl.textContent = `Peers (${room.peers.size + 1})`;
    }
  });

  room.on('transfer:offer', (data) => {
    showModal({
      title: 'Incoming File',
      body: `${data.name} (${formatBytes(data.size)})`,
      actions: [
        { label: 'Decline', className: 'btn-secondary', onClick: () => room.rejectTransfer(data.id) },
        { label: 'Accept', className: 'btn-primary', onClick: () => room.acceptTransfer(data.id) },
      ],
    });
  });

  room.on('transfer:started', (data) => {
    const section = qs('#transfers-section');
    if (section) section.style.display = 'block';
    activeTransfers.set(data.id, data);
    updateTransferItem(transferListContainer, data);
  });

  room.on('transfer:progress', (data) => {
    activeTransfers.set(data.id, { ...activeTransfers.get(data.id), ...data });
    updateTransferItem(transferListContainer, activeTransfers.get(data.id));
  });

  room.on('transfer:complete', (data) => {
    completeTransferItem(transferListContainer, data.id);
    activeTransfers.delete(data.id);
    const label = data.direction === 'in' ? 'received' : 'sent';
    showToast(`${data.name} ${label} successfully!`, 'success');
  });

  room.on('track', ({ event }) => {
    if (!room.isHost && event.streams && event.streams[0]) {
      video.srcObject = event.streams[0];
      video.play().catch(() => {});
      const placeholder = qs('#video-placeholder');
      if (placeholder) placeholder.style.display = 'none';
    }
  });

  room.on('stream:offer', ({ name }) => {
    showToast(`Host is streaming: ${name}`, 'info');
  });

  room.on('error', (err) => {
    showToast(err.message || 'Connection error', 'error');
  });
}
