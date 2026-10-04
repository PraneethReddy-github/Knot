import { el, mount } from '../render.js';
import { getIdentity, updateIdentity, getInitial } from '../../utils/identity.js';

export function renderLanding(app, { onCreateRoom, onJoinRoom }) {
  const identity = getIdentity();

  const joinInput = el('input', {
    className: 'input-field input-field-code',
    placeholder: 'ABCDE',
    maxlength: '5',
    id: 'join-code-input',
  });

  const nameInput = el('input', {
    className: 'input-field',
    value: identity.name,
    id: 'name-input',
    style: { fontSize: 'var(--text-sm)' },
  });

  nameInput.addEventListener('change', () => {
    const newName = nameInput.value.trim();
    if (newName) updateIdentity({ name: newName });
  });

  joinInput.addEventListener('input', () => {
    joinInput.value = joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  const handleJoin = () => {
    const code = joinInput.value.trim();
    if (code.length >= 4) onJoinRoom(code);
  };

  joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleJoin();
  });

  const view = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-xl)' } },
    el('div', { style: { maxWidth: '460px', width: '100%' } },
      el('div', { className: 'animate-scale-in', style: { textAlign: 'center', marginBottom: 'var(--space-3xl)' } },
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' } },
          el('div', {
            style: {
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
              boxShadow: 'var(--shadow-glow-accent)',
            },
          }, '🪢'),
          el('h1', { style: { fontSize: 'var(--text-4xl)', background: 'linear-gradient(135deg, var(--color-text-primary), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }, 'Knot'),
        ),
        el('p', { style: { color: 'var(--color-text-secondary)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-light)' } },
          'Connect. Stream. Share.'
        ),
        el('p', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' } },
          'Peer-to-peer. No servers in the data path.'
        ),
      ),

      el('div', { className: 'card card-interactive animate-slide-up stagger-1', style: { marginBottom: 'var(--space-md)', cursor: 'pointer' }, onClick: onCreateRoom, id: 'create-room-card' },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)' } },
          el('div', {
            style: {
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-accent), #5b21b6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: '0',
            },
          }, el('i', { className: 'ph ph-plus', style: { color: 'white' } })),
          el('div', {},
            el('div', { style: { fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', marginBottom: '2px' } }, 'Create a Room'),
            el('div', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } }, 'Start hosting and invite others to join'),
          ),
          el('i', { className: 'ph ph-arrow-right', style: { color: 'var(--color-text-muted)', fontSize: '20px', marginLeft: 'auto' } }),
        ),
      ),

      el('div', { className: 'card animate-slide-up stagger-2' },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' } },
          el('div', {
            style: {
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: '0',
            },
          }, el('i', { className: 'ph ph-link', style: { color: 'var(--color-cyan)' } })),
          el('div', {},
            el('div', { style: { fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', marginBottom: '2px' } }, 'Join a Room'),
            el('div', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } }, 'Enter a room code to connect'),
          ),
        ),
        el('div', { style: { display: 'flex', gap: 'var(--space-sm)' } },
          joinInput,
          el('button', { className: 'btn btn-primary', onClick: handleJoin, id: 'join-btn', style: { flexShrink: '0' } },
            el('i', { className: 'ph ph-arrow-right' }),
            'Join'
          ),
        ),
      ),

      el('div', { className: 'card animate-slide-up stagger-3', style: { marginTop: 'var(--space-md)' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)' } },
          el('div', { className: 'avatar', style: { backgroundColor: identity.color } }, getInitial(identity.name)),
          el('div', { style: { flex: '1', minWidth: '0' } },
            el('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' } }, 'Your identity'),
            nameInput,
          ),
        ),
      ),

      el('div', { style: { textAlign: 'center', marginTop: 'var(--space-2xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' } },
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)' } },
          el('i', { className: 'ph ph-shield-check' }),
          'End-to-end encrypted via WebRTC DTLS-SRTP',
        ),
      ),
    )
  );

  mount(app, view);
}
