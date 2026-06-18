/* ─── CLIENTE API ──────────────────────────────────────────────────────────── */

async function apiFetch(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE}${endpoint}`;
  const sessionKey = getSessionKey();
  const accessToken = localStorage.getItem(CONFIG.ACCESS_TOKEN_KEY);

  const headers = {
    'Content-Type': 'application/json',
    'X-Session-Key': sessionKey,
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    ...(options.headers || {}),
  };

  let response = await fetch(url, { ...options, headers });

  // Token expirado → intentar refresh automático
  if (response.status === 401 && accessToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem(CONFIG.ACCESS_TOKEN_KEY)}`;
      response = await fetch(url, { ...options, headers });
    } else {
      Auth.logout();
      return null;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new APIError(response.status, error);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function tryRefreshToken() {
  const refresh = localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY);
  if (!refresh) return false;
  try {
    const res = await fetch(`${CONFIG.API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(CONFIG.ACCESS_TOKEN_KEY, data.access);
    return true;
  } catch { return false; }
}

class APIError extends Error {
  constructor(status, data) {
    super(JSON.stringify(data));
    this.status = status;
    this.data = data;
  }
  /** Devuelve el primer mensaje de error legible */
  firstMessage() {
    const d = this.data;
    if (typeof d === 'string') return d;
    if (d.error) return d.error;
    if (d.detail) return d.detail;
    const firstKey = Object.keys(d)[0];
    if (firstKey) {
      const val = d[firstKey];
      return Array.isArray(val) ? val[0] : val;
    }
    return 'Ha ocurrido un error.';
  }
}

/* ─── AUTH ─────────────────────────────────────────────────────────────────── */
const AuthAPI = {
  register: (data)         => apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  login:    (email, pass)  => apiFetch('/auth/login/',    { method: 'POST', body: JSON.stringify({ email, password: pass }) }),
  logout:   (refresh)      => apiFetch('/auth/logout/',   { method: 'POST', body: JSON.stringify({ refresh }) }),
  me:       ()             => apiFetch('/auth/me/'),
  updateMe: (data)         => apiFetch('/auth/me/',       { method: 'PUT',  body: JSON.stringify(data) }),
  myAchievements:  ()      => apiFetch('/auth/me/achievements/'),
  changePassword:  (data)  => apiFetch('/auth/me/password/', { method: 'POST', body: JSON.stringify(data) }),
  googleAuth: (token)      => apiFetch('/auth/google/',   { method: 'POST', body: JSON.stringify({ access_token: token }) }),
};

/* ─── QUIZ ─────────────────────────────────────────────────────────────────── */
const QuizAPI = {
  today:  ()        => apiFetch('/quiz/today/'),
  guess:  (attempt) => apiFetch('/quiz/today/guess/', { method: 'POST', body: JSON.stringify({ attempt }) }),
  result: ()        => apiFetch('/quiz/today/result/'),
};

/* ─── MOVIES ────────────────────────────────────────────────────────────────── */
const MoviesAPI = {
  search: (q) => apiFetch(`/movies/search/?q=${encodeURIComponent(q)}`),
};

/* ─── RANKING ───────────────────────────────────────────────────────────────── */
const RankingAPI = {
  summary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/ranking/monthly/summary/${qs ? '?' + qs : ''}`);
  },
  full: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/ranking/monthly/${qs ? '?' + qs : ''}`);
  },
};
