/* ─── UTILIDADES GENERALES ─────────────────────────────────────────────────── */

/** Genera un UUID v4 para la sesión anónima */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** Obtiene o crea la clave de sesión anónima */
function getSessionKey() {
  let key = localStorage.getItem(CONFIG.SESSION_KEY_NAME);
  if (!key) {
    key = generateUUID();
    localStorage.setItem(CONFIG.SESSION_KEY_NAME, key);
  }
  return key;
}

/** Formatea una fecha Date como "jueves, 20 de marzo de 2026" */
function formatDate(date = new Date()) {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/** Formatea hora en mm:ss */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Cuenta atrás hasta la medianoche */
function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight - now;
  return {
    hours:   Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/** Muestra un toast de notificación */
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: '🎬' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type]}</span>
    <span class="toast__message">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** Inicial del nombre para avatares */
function getInitial(username) {
  return (username || '?').charAt(0).toUpperCase();
}

/** Añade cero a la izquierda */
function pad(n) { return String(n).padStart(2, '0'); }

/** Capitaliza primera letra */
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/** Foco en el campo de input */
function focusInput(id) {
  const el = document.getElementById(id);
  if (el) el.focus();
}

/** Anima un elemento */
function animate(el, cls, duration = 500) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}

/** Nombres de los tipos de pista (mapeados del backend) */
const CLUE_TYPE_ICONS = {
  IMAGE:          '🖼️',
  DIRECTOR:       '🎬',
  ACTOR:          '🎭',
  YEAR:           '📅',
  ROTTEN_TOMATOES:'🍅',
  OSCARS:         '🏆',
  OSCAR_CATEGORIES:'🏅',
  ICONIC_QUOTE:   '💬',
  GENRE:          '🎞️',
  DURATION:       '⏱️',
  COUNTRY:        '🌍',
  SCREENWRITER:   '✍️',
};

function getClueIcon(type) {
  return CLUE_TYPE_ICONS[type] || '❓';
}
