import { el } from '../render.js';
import { getInitial } from '../../utils/identity.js';

export function createPeerList(peers, selfIdentity, isHost) {
  const items = [];

  items.push(createPeerItem({
    id: selfIdentity.id,
    name: selfIdentity.name + ' (You)',
    color: selfIdentity.color,
    state: 'connected',
    isSelf: true,
    isHost,
  }));

  for (const [, peer] of peers) {
    items.push(createPeerItem({
      ...peer,
      isSelf: false,
      isHost: false,
    }));
  }

  return el('div', { className: 'peer-list', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
    ...items
  );
}

function createPeerItem({ name, color, state, isSelf, isHost }) {
  const stateClass = state === 'connected' ? 'status-dot-connected'
    : state === 'connecting' ? 'status-dot-connecting'
    : 'status-dot-disconnected';

  const stateLabel = state === 'connected' ? 'Connected'
    : state === 'connecting' ? 'Connecting...'
    : 'Disconnected';

  const badges = [];
  if (isHost) badges.push(el('span', { className: 'badge badge-accent', style: { marginLeft: '4px' } }, 'Host'));

  return el('div', { className: 'peer-item' },
    el('div', { className: 'avatar', style: { backgroundColor: color } },
      getInitial(name),
      el('span', { className: `status-dot ${stateClass}` })
    ),
    el('div', { className: 'peer-info' },
      el('div', { className: 'peer-name', style: { display: 'flex', alignItems: 'center', gap: '6px' } },
        name.replace(' (You)', ''),
        ...badges,
        isSelf ? el('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' } }, '(You)') : null,
      ),
      el('div', { className: 'peer-status' }, stateLabel)
    )
  );
}
