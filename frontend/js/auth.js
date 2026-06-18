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
    window.location.href = 'index.html';
  },
};

/* ─── FORMULARIO DE LOGIN ──────────────────────────────────────────────────── */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    const errEl = document.getElementById('login-error');
    const btn = form.querySelector('[type=submit]');

    errEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const data = await AuthAPI.login(email, password);
      Auth.saveSession(data.tokens, data.user);
      window.location.href = 'index.html';
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const data = {
      email:     form.email.value.trim().toLowerCase(),
      username:  form.username.value.trim(),
      full_name: form.full_name.value.trim(),
      country:   form.country.value.trim(),
      city:      form.city.value.trim(),
      password:  form.password.value,
      password2: form.password2.value,
    };

    const errEl = document.getElementById('register-error');
    const btn = form.querySelector('[type=submit]');
    errEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    try {
      const res = await AuthAPI.register(data);
      Auth.saveSession(res.tokens, res.user);
      window.location.href = 'index.html';
    } catch (err) {
      if (err instanceof APIError && typeof err.data === 'object') {
        showFieldErrors(form, err.data);
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
  form.querySelectorAll('.input.error').forEach(el => el.classList.remove('error'));
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
          window.location.href = 'index.html';
        } catch (err) {
          showToast(err instanceof APIError ? err.firstMessage() : 'Error al conectar con Google.', 'error');
        }
      },
    });
    client.requestAccessToken();
  });
}
