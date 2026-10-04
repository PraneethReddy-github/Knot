import { el } from '../render.js';
import { formatBytes, formatSpeed } from '../../utils/format.js';

export function createTransferList() {
  return el('div', { id: 'transfer-list', style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' } });
}

export function updateTransferItem(container, transfer) {
  let item = container.querySelector(`[data-transfer-id="${transfer.id}"]`);
  const pct = Math.round((transfer.progress || 0) * 100);

  if (!item) {
    const icon = transfer.direction === 'out' ? 'ph-arrow-up' : 'ph-arrow-down';
    const dirLabel = transfer.direction === 'out' ? 'Sending' : 'Receiving';

    item = el('div', {
      className: 'transfer-item animate-slide-in-right',
      dataset: { transferId: transfer.id },
    },
      el('i', { className: `ph ${icon}`, style: { fontSize: '20px', color: 'var(--color-accent)', flexShrink: '0' } }),
      el('div', { style: { flex: '1', minWidth: '0' } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } },
          el('span', {
            className: 'transfer-name',
            style: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
          }, transfer.name || 'File'),
          el('span', {
            className: 'transfer-pct',
            style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexShrink: '0', marginLeft: '8px' }
          }, `${pct}%`)
        ),
        el('div', { className: 'transfer-bar' },
          el('div', { className: 'transfer-bar-fill', style: { width: `${pct}%` } })
        ),
        el('div', {
          className: 'transfer-meta',
          style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }
        },
          el('span', {}, `${dirLabel} · ${formatBytes(transfer.size || 0)}`),
          el('span', { className: 'transfer-speed' }, transfer.speed ? formatSpeed(transfer.speed) : '')
        )
      )
    );
    container.appendChild(item);
  } else {
    const bar = item.querySelector('.transfer-bar-fill');
    if (bar) bar.style.width = `${pct}%`;

    const pctEl = item.querySelector('.transfer-pct');
    if (pctEl) pctEl.textContent = `${pct}%`;

    const speedEl = item.querySelector('.transfer-speed');
    if (speedEl && transfer.speed) speedEl.textContent = formatSpeed(transfer.speed);
  }
}

export function completeTransferItem(container, transferId) {
  const item = container.querySelector(`[data-transfer-id="${transferId}"]`);
  if (item) {
    const bar = item.querySelector('.transfer-bar-fill');
    if (bar) bar.style.width = '100%';
    const pctEl = item.querySelector('.transfer-pct');
    if (pctEl) {
      pctEl.textContent = '✓';
      pctEl.style.color = 'var(--color-success)';
    }
    const speedEl = item.querySelector('.transfer-speed');
    if (speedEl) speedEl.textContent = 'Complete';

    setTimeout(() => {
      item.classList.add('removing');
      setTimeout(() => item.remove(), 300);
    }, 5000);
  }
}
