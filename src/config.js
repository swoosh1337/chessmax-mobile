// Prefer env at runtime; falls back to app.json extra
// NOTE: API runs on port 3000, but images are served from default HTTPS
const defaultApiUrl = 'https://chessmaxx.hopto.org:3000';
const defaultWebUrl = 'https://chessmaxx.hopto.org';

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || defaultApiUrl;

// Images/GIFs are served from the web server (not API server)
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || defaultWebUrl;

