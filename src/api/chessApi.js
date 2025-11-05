import apiClient from './apiClient';

export const chessApi = {
  getOpenings: () => apiClient.get('/Openings'),
  getWikiNotes: (pgn) => apiClient.get('/get-wiki-notes', { params: { pgn } }),
  submitAttempt: (userId, openingId, pgnId, result) =>
    apiClient.post('/pgn-attempt', { user_id: userId, opening_id: openingId, pgn_id: pgnId, result }),
  getStatistics: (userId, openingId) =>
    apiClient.get('/get-stats', { params: { user_id: userId, opening_id: openingId } }),
  getRecentAttempts: (userId, openingId, pgnId, limit = 5) =>
    apiClient.get('/recent-attempts', { params: { user_id: userId, opening_id: openingId, pgn_id: pgnId, limit } }),
  getRecentAttemptsForOpening: (userId, openingId, limit = 5) =>
    apiClient.get('/recent-attempts-for-opening', { params: { user_id: userId, opening_id: openingId, limit } }),
};

