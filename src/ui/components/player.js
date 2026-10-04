import { el } from '../render.js';
import { formatTime } from '../../utils/format.js';

export function createPlayer(room) {
  const video = el('video', {
    id: 'knot-video',
    style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
  });

  const timeDisplay = el('span', { className: 'video-time', id: 'video-time' }, '00:00 / 00:00');

  const seekBar = el('input', {
    type: 'range',
    className: 'video-seek',
    id: 'video-seek',
    min: '0',
    max: '100',
    value: '0',
    step: '0.1',
  });

  const playBtn = el('button', {
    className: 'btn btn-icon btn-ghost',
    id: 'video-play-btn',
    style: { color: 'white', fontSize: '20px' },
  }, el('i', { className: 'ph ph-play' }));

  const volumeBtn = el('button', {
    className: 'btn btn-icon btn-ghost',
    style: { color: 'white', fontSize: '18px' },
    id: 'video-volume-btn',
  }, el('i', { className: 'ph ph-speaker-high' }));

  const controls = el('div', { className: 'video-controls' },
    playBtn,
    seekBar,
    timeDisplay,
    volumeBtn
  );

  const placeholder = el('div', {
    id: 'video-placeholder',
    style: {
      position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 'var(--space-md)', color: 'var(--color-text-muted)',
    }
  },
    el('i', { className: 'ph ph-film-strip', style: { fontSize: '64px', opacity: '0.3' } }),
    el('div', { style: { fontSize: 'var(--text-sm)' } },
      room.isHost ? 'Select a video file to stream' : 'Waiting for host to start streaming...'
    ),
    room.isHost ? el('button', {
      className: 'btn btn-secondary',
      id: 'select-video-btn',
      style: { marginTop: 'var(--space-sm)' },
    },
      el('i', { className: 'ph ph-film-strip' }),
      'Choose Video'
    ) : null
  );

  const container = el('div', { className: 'video-container', id: 'video-container' },
    video,
    controls,
    placeholder
  );

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    seekBar.value = (video.currentTime / video.duration) * 100;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  });

  playBtn.addEventListener('click', () => {
    if (room.isHost) {
      if (video.paused) room.hostPlay();
      else room.hostPause();
    }
  });

  video.addEventListener('play', () => {
    playBtn.innerHTML = '<i class="ph ph-pause"></i>';
  });

  video.addEventListener('pause', () => {
    playBtn.innerHTML = '<i class="ph ph-play"></i>';
  });

  seekBar.addEventListener('input', () => {
    if (!room.isHost || !video.duration) return;
    const time = (seekBar.value / 100) * video.duration;
    room.hostSeek(time);
  });

  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    volumeBtn.innerHTML = video.muted
      ? '<i class="ph ph-speaker-slash"></i>'
      : '<i class="ph ph-speaker-high"></i>';
  });

  room.setVideoElement(video);

  return { container, video };
}
