import { Chess } from 'chess.js';

export class ChessEngine {
  constructor(fen) {
    this.chess = new Chess(fen);
  }

  reset(fen) {
    this.chess = new Chess(fen);
  }

  get turn() {
    return this.chess.turn(); // 'w' | 'b'
  }

  get board() {
    return this.chess.board(); // 8x8 matrix
  }

  get fen() {
    return this.chess.fen();
  }

  legalMoves(fromSquare) {
    return this.chess.moves({ square: fromSquare, verbose: true });
  }

  getLegalMoves(fromSquare) {
    return this.chess.moves({ square: fromSquare, verbose: true });
  }

  moves(options) {
    return this.chess.moves(options);
  }

  move(move) {
    // move can be in SAN or { from, to, promotion }
    return this.chess.move(move);
  }

  undo() {
    return this.chess.undo();
  }

  isGameOver() {
    return this.chess.isGameOver();
  }

  inCheck() {
    return this.chess.inCheck();
  }

  getPiece(square) {
    return this.chess.get(square);
  }

  history() {
    return this.chess.history({ verbose: true });
  }

  previewSan(san) {
    try {
      // Find the legal move that matches the SAN notation
      // This is more robust than trying to execute it
      const legalMoves = this.chess.moves({ verbose: true });
      const matchingMove = legalMoves.find(m => m.san === san);
      return matchingMove || null;
    } catch (e) {
      console.warn('Error previewing SAN:', san, e);
      return null;
    }
  }
}
