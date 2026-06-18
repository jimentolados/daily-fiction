/* ─── PERFIL DE USUARIO ──────────────────────────────────────────────────────── */

async function initProfile() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '../login/login.html';
    return;
  }

  await Promise.all([loadProfileData(), loadAchievements()]);
  initProfileForm();
}

/* ─── CARGA DE DATOS ────────────────────────────────────────────────────────── */
async function loadProfileData() {
  try {
    const data = await AuthAPI.me();
    renderProfileCard(data);
    renderProfileStats(data);
    fillProfileForm(data);
  } catch {
    showToast('No se pudo cargar el perfil.', 'error');
  }
}

async function loadAchievements() {
  const wrap = document.getElementById('achievements-wrap');
  if (!wrap) return;

  try {
    const data = await AuthAPI.myAchievements();
    renderAchievements(data, wrap);
  } catch {
    wrap.innerHTML = '<p class="text-muted text-center">No hay logros aún.</p>';
  }
}

/* ─── RENDER ────────────────────────────────────────────────────────────────── */
function renderProfileCard(data) {
  const wrap = document.getElementById('profile-card');
  if (!wrap) return;

  const { username, email, city, country, full_name } = data;
  const location = [city, country].filter(Boolean).join(', ');

  wrap.innerHTML = `
    <div class="profile-card">
      <div class="profile-card__avatar">${getInitial(username)}</div>
      <div class="profile-card__info">
        <div class="profile-card__name">${full_name || username}</div>
        ${full_name ? `<div class="profile-card__username">@${username}</div>` : ''}
        <div class="profile-card__email">${email}</div>
        ${location ? `<div class="profile-card__location">📍 ${location}</div>` : ''}
      </div>
    </div>
  `;
}

function renderProfileStats(data) {
  const wrap = document.getElementById('profile-stats');
  if (!wrap) return;

  const profile = data.profile || {};
  const stats = [
    { label: 'Películas acertadas', value: profile.movies_solved_count ?? 0, icon: '🎬' },
    { label: 'Racha actual',         value: profile.current_streak ?? 0,       icon: '🔥' },
    { label: 'Mejor racha',          value: profile.max_streak ?? 0,           icon: '🏆' },
    { label: 'Puntos totales',       value: (profile.total_points_all_time ?? 0).toLocaleString(), icon: '⭐' },
  ];

  wrap.innerHTML = `
    <div class="profile-stats">
      ${stats.map(s => `
        <div class="profile-stats__item">
          <div class="profile-stats__icon">${s.icon}</div>
          <div class="profile-stats__value">${s.value}</div>
          <div class="profile-stats__label">${s.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAchievements(data, wrap) {
  if (!data.length) {
    wrap.innerHTML = '<p class="text-muted text-center">Aún no has desbloqueado ningún logro. ¡Sigue jugando!</p>';
    return;
  }

  wrap.innerHTML = `
    <div class="achievement-grid">
      ${data.map(ua => `
        <div class="achievement-badge" title="${ua.achievement.description}">
          <div class="achievement-badge__icon">${ua.achievement.icon}</div>
          <div class="achievement-badge__name">${ua.display_name || ua.achievement.name}</div>
          <div class="achievement-badge__date">${formatDate(ua.earned_at)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ─── FORMULARIO DE EDICIÓN ─────────────────────────────────────────────────── */
function fillProfileForm(data) {
  const fields = ['username', 'full_name', 'city', 'country'];
  fields.forEach(f => {
    const el = document.getElementById(`profile-${f}`);
    if (el) el.value = data[f] || '';
  });
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const body = {
      username:  document.getElementById('profile-username')?.value.trim(),
      full_name: document.getElementById('profile-full_name')?.value.trim(),
      city:      document.getElementById('profile-city')?.value.trim(),
      country:   document.getElementById('profile-country')?.value.trim(),
    };

    try {
      const data = await AuthAPI.updateMe(body);
      // Update stored user
      const stored = Auth.getUser();
      Auth.saveSession({ ...stored, username: data.username }, localStorage.getItem(CONFIG.STORAGE_KEYS?.ACCESS_TOKEN || CONFIG.ACCESS_TOKEN_KEY));
      renderProfileCard(data);
      showToast('Perfil actualizado correctamente', 'success');
    } catch (err) {
      if (err instanceof APIError) showFieldErrors(form, err.data);
      else showToast('Error al guardar.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  });

  const changePassBtn = document.getElementById('change-password-btn');
  if (changePassBtn) changePassBtn.addEventListener('click', openChangePassword);
}

/* ─── COLAGE LATERAL ────────────────────────────────────────────────────────── */
function initProfileCollage() {
  const BASE     = '../../assets/images/profile/';
  const INTERVAL = 5000;

  const POOLS = [
    /* columna izquierda — celda 1 */
    ['antes del atardecer.webp', 'malditos bastardos.webp', 'el club de la lucha.webp', 'encuentros en la tercera fase.webp', '2001 odisea en el espacio.webp'],
    /* columna izquierda — celda 2 */
    ['el padrino.webp', 'la naranja mecanica.webp', 'el secreto de sus ojos.webp', 'todo sobre mi madre.webp', 'hijos de los hombres.webp'],
    /* columna izquierda — celda 3 */
    ['el silencio de los corderos.webp', 'interstellar.webp', 'el imperio contrataca.webp', 'american psycho.webp'],
    /* columna izquierda — celda 4 */
    ['el caballero oscuro.webp', 'paris, texas.webp', 'whiplash.webp', 'cisne negro.webp', 'en busca del arca perdida.webp'],
    /* columna derecha — celda 1 */
    ['parasitos.webp', 'pequeña miss sunshine.webp', 'call me by your name.webp', 'mad max.webp', 'perdida.webp'],
    /* columna derecha — celda 2 */
    ['birdman.webp', 'mullholland drive.webp', 'boyhood.webp', 'los que se quedan.webp', 'el lobo de wall street.webp'],
    /* columna derecha — celda 3 */
    ['terminator 2.webp', 'puñales por la espalda.webp', 'la muerte tenia un precio.webp', 'gremlins.webp', 'los intocables de elliot ness.webp'],
    /* columna derecha — celda 4 */
    ['el laberinto del fauno.webp', 'la matanza de texas.webp', 'rocky.webp', 'supersalidos.webp', 'aterriza como puedas.webp', 'gran lebowski.webp'],
  ];

  const KB = [
    'kb-zoom-in 6s ease forwards',
    'kb-zoom-out 6s ease forwards',
    'kb-pan-right 6s ease forwards',
    'kb-pan-left 6s ease forwards',
    'kb-pan-up 6s ease forwards',
  ];

  function randomKB() { return KB[Math.floor(Math.random() * KB.length)]; }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickNext(current, length) {
    if (length <= 1) return 0;
    let n;
    do { n = Math.floor(Math.random() * length); } while (n === current);
    return n;
  }

  document.querySelectorAll('.profile-collage__cell').forEach((cell, i) => {
    const pool = POOLS[i];
    if (!pool) return;

    const shuffled = shuffle(pool);
    cell.innerHTML = '';
    shuffled.forEach((src, j) => {
      const img = document.createElement('img');
      img.src = BASE + src;
      img.alt = '';
      img.className = 'collage-slide' + (j === 0 ? ' active' : '');
      if (j === 0) img.style.animation = randomKB();
      cell.appendChild(img);
    });

    let current = 0;
    const slides = Array.from(cell.querySelectorAll('.collage-slide'));

    const tick = () => {
      slides[current].classList.remove('active');
      current = pickNext(current, slides.length);
      const slide = slides[current];
      slide.style.animation = 'none';
      void slide.offsetWidth;
      slide.style.animation = randomKB();
      slide.classList.add('active');
    };

    setTimeout(() => { tick(); setInterval(tick, INTERVAL); }, Math.random() * 3000);
  });
}

/* ─── CAMBIO DE CONTRASEÑA ───────────────────────────────────────────────────── */
function openChangePassword() {
  const modal = document.getElementById('password-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('pw-current')?.focus();
  }
}

function closeChangePassword() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.classList.add('hidden');
  ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function submitChangePassword() {
  const current = document.getElementById('pw-current')?.value;
  const newPw   = document.getElementById('pw-new')?.value;
  const confirm = document.getElementById('pw-confirm')?.value;

  if (!current || !newPw || !confirm) {
    showToast('Rellena todos los campos.', 'error'); return;
  }
  if (newPw !== confirm) {
    showToast('Las contraseñas no coinciden.', 'error'); return;
  }
  if (newPw.length < 8) {
    showToast('La contraseña debe tener al menos 8 caracteres.', 'error'); return;
  }

  const btn = document.getElementById('pw-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    await AuthAPI.changePassword({ current_password: current, new_password: newPw });
    showToast('Contraseña cambiada correctamente', 'success');
    closeChangePassword();
  } catch (err) {
    const msg = err instanceof APIError ? err.firstMessage() : 'Error al cambiar la contraseña.';
    showToast(msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Cambiar'; }
  }
}
