import apiClient from './apiClient';

export const userApi = {
  getUserStats: (userId) => apiClient.get('/get-stats', { params: { user_id: userId, _t: Date.now() } }),
  getActivityCalendar: (userId) => apiClient.get('/activity-calendar', { params: { user_id: userId, _t: Date.now() } }),
  getChesscomRecentGames: (username, limit = 8, offset = 0) =>
    apiClient.get(`/chesscom-recent-games/${username}`, { params: { limit, offset, _t: Date.now() } }),
  getUserConnections: (userId) => apiClient.get('/user-connections', { params: { user_id: userId, _t: Date.now() } }),
  updateUserConnections: (userId, { chesscomUsername, lichessUsername }) =>
    apiClient.put('/user-connections', { user_id: userId, chesscomUsername, lichessUsername }),
  getLichessStats: (username) => {
    const trimmed = (username || '').trim();
    if (!trimmed) return Promise.resolve([]);
    return apiClient.get('/lichess/stats', { params: { username: trimmed, _t: Date.now() } });
  },
  authenticateWithGoogle: (token) => apiClient.post('/auth/google/callback', { token }),
  verifyAuthStatus: (token) => apiClient.post('/auth/verify', { token })
};
