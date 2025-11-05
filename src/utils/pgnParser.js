// Simple PGN parser (mirrors web implementation)
export function parsePGN(pgn) {
  const cleanPGN = (pgn || '').replace(/\s+/g, ' ').trim();
  if (!cleanPGN) return { white: [], black: [] };
  const moves = cleanPGN
    .split(/\d+\.\s*/)
    .slice(1)
    .map((pair) => pair.trim().split(' '));
  const whiteMoves = moves.map((pair) => pair[0]);
  const blackMoves = moves.map((pair) => pair[1]).filter(Boolean);
  return { white: whiteMoves, black: blackMoves };
}

