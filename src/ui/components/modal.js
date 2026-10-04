import { el } from '../render.js';

export function showModal({ title, body, actions }) {
  const overlay = document.getElementById('modal-overlay');

  const content = el('div', { className: 'modal animate-scale-in' },
    el('div', { className: 'modal-title' }, title),
    typeof body === 'string'
      ? el('p', { style: { color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-sm)', lineHeight: '1.6' } }, body)
      : body,
    el('div', { style: { display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' } },
      ...actions.map(a => {
        const btn = el('button', { className: `btn ${a.className || 'btn-secondary'}` }, a.label);
        btn.addEventListener('click', () => {
          closeModal();
          if (a.onClick) a.onClick();
        });
        return btn;
      })
    )
  );

  const backdrop = el('div', { className: 'modal-backdrop' }, content);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  overlay.innerHTML = '';
  overlay.appendChild(backdrop);
  overlay.style.display = 'block';
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = '';
  overlay.style.display = 'none';
}
