import { useState, useRef, useMemo, useCallback } from 'react';
import { ChessEngine } from '@/src/logic/chessEngine';
import { parsePGN } from '@/src/utils/pgnParser';
import { playMoveSound, playIllegalMoveSound, playCompletionSound } from '@/src/utils/soundPlayer';
import * as H from '@/src/utils/haptics';
import { TrainingMode, TrainingModeId, MoveExplanation } from '@/src/types/trainingModes';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('useChessTraining');

export interface ChessMove {
  from: string;
  to: string;
  san?: string;
  color?: string;
  captured?: boolean;
}

export interface ChessTrainingState {
  selected: string | null;
  legalTargets: string[];
  errors: number;
  hintsUsed: number;
  lastMove: { from: string | null; to: string | null };
  captureSquare: string | null;
  hintSource: string | null;
  hintTarget: string | null;
  wrongMoveSquare: string | null;
  checkSquare: string | null;
  showUndoButton: boolean;
  moveHistory: any[];
  tick: number;
  board: any;
}

export interface UseChessTrainingOptions {
  pgn: string;
  playerColor: 'w' | 'b';
  orientation: 'white' | 'black';
  trainingModeId: TrainingModeId;
  onCorrectMove?: () => void;
  onIncorrectMove?: () => void;
  onComplete?: (errors: number, hintsUsed: number) => void;
}

export interface UseChessTrainingResult {
  // State
  state: ChessTrainingState;
  engine: ChessEngine;
  sequence: { white: string[]; black: string[] };
  totalExpectedMoves: number;
  trainingCompleteRef: React.MutableRefObject<boolean>;

  // Actions
  reset: () => void;
  onSquarePress: (sq: string) => void;
  onDropMove: (from: string, to: string) => void;
  handleHint: () => void;
  handleUndo: () => void;
  clearHints: () => void;
  showAutoHint: () => void;
  getExpectedMove: () => string | undefined;
  refreshBoard: () => void;
}

export function useChessTraining({
  pgn,
  playerColor,
  orientation,
  trainingModeId,
  onCorrectMove,
  onIncorrectMove,
  onComplete,
}: UseChessTrainingOptions): UseChessTrainingResult {
  // Engine state
  const [engine] = useState(() => new ChessEngine());
  const [tick, setTick] = useState(0);
  const trainingCompleteRef = useRef(false);

  // Selection state
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);

  // Move tracking
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [captureSquare, setCaptureSquare] = useState<string | null>(null);
  const captureTimeout = useRef<any>(null);

  // Hint state
  const [hintSource, setHintSource] = useState<string | null>(null);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const hintTimeout = useRef<any>(null);

  // Error highlighting
  const [wrongMoveSquare, setWrongMoveSquare] = useState<string | null>(null);
  const wrongMoveTimeout = useRef<any>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);

  // Undo support
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);

  // Training mode
  const trainingMode = useMemo(() => new TrainingMode(trainingModeId), [trainingModeId]);

  // Parse PGN
  const sequence = useMemo(() => parsePGN(pgn || ''), [pgn]);

  // Calculate total expected moves
  const totalExpectedMoves = useMemo(() => {
    return (sequence.white?.length || 0) + (sequence.black?.length || 0);
  }, [sequence]);

  // Board state
  const board = useMemo(() => engine.board, [tick]);

  // Initialize position for player color
  const initPositionForOrientation = useCallback(() => {
    engine.reset();
    if (playerColor === 'b' && sequence.white[0]) {
      try {
        engine.move(sequence.white[0]);
      } catch (err) {
        log.error('Failed to apply first white move', err);
      }
    }
  }, [engine, playerColor, sequence.white]);

  // Get expected move for current position
  const getExpectedMove = useCallback(() => {
    const totalMoves = engine.history().length;
    const moveIndex = playerColor === 'w'
      ? Math.floor(totalMoves / 2)
      : Math.floor((totalMoves - 1) / 2);
    return playerColor === 'w' ? sequence.white[moveIndex] : sequence.black[moveIndex];
  }, [engine, playerColor, sequence]);

  // Get opponent response
  const getOpponentResponse = useCallback(() => {
    const currentTurn = engine.turn;
    const totalMoves = engine.history().length;
    const moveIndex = Math.floor((totalMoves - 1) / 2);

    if (currentTurn === 'b') {
      return sequence.black[moveIndex];
    } else if (currentTurn === 'w') {
      return sequence.white[moveIndex + 1];
    }
    return null;
  }, [engine, sequence]);

  // Find king square for check highlighting
  const findKingSquare = useCallback((color: string) => {
    const brd = engine.board;
    const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = brd[r]?.[f];
        if (p && p.type === 'k' && p.color === color) {
          return orientation === 'white' ? `${FILES[f]}${8 - r}` : `${FILES[7 - f]}${r + 1}`;
        }
      }
    }
    return null;
  }, [engine, orientation]);

  // Refresh check highlight
  const refreshCheckHighlight = useCallback(() => {
    if (engine.inCheck()) {
      const turnColor = engine.turn;
      const kingSq = findKingSquare(turnColor);
      setCheckSquare(kingSq);
    } else {
      setCheckSquare(null);
    }
  }, [engine, findKingSquare]);

  // Apply a move with sound/haptics
  const applyMove = useCallback((move: any) => {
    if (!move || !move.from || !move.to) return { ok: false };
    setLastMove({ from: move.from, to: move.to });
    if (move.captured) {
      setCaptureSquare(move.to);
      if (captureTimeout.current) clearTimeout(captureTimeout.current);
      captureTimeout.current = setTimeout(() => setCaptureSquare(null), 400);
      H.capture();
    } else {
      setCaptureSquare(null);
      H.ok();
    }
    playMoveSound(move);
    refreshCheckHighlight();
    return { ok: true, move };
  }, [refreshCheckHighlight]);

  // Clear hints
  const clearHints = useCallback(() => {
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    setHintSource(null);
    setHintTarget(null);
  }, []);

  // Show auto-hint in Learn mode
  const showAutoHint = useCallback(() => {
    if (!trainingMode.shouldShowExplanations()) return;
    if (trainingCompleteRef.current) return;

    const san = getExpectedMove();
    if (!san) return;

    const prev = engine.previewSan(san);
    if (!prev?.from || !prev?.to) return;

    setHintSource(prev.from);
    setHintTarget(prev.to);
  }, [engine, getExpectedMove, trainingMode]);

  // Validate move against expected
  const validateMove = useCallback((move: any) => {
    const totalMoves = engine.history().length;
    const moveIndex = Math.floor((totalMoves - 1) / 2);
    const expectedSan = move.color === 'w' ? sequence.white[moveIndex] : sequence.black[moveIndex];

    // Add move to history for undo
    setMoveHistory(prev => [...prev, { move, fen: engine.fen }]);

    const finalizeCompletion = () => {
      if (trainingCompleteRef.current) return;
      trainingCompleteRef.current = true;

      if (trainingMode.shouldShowExplanations()) {
        playCompletionSound(true);
        onComplete?.(0, hintsUsed); // Learn mode = always success
        return;
      }

      const success = errors === 0;
      playCompletionSound(success);
      onComplete?.(errors, hintsUsed);
    };

    if (move.san !== expectedSan) {
      // Wrong move
      const result = trainingMode.onIncorrectMove();

      setErrors(e => e + 1);
      playIllegalMoveSound();
      H.error();
      setWrongMoveSquare(move.to);
      if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
      wrongMoveTimeout.current = setTimeout(() => setWrongMoveSquare(null), 800);

      if (result.action === 'ALLOW_UNDO') {
        setShowUndoButton(true);
      } else if (result.action === 'RESTART_VARIATION') {
        engine.undo();
        setTick(t => t + 1);
      } else {
        engine.undo();
        setTick(t => t + 1);
      }

      onIncorrectMove?.();
      return;
    }

    // Correct move
    setSelected(null);
    setLegalTargets([]);
    setShowUndoButton(false);
    clearHints();
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
    setWrongMoveSquare(null);

    onCorrectMove?.();

    // Auto-play opponent response
    const oppSan = getOpponentResponse();

    if (oppSan) {
      setTimeout(() => {
        try {
          const oppMove = engine.move(oppSan);
          applyMove(oppMove);
          setTick(t => t + 1);
          refreshCheckHighlight();

          if (engine.history().length >= totalExpectedMoves) {
            finalizeCompletion();
          } else {
            showAutoHint();
          }
        } catch (err) {
          log.error('Error making opponent move', err);
        }
      }, 300);
    } else {
      if (engine.history().length >= totalExpectedMoves) {
        finalizeCompletion();
      } else {
        showAutoHint();
      }
    }
  }, [engine, sequence, errors, hintsUsed, trainingMode, totalExpectedMoves, clearHints, applyMove, refreshCheckHighlight, showAutoHint, getOpponentResponse, onCorrectMove, onIncorrectMove, onComplete]);

  // Reset game state
  const reset = useCallback(() => {
    initPositionForOrientation();
    setSelected(null);
    setLegalTargets([]);
    setErrors(0);
    setHintsUsed(0);
    trainingCompleteRef.current = false;
    setTick(t => t + 1);
    setLastMove({ from: null, to: null });
    clearHints();
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
    setWrongMoveSquare(null);
    setCheckSquare(null);
    setMoveHistory([]);
    setShowUndoButton(false);

    // In Learn mode, show first hint after delay
    if (trainingMode.shouldShowExplanations()) {
      setTimeout(showAutoHint, 200);
    }
  }, [initPositionForOrientation, clearHints, trainingMode, showAutoHint]);

  // Handle square press
  const onSquarePress = useCallback((sq: string) => {
    const piece = engine.getPiece(sq);

    if (selected) {
      if (selected === sq) {
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      // Validate selected piece
      const selectedPiece = engine.getPiece(selected);
      if (!selectedPiece || selectedPiece.color !== playerColor) {
        setSelected(null);
        setLegalTargets([]);
        if (piece && piece.color === playerColor) {
          clearHints();
          setSelected(sq);
          const moves = engine.getLegalMoves(sq);
          setLegalTargets(moves.map((m: any) => m.to));
        }
        return;
      }

      // Try to move
      const legal = engine.getLegalMoves(selected);
      const legalSquares = legal.map((m: any) => m.to);

      if (legalSquares.includes(sq)) {
        try {
          const move = engine.move({ from: selected, to: sq });
          setTick(t => t + 1);
          const result = applyMove(move);
          if (result.ok) {
            validateMove(move);
          }
          setSelected(null);
          setLegalTargets([]);
        } catch (err) {
          log.error('Move failed', err);
        }
      } else {
        if (piece && piece.color === playerColor) {
          clearHints();
          setSelected(sq);
          const moves = engine.getLegalMoves(sq);
          setLegalTargets(moves.map((m: any) => m.to));
        } else {
          setSelected(null);
          setLegalTargets([]);
        }
      }
    } else {
      if (piece && piece.color === playerColor) {
        clearHints();
        setSelected(sq);
        const moves = engine.getLegalMoves(sq);
        setLegalTargets(moves.map((m: any) => m.to));
      }
    }
  }, [engine, selected, playerColor, applyMove, validateMove, clearHints]);

  // Handle drag-and-drop move
  const onDropMove = useCallback((from: string, to: string) => {
    if (!from || !to) return;

    const piece = engine.getPiece(from);
    if (!piece || piece.color !== playerColor) {
      log.warn('Attempted to drag opponent piece or empty square');
      return;
    }

    const legal = engine.getLegalMoves(from);
    const legalSquares = legal.map((m: any) => m.to);

    if (!legalSquares.includes(to)) {
      playIllegalMoveSound();
      H.error();
      return;
    }

    try {
      const move = engine.move({ from, to });
      setTick(t => t + 1);
      const result = applyMove(move);
      if (result.ok) {
        validateMove(move);
      }
      setSelected(null);
      setLegalTargets([]);
    } catch (err) {
      log.error('Drop move failed', err);
      playIllegalMoveSound();
      H.error();
    }
  }, [engine, playerColor, applyMove, validateMove]);

  // Handle hint request
  const handleHint = useCallback(() => {
    // Toggle hint off if showing
    if (hintSource || hintTarget) {
      clearHints();
      return;
    }

    const expectedSan = getExpectedMove();
    if (!expectedSan) return;

    try {
      const allMoves = engine.moves({ verbose: true });
      const hintMove = allMoves.find((m: any) => m.san === expectedSan);

      if (hintMove) {
        setHintsUsed(h => h + 1);
        setHintSource(hintMove.from);
        setHintTarget(hintMove.to);
        H.warning();

        // Auto-clear after 3 seconds
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(() => {
          setHintSource(null);
          setHintTarget(null);
        }, 3000);
      }
    } catch (err) {
      log.error('Hint error', err);
    }
  }, [engine, hintSource, hintTarget, getExpectedMove, clearHints]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (!trainingMode.canUndo() || moveHistory.length === 0) return;

    engine.undo();
    setMoveHistory(prev => prev.slice(0, -1));
    setTick(t => t + 1);
    setShowUndoButton(false);
    setWrongMoveSquare(null);
    setSelected(null);
    setLegalTargets([]);
    H.ok();
  }, [engine, moveHistory.length, trainingMode]);

  // Refresh board (force re-render)
  const refreshBoard = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  return {
    state: {
      selected,
      legalTargets,
      errors,
      hintsUsed,
      lastMove,
      captureSquare,
      hintSource,
      hintTarget,
      wrongMoveSquare,
      checkSquare,
      showUndoButton,
      moveHistory,
      tick,
      board,
    },
    engine,
    sequence,
    totalExpectedMoves,
    trainingCompleteRef,
    reset,
    onSquarePress,
    onDropMove,
    handleHint,
    handleUndo,
    clearHints,
    showAutoHint,
    getExpectedMove,
    refreshBoard,
  };
}
