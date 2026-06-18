/* ─── GESTIÓN DE AUTENTICACIÓN ─────────────────────────────────────────────── */

const Auth = {
  isLoggedIn() {
    return !!localStorage.getItem(CONFIG.ACCESS_TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(CONFIG.USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  saveSession(tokens, user) {
    localStorage.setItem(CONFIG.ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, tokens.refresh);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  logout() {
    const refresh = localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY);
    if (refresh) AuthAPI.logout(refresh).catch(() => {});
    localStorage.removeItem(CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = '../home/home.html';
  },
};

/* ─── FORMULARIO DE LOGIN ──────────────────────────────────────────────────── */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = form.identifier.value.trim();
    const password = form.password.value;
    const errEl = document.getElementById('login-error');
    const btn = form.querySelector('[type=submit]');

    errEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const data = await AuthAPI.login(identifier, password);
      Auth.saveSession(data.tokens, data.user);
      window.location.href = '../home/home.html';
    } catch (err) {
      errEl.textContent = err instanceof APIError ? err.firstMessage() : 'Error de conexión.';
      errEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    }
  });
}

/* ─── FORMULARIO DE REGISTRO ───────────────────────────────────────────────── */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const FIELD_LABELS = {
    username:  'Nombre de usuario',
    email:     'Correo electrónico',
    password:  'Contraseña',
    country:   'País',
    city:      'Provincia',
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const countryVal = (document.getElementById('reg-country')?.value ?? '').trim();
    const cityVal    = (document.getElementById('reg-city')?.value    ?? '').trim();

    const missing = [];
    if (!form.querySelector('[name=username]').value.trim())  missing.push('username');
    if (!form.querySelector('[name=email]').value.trim())     missing.push('email');
    if (!form.querySelector('[name=password]').value)         missing.push('password');
    if (!countryVal) { missing.push('country'); document.getElementById('reg-country-trigger')?.classList.add('error'); }
    if (!cityVal)    { missing.push('city');    document.getElementById('reg-city-trigger')?.classList.add('error'); }

    if (missing.length) {
      showValidationModal(missing.map(f => FIELD_LABELS[f] || f));
      return;
    }

    const passwordVal = form.querySelector('[name=password]').value;
    if (passwordVal.length < 8) {
      showPasswordModal(['La contraseña debe tener al menos 8 caracteres.']);
      return;
    }

    const data = {
      email:     form.querySelector('[name=email]').value.trim().toLowerCase(),
      username:  form.querySelector('[name=username]').value.trim(),
      full_name: form.querySelector('[name=full_name]').value.trim(),
      country:   countryVal,
      city:      cityVal,
      password:  form.querySelector('[name=password]').value,
    };

    const errEl = document.getElementById('register-error');
    const btn   = form.querySelector('[type=submit]');
    errEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    try {
      const res = await AuthAPI.register(data);
      Auth.saveSession(res.tokens, res.user);
      window.location.href = '../home/home.html';
    } catch (err) {
      if (err instanceof APIError && typeof err.data === 'object') {
        const passwordErrors = err.data['password']
          ? (Array.isArray(err.data['password']) ? err.data['password'] : [err.data['password']])
          : [];

        const CONFLICT_FIELDS = { email: 'Correo electrónico', username: 'Nombre de usuario' };
        const conflicts = Object.entries(CONFLICT_FIELDS)
          .filter(([f]) => err.data[f])
          .map(([, msgs]) => Array.isArray(msgs) ? msgs[0] : msgs);

        if (passwordErrors.length) {
          showPasswordModal(passwordErrors);
        } else if (conflicts.length) {
          showConflictModal(conflicts);
        } else {
          showFieldErrors(form, err.data);
        }
      } else {
        errEl.textContent = err instanceof APIError ? err.firstMessage() : 'Error de conexión.';
        errEl.classList.add('visible');
      }
      btn.disabled = false;
      btn.textContent = 'Crear cuenta';
    }
  });
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function showValidationModal(missingLabels) {
  const overlay = document.getElementById('validation-modal');
  const list    = document.getElementById('validation-modal-list');
  if (!overlay || !list) return;

  list.innerHTML = missingLabels.map(l => `<li>${l}</li>`).join('');
  overlay.classList.remove('hidden');

  function close() { overlay.classList.add('hidden'); }

  document.getElementById('validation-modal-close')?.addEventListener('click', close, { once: true });
  document.getElementById('validation-modal-ok')?.addEventListener('click', close, { once: true });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
}

function showPasswordModal(messages) {
  const overlay = document.getElementById('password-modal');
  const list    = document.getElementById('password-modal-list');
  if (!overlay || !list) return;

  list.innerHTML = messages.map(m => `<li>${m}</li>`).join('');
  overlay.classList.remove('hidden');

  function close() { overlay.classList.add('hidden'); }
  document.getElementById('password-modal-ok')?.addEventListener('click', close, { once: true });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
}

function showConflictModal(messages) {
  const overlay = document.getElementById('conflict-modal');
  const list    = document.getElementById('conflict-modal-list');
  if (!overlay || !list) return;

  list.innerHTML = messages.map(m => `<li>${m}</li>`).join('');
  overlay.classList.remove('hidden');

  function close() { overlay.classList.add('hidden'); }
  document.getElementById('conflict-modal-ok')?.addEventListener('click', close, { once: true });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
}

function showFieldErrors(form, errors) {
  for (const [field, messages] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${field}"]`);
    const errEl = form.querySelector(`#error-${field}`);
    const msg = Array.isArray(messages) ? messages[0] : messages;
    if (input) input.classList.add('error');
    if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
  }
}

/* ─── LOGIN CON GOOGLE ─────────────────────────────────────────────────────── */
function initGoogleLogin() {
  const btn = document.getElementById('btn-google');
  if (!btn || !CONFIG.GOOGLE_CLIENT_ID) return;

  // Carga el SDK de Google Identity
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  document.head.appendChild(script);

  btn.addEventListener('click', () => {
    if (!window.google) { showToast('SDK de Google no disponible.', 'error'); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: 'email profile',
      callback: async (response) => {
        if (response.error) { showToast('Error con Google.', 'error'); return; }
        try {
          const data = await AuthAPI.googleAuth(response.access_token);
          Auth.saveSession(data.tokens, data.user);
          window.location.href = '../home/home.html';
        } catch (err) {
          showToast(err instanceof APIError ? err.firstMessage() : 'Error al conectar con Google.', 'error');
        }
      },
    });
    client.requestAccessToken();
  });
}
