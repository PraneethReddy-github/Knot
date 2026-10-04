import { el } from '../render.js';

export function createFileDrop(onFiles) {
  const zone = el('div', { className: 'file-drop-zone', id: 'file-drop-zone' },
    el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' } },
      el('i', { className: 'ph ph-cloud-arrow-up', style: { fontSize: '48px', color: 'var(--color-text-muted)' } }),
      el('div', {},
        el('span', { style: { color: 'var(--color-text-primary)', fontWeight: 'var(--weight-medium)' } }, 'Drop files here to share'),
      ),
      el('div', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } }, 'or click to browse'),
    )
  );

  const fileInput = el('input', {
    type: 'file',
    multiple: 'true',
    style: { display: 'none' },
    id: 'file-input',
  });

  zone.addEventListener('click', () => fileInput.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      onFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      onFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  const wrapper = el('div', {}, zone, fileInput);
  return wrapper;
}
