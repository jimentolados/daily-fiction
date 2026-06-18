/* ─── INICIALIZACIÓN GLOBAL ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  injectBackgroundBlobs();
  renderNavbar();
  staggerFilmButtons();
  startCountdown();
  initLoginForm();
  initRegisterForm();
  initGoogleLogin();
  guardAuthPages();
});

/* ─── FONDO ANIMADO ─────────────────────────────────────────────────────────── */
function injectBackgroundBlobs() {
  const blob = document.createElement('div');
  blob.className = 'bg-blob bg-blob--garnet';
  document.body.prepend(blob);
}

/* ─── NAVBAR ────────────────────────────────────────────────────────────────── */
function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const user = Auth.getUser();
  const page = window.location.pathname.split('/').pop() || 'home.html';

  const links = [
    { href: '../home/home.html',       label: 'Inicio',    id: 'home.html' },
    { href: '../ranking/ranking.html', label: 'Ranking',   id: 'ranking.html' },
  ];
  if (user) {
    links.push({ href: '../profile/profile.html', label: 'Mi perfil', id: 'profile.html' });
  }

  const navLinks = links.map(l => `
    <a href="${l.href}" class="navbar__link ${page === l.id ? 'active' : ''}">${l.label}</a>
  `).join('');

  const userSection = user
    ? `<div class="navbar__user">
         <span class="navbar__username">${user.username}</span>
         <div class="navbar__avatar">${getInitial(user.username)}</div>
         <button class="btn btn-ghost btn-sm" onclick="Auth.logout()">Salir</button>
       </div>`
    : `<div class="navbar__user">
         <a href="../login/login.html"    class="btn btn-ghost btn-sm">Entrar</a>
         <a href="../register/register.html" class="btn btn-primary btn-sm">Registrarse</a>
       </div>`;

  navbar.innerHTML = `
    <div class="navbar__inner">
      <a href="../home/home.html" class="navbar__logo">
        <span class="navbar__logo-daily">DAILY</span>
        <span class="navbar__logo-fiction">FICTION</span>
      </a>
      <nav class="navbar__nav">${navLinks}</nav>
      ${userSection}
    </div>
  `;
}

/* ─── CUENTA ATRÁS ──────────────────────────────────────────────────────────── */
function startCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  function tick() {
    const { hours, minutes, seconds } = getTimeUntilMidnight();
    const hEl = el.querySelector('#cd-hours');
    const mEl = el.querySelector('#cd-minutes');
    const sEl = el.querySelector('#cd-seconds');
    if (hEl) hEl.textContent = pad(hours);
    if (mEl) mEl.textContent = pad(minutes);
    if (sEl) sEl.textContent = pad(seconds);
  }
  tick();
  setInterval(tick, 1000);
}

/* ─── PROTEGER PÁGINAS DE AUTH (no entrar si ya está logueado) ──────────────── */
function guardAuthPages() {
  const page = window.location.pathname.split('/').pop();
  const authPages = ['login.html', 'register.html'];
  if (authPages.includes(page) && Auth.isLoggedIn()) {
    window.location.href = '../home/home.html';
  }
}

/* ─── DESFASE DE ANIMACIONES DE PELÍCULA ────────────────────────────────────── */
function staggerFilmButtons() {
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
    const d1 = (Math.random() * 9).toFixed(2);
    const d2 = (Math.random() * 8).toFixed(2);
    const d3 = (Math.random() * 0.25).toFixed(3);
    const ds = (Math.random() * 14).toFixed(2);
    const burnAnim = btn.classList.contains('btn-ghost')
      ? 'film-burn-vignette-subtle'
      : 'film-burn-vignette';
    btn.style.setProperty('--btn-grain-delay', `-${d3}s`);
    btn.style.setProperty('--scratch-img', makeScratchUrl(ds));
    btn.style.animation = 'none';
    void btn.offsetHeight;
    btn.style.animation = `film-flicker 9s ease-in-out -${d1}s infinite, ${burnAnim} 8s ease-in-out -${d2}s infinite`;
  });
}

function makeScratchUrl(offset) {
  const o = parseFloat(offset).toFixed(2);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 50' preserveAspectRatio='none'><line y1='-5' y2='55' stroke='white' stroke-width='1.5' stroke-opacity='0'><animate attributeName='x1' values='-10;-10;10;210;210' keyTimes='0;0.06;0.08;0.22;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/><animate attributeName='x2' values='-8;-8;12;212;212' keyTimes='0;0.06;0.08;0.22;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/><animate attributeName='stroke-opacity' values='0;0;0.85;0;0' keyTimes='0;0.06;0.09;0.24;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/></line><line x1='70' y1='-5' x2='70' y2='55' stroke='white' stroke-width='1' stroke-opacity='0'><animate attributeName='stroke-opacity' values='0;0;0.75;0;0' keyTimes='0;0.30;0.315;0.34;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/></line><line y1='-5' y2='55' stroke='white' stroke-width='1.2' stroke-opacity='0'><animate attributeName='x1' values='210;210;190;-10;-10' keyTimes='0;0.45;0.47;0.62;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/><animate attributeName='x2' values='212;212;192;-8;-8' keyTimes='0;0.45;0.47;0.62;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/><animate attributeName='stroke-opacity' values='0;0;0.80;0;0' keyTimes='0;0.45;0.48;0.64;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/></line><line x1='110' y1='-5' x2='110' y2='55' stroke='white' stroke-width='0.9' stroke-opacity='0'><animate attributeName='stroke-opacity' values='0;0;0.70;0;0' keyTimes='0;0.80;0.815;0.84;1' dur='14s' begin='-${o}s' repeatCount='indefinite'/></line></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
