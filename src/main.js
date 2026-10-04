import { Room } from './core/room.js';
import { renderLanding } from './ui/screens/landing.js';
import { renderRoom } from './ui/screens/room.js';
import { showToast } from './ui/components/toast.js';

let currentRoom = null;

function getApp() {
  return document.getElementById('app');
}

function navigateToLanding() {
  window.location.hash = '';
  renderLanding(getApp(), {
    onCreateRoom: () => {
      currentRoom = new Room();
      currentRoom.create();

      currentRoom.on('signaling:connected', () => {
        window.location.hash = `/room/${currentRoom.code}`;
        renderRoom(getApp(), currentRoom);
        showToast('Room created! Share the code with others.', 'success');
      });

      currentRoom.on('signaling:disconnected', () => {
        showToast('Lost connection to signaling server. Reconnecting...', 'warning');
      });

      currentRoom.on('room:left', () => {
        currentRoom = null;
        navigateToLanding();
      });
    },
    onJoinRoom: (code) => {
      currentRoom = new Room();
      currentRoom.join(code);

      currentRoom.on('signaling:connected', () => {
        window.location.hash = `/room/${code}`;
        renderRoom(getApp(), currentRoom);
        showToast(`Joined room ${code}`, 'success');
      });

      currentRoom.on('signaling:disconnected', () => {
        showToast('Lost connection to signaling server. Reconnecting...', 'warning');
      });

      currentRoom.on('room:left', () => {
        currentRoom = null;
        navigateToLanding();
      });
    },
  });
}

function handleRoute() {
  const hash = window.location.hash;
  const roomMatch = hash.match(/#\/room\/([A-Z0-9]+)/i);

  if (roomMatch && !currentRoom) {
    const code = roomMatch[1].toUpperCase();
    currentRoom = new Room();
    currentRoom.join(code);

    currentRoom.on('signaling:connected', () => {
      renderRoom(getApp(), currentRoom);
      showToast(`Joined room ${code}`, 'success');
    });

    currentRoom.on('room:left', () => {
      currentRoom = null;
      navigateToLanding();
    });
  } else if (!currentRoom) {
    navigateToLanding();
  }
}

window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', handleRoute);
