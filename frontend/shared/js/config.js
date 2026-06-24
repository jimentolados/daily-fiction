const _isProd = location.hostname !== '127.0.0.1' && location.hostname !== 'localhost';

const CONFIG = {
  API_BASE:          _isProd
                       ? 'https://daily-fiction-api.onrender.com/api/v1'
                       : 'http://127.0.0.1:8000/api/v1',
  GOOGLE_CLIENT_ID:  '',   // Rellena con tu Google Client ID
  SESSION_KEY_NAME:  'cq_session_key',
  ACCESS_TOKEN_KEY:  'cq_access',
  REFRESH_TOKEN_KEY: 'cq_refresh',
  USER_KEY:          'cq_user',
  APP_URL:           _isProd
                       ? 'https://daily-fiction.vercel.app'
                       : 'http://127.0.0.1:8000',
};
