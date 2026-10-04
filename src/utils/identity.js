const COLORS = [
  '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#6366F1',
  '#A855F7', '#0EA5E9', '#84CC16', '#E11D48', '#D946EF',
];

const STORAGE_KEY = 'knot_identity';

function detectDeviceName() {
  const ua = navigator.userAgent;
  let os = 'Device';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'Mac';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  let browser = '';
  if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  return browser ? `${browser} on ${os}` : os;
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'kn_';
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function getIdentity() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }
  const identity = {
    id: generateId(),
    name: detectDeviceName(),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function updateIdentity(updates) {
  const current = getIdentity();
  const updated = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}
