const container = document.getElementById('toast-container');
if (container) {
  container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:200;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
}

export function showToast(message, type = 'info', duration = 4000) {
  const target = container || document.body;
  const icons = {
    info: 'ph-info',
    success: 'ph-check-circle',
    error: 'ph-warning-circle',
    warning: 'ph-warning',
  };
  const colors = {
    info: 'var(--color-cyan)',
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',
  };

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.style.borderLeftColor = colors[type] || colors.info;
  toast.style.borderLeftWidth = '3px';
  toast.innerHTML = `
    <i class="ph ${icons[type] || icons.info}" style="color:${colors[type]};font-size:18px;flex-shrink:0"></i>
    <span>${message}</span>
  `;
  target.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, duration);

  return toast;
}
