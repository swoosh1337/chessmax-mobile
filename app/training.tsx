import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import TrainingControls from '@/src/components/TrainingControls';
import CompletionModal from '@/src/components/CompletionModal';
import GraphicalBoard from '@/src/components/GraphicalBoard';
import VariationPickerModal from '@/src/components/VariationPickerModal';
import LearnCompleteModal from '@/src/components/LearnCompleteModal';
import ModePickerModal from '@/src/components/ModePickerModal';
import RatingModal from '@/src/components/RatingModal';
import { ChessEngine } from '@/src/logic/chessEngine';
import { parsePGN } from '@/src/utils/pgnParser';
import { playMoveSound, playIllegalMoveSound, playCompletionSound } from '@/src/utils/soundPlayer';
import * as H from '@/src/utils/haptics';
import { colors } from '@/src/theme/colors';
import { calculateXP } from '@/src/utils/xp';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { useAuth } from '@/src/context/AuthContext';
import { recordCompletion } from '@/src/services/supabase/trainingService';
import { ensureUserProfile, addXP } from '@/src/services/supabase/userService';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useTraining } from '@/src/context/TrainingContext';
import { ratingStorage } from '@/src/utils/storage';
import pieceMap from '@/src/assets/pieces/index';
import { TrainingMode, TrainingModeId } from '@/src/types/trainingModes';
import { createLogger } from '@/src/utils/logger';
import { useStreakData } from '@/src/hooks/useStreakData';
import { useTrainingPreferences } from '@/src/hooks/useTrainingPreferences';
import { useVariationManager } from '@/src/hooks/useVariationManager';

const log = createLogger('Training');

// Helper to clean opening name for display
function cleanOpeningName(name: string): string {
  if (!name) return 'Training';
  return name
    .replace(/^V\d+\s+/, '')
    .replace(/\s*for\s+(white|black)/gi, '')
    .replace(/\s*lvl?\s*\d+/gi, '')
    .replace(/\s*level\s*\d+/gi, '')
    .replace(/\s*-\s*$/, '')
    .trim();
}

export default function TrainingScreen() {
  // Context hooks
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { invalidateCache, updateUserProfile } = useLeaderboard();
  const { startSession, endSession } = useTraining();

  // Parse opening data from params
  const params = useLocalSearchParams();
  const initialOpening = params.openingData ? JSON.parse(params.openingData as string) : null;

  // Training preferences (persisted mode selection)
  const { trainingModeId, setTrainingModeId } = useTrainingPreferences();
  const trainingMode = useMemo(() => new TrainingMode(trainingModeId), [trainingModeId]);

  // Variation management
  const {
    currentOpening,
    currentVariationIndex,
    currentMode,
    variationStatuses,
    completedVariationIds,
    switchToVariation,
    handleNextVariation,
    setCurrentMode,
    markVariationComplete,
    getUniqueVariationId,
    addCompletedVariation,
  } = useVariationManager({
    initialOpening,
    userId: user?.id || null,
    trainingModeId,
  });

  // Streak data
  const {
    currentStreak,
    weeklyProgress,
    showStreakCelebration,
    setShowStreakCelebration,
    markStreakAsShown,
  } = useStreakData({ userId: user?.id || null });

  // UI state
  const [variationPickerOpen, setVariationPickerOpen] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [learnCompleteOpen, setLearnCompleteOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(true);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [piecesLoaded, setPiecesLoaded] = useState(false);
  const [trainingSessionId, setTrainingSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Chess engine state
  const [engine] = useState(() => new ChessEngine());
  const [tick, setTick] = useState(0);
  const [orientation] = useState(initialOpening?.color === 'b' ? 'black' : 'white');
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [captureSquare, setCaptureSquare] = useState<string | null>(null);
  const [hintSource, setHintSource] = useState<string | null>(null);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<string | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);

  // Refs
  const trainingCompleteRef = useRef(false);
  const completionProcessingRef = useRef(false);
  const captureTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratingModalTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (captureTimeout.current) clearTimeout(captureTimeout.current);
      if (hintTimeout.current) clearTimeout(hintTimeout.current);
      if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
      if (opponentMoveTimeout.current) clearTimeout(opponentMoveTimeout.current);
      if (ratingModalTimeout.current) clearTimeout(ratingModalTimeout.current);
      if (autoHintTimeout.current) clearTimeout(autoHintTimeout.current);
    };
  }, []);

  // Derived values
  const opening = currentOpening;
  const playerColor = orientation === 'white' ? 'w' : 'b';
  const board = useMemo(() => engine.board, [tick]);
  const sequence = useMemo(() => parsePGN(opening?.pgn || ''), [opening?.pgn]);
  const totalExpectedMoves = useMemo(() => (sequence.white?.length || 0) + (sequence.black?.length || 0), [sequence]);

  // Preload chess pieces
  useEffect(() => {
    const loadPieces = async () => {
      try {
        await Asset.loadAsync(Object.values(pieceMap));
        setPiecesLoaded(true);
      } catch (error) {
        log.error('Failed to load pieces', error);
        setPiecesLoaded(true);
      }
    };
    loadPieces();
  }, []);

  // Start training session
  useEffect(() => {
    if (!user || !opening) return;
    const initSession = async () => {
      try {
        const sessionId = await startSession(opening.name || 'Unknown', opening.variations?.[currentVariationIndex]?.name, opening.category);
        setTrainingSessionId(sessionId);
      } catch (error) {
        log.error('Error starting session', error);
      }
    };
    initSession();
  }, [user, opening?.name]);

  // Mark streak shown when completion modal opens
  useEffect(() => {
    if (completionOpen && showStreakCelebration) {
      markStreakAsShown();
    }
  }, [completionOpen, showStreakCelebration]);

  // Helper functions
  const getExpectedMove = useCallback(() => {
    const totalMoves = engine.history().length;
    const moveIndex = playerColor === 'w' ? Math.floor(totalMoves / 2) : Math.floor((totalMoves - 1) / 2);
    return playerColor === 'w' ? sequence.white[moveIndex] : sequence.black[moveIndex];
  }, [engine, playerColor, sequence]);

  const getOpponentResponse = useCallback(() => {
    const totalMoves = engine.history().length;
    const moveIndex = Math.floor((totalMoves - 1) / 2);
    return engine.turn === 'b' ? sequence.black[moveIndex] : sequence.white[moveIndex + 1];
  }, [engine, sequence]);

  const findKingSquare = useCallback((color: string) => {
    const brd = engine.board;
    const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = brd[r]?.[f];
        if (p?.type === 'k' && p.color === color) {
          return orientation === 'white' ? `${FILES[f]}${8 - r}` : `${FILES[7 - f]}${r + 1}`;
        }
      }
    }
    return null;
  }, [engine, orientation]);

  const refreshCheckHighlight = useCallback(() => {
    setCheckSquare(engine.inCheck() ? findKingSquare(engine.turn) : null);
  }, [engine, findKingSquare]);

  const clearHints = useCallback(() => {
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    setHintSource(null);
    setHintTarget(null);
  }, []);

  const showAutoHint = useCallback(() => {
    if (!trainingMode.shouldShowExplanations() || trainingCompleteRef.current) return;
    const san = getExpectedMove();
    if (!san) return;
    const prev = engine.previewSan(san);
    if (prev?.from && prev?.to) {
      setHintSource(prev.from);
      setHintTarget(prev.to);
    }
  }, [engine, getExpectedMove, trainingMode]);

  const initPositionForOrientation = useCallback(() => {
    engine.reset();
    if (playerColor === 'b' && sequence.white[0]) {
      try { engine.move(sequence.white[0]); } catch (err) { log.error('Failed first move', err); }
    }
  }, [engine, playerColor, sequence.white]);

  const applyMove = useCallback((move: any) => {
    if (!move?.from || !move?.to) return { ok: false };
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

  // Completion handler
  const finalizeCompletion = useCallback(async () => {
    if (trainingCompleteRef.current) return;
    trainingCompleteRef.current = true;
    completionProcessingRef.current = true;

    if (trainingMode.shouldShowExplanations()) {
      playCompletionSound(true);
      markVariationComplete(true);
      completionProcessingRef.current = false;
      setLearnCompleteOpen(true);
      return;
    }

    const success = errors === 0;
    playCompletionSound(success);
    setCompletionSuccess(success);
    setCompletionOpen(true);
    markVariationComplete(success);

    const completionTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const uniqueVariationId = getUniqueVariationId(currentVariationIndex);
    const isAlreadyCompleted = completedVariationIds.has(uniqueVariationId);

    const xpResult = calculateXP({ difficulty: opening?.difficulty || 1, errors, hintsUsed, completionTimeSeconds });
    const xpToAward = isAlreadyCompleted ? 0 : xpResult.totalXP;
    setEarnedXP(xpToAward);

    if (user) {
      try {
        await ensureUserProfile(user.id);
        if (xpToAward > 0 && trainingMode.shouldTrackXP()) {
          const { data: updatedProfile, error: xpError } = await addXP(user.id, xpToAward);
          if (!xpError && updatedProfile) {
            updateUserProfile({ total_xp: updatedProfile.total_xp, weekly_xp: updatedProfile.weekly_xp, level: updatedProfile.level });
            invalidateCache();
          }
        }
        const { error: completionError } = await recordCompletion(user.id, { variationId: uniqueVariationId, errors, hintsUsed, timeSeconds: completionTimeSeconds, xpEarned: xpToAward });
        if (!completionError && success) addCompletedVariation(uniqueVariationId);
      } catch (error) {
        log.error('Error saving XP', error);
      }
    }

    if (trainingSessionId && user) {
      try {
        await endSession(trainingSessionId, engine.history().length, errors, xpResult.totalXP);
      } catch (error) {
        log.error('Error ending session', error);
      }
    }

    try {
      const variationsCompleted = await ratingStorage.incrementVariationsCompleted();
      const shouldShowRating = await ratingStorage.shouldShowRatingPrompt();
      if (shouldShowRating) {
        if (ratingModalTimeout.current) clearTimeout(ratingModalTimeout.current);
        ratingModalTimeout.current = setTimeout(() => setRatingModalOpen(true), 500);
      }
    } catch (error) {
      log.error('Error handling rating prompt', error);
    }

    completionProcessingRef.current = false;
  }, [errors, hintsUsed, startTime, opening, user, trainingSessionId, trainingMode, currentVariationIndex, completedVariationIds, getUniqueVariationId, markVariationComplete, addCompletedVariation, updateUserProfile, invalidateCache, endSession, engine]);

  // Move validation
  const validateMove = useCallback((move: any) => {
    const totalMoves = engine.history().length;
    const moveIndex = Math.floor((totalMoves - 1) / 2);
    const expectedSan = move.color === 'w' ? sequence.white[moveIndex] : sequence.black[moveIndex];
    setMoveHistory(prev => [...prev, { move, fen: engine.fen }]);

    if (move.san !== expectedSan) {
      const result = trainingMode.onIncorrectMove();
      setErrors(e => e + 1);
      playIllegalMoveSound();
      H.error();
      setWrongMoveSquare(move.to);
      if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
      wrongMoveTimeout.current = setTimeout(() => setWrongMoveSquare(null), 800);

      if (result.action === 'ALLOW_UNDO') {
        setShowUndoButton(true);
      } else {
        engine.undo();
        setTick(t => t + 1);
      }
      return;
    }

    setSelected(null);
    setLegalTargets([]);
    setShowUndoButton(false);
    clearHints();
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
    setWrongMoveSquare(null);

    const oppSan = getOpponentResponse();
    if (oppSan) {
      if (opponentMoveTimeout.current) clearTimeout(opponentMoveTimeout.current);
      opponentMoveTimeout.current = setTimeout(() => {
        try {
          const oppMove = engine.move(oppSan);
          applyMove(oppMove);
          setTick(t => t + 1);
          refreshCheckHighlight();
          if (engine.history().length >= totalExpectedMoves) finalizeCompletion();
          else showAutoHint();
        } catch (err) {
          log.error('Error making opponent move', err);
        }
      }, 300);
    } else {
      if (engine.history().length >= totalExpectedMoves) finalizeCompletion();
      else showAutoHint();
    }
  }, [engine, sequence, trainingMode, totalExpectedMoves, clearHints, applyMove, refreshCheckHighlight, showAutoHint, getOpponentResponse, finalizeCompletion]);

  // Reset handler
  const reset = useCallback(() => {
    initPositionForOrientation();
    setSelected(null);
    setLegalTargets([]);
    setErrors(0);
    setHintsUsed(0);
    setStartTime(Date.now());
    trainingCompleteRef.current = false;
    setTick(t => t + 1);
    setLastMove({ from: null, to: null });
    clearHints();
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
    setWrongMoveSquare(null);
    setCheckSquare(null);
    setMoveHistory([]);
    setShowUndoButton(false);
    setEarnedXP(0);
    if (trainingMode.shouldShowExplanations()) {
      if (autoHintTimeout.current) clearTimeout(autoHintTimeout.current);
      autoHintTimeout.current = setTimeout(showAutoHint, 200);
    }
  }, [initPositionForOrientation, clearHints, trainingMode, showAutoHint]);

  // On variation/orientation change
  useEffect(() => { reset(); }, [orientation, opening?.pgn, reset]);

  // Auto-hint in Learn mode
  useEffect(() => {
    if (trainingModeId === 'learn' && !trainingCompleteRef.current) {
      const timer = setTimeout(showAutoHint, 300);
      return () => clearTimeout(timer);
    }
  }, [trainingModeId, tick, opening?.pgn, showAutoHint]);

  // Square press handler
  const onSquarePress = useCallback((sq: string) => {
    const piece = engine.getPiece(sq);
    if (selected) {
      if (selected === sq) { setSelected(null); setLegalTargets([]); return; }
      const selectedPiece = engine.getPiece(selected);
      if (!selectedPiece || selectedPiece.color !== playerColor) {
        setSelected(null); setLegalTargets([]);
        if (piece?.color === playerColor) {
          clearHints(); setSelected(sq); setLegalTargets(engine.getLegalMoves(sq).map((m: any) => m.to));
        }
        return;
      }
      const legalSquares = engine.getLegalMoves(selected).map((m: any) => m.to);
      if (legalSquares.includes(sq)) {
        try {
          const move = engine.move({ from: selected, to: sq });
          setTick(t => t + 1);
          if (applyMove(move).ok) validateMove(move);
          setSelected(null); setLegalTargets([]);
        } catch (err) { log.error('Move failed', err); }
      } else if (piece?.color === playerColor) {
        clearHints(); setSelected(sq); setLegalTargets(engine.getLegalMoves(sq).map((m: any) => m.to));
      } else { setSelected(null); setLegalTargets([]); }
    } else if (piece?.color === playerColor) {
      clearHints(); setSelected(sq); setLegalTargets(engine.getLegalMoves(sq).map((m: any) => m.to));
    }
  }, [engine, selected, playerColor, applyMove, validateMove, clearHints]);

  // Drop move handler
  const onDropMove = useCallback((from: string, to: string) => {
    if (!from || !to) return;
    const piece = engine.getPiece(from);
    if (!piece || piece.color !== playerColor) return;
    const legalSquares = engine.getLegalMoves(from).map((m: any) => m.to);
    if (!legalSquares.includes(to)) { playIllegalMoveSound(); H.error(); return; }
    try {
      const move = engine.move({ from, to });
      setTick(t => t + 1);
      if (applyMove(move).ok) validateMove(move);
      setSelected(null); setLegalTargets([]);
    } catch (err) { log.error('Drop failed', err); playIllegalMoveSound(); H.error(); }
  }, [engine, playerColor, applyMove, validateMove]);

  // Hint handler
  const handleHint = useCallback(() => {
    if (hintSource || hintTarget) { clearHints(); return; }
    const expectedSan = getExpectedMove();
    if (!expectedSan) return;
    try {
      const hintMove = engine.moves({ verbose: true }).find((m: any) => m.san === expectedSan);
      if (hintMove) {
        setHintsUsed(h => h + 1);
        setHintSource(hintMove.from); setHintTarget(hintMove.to);
        H.warning();
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(clearHints, 3000);
      }
    } catch (err) { log.error('Hint error', err); }
  }, [engine, hintSource, hintTarget, getExpectedMove, clearHints]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (!trainingMode.canUndo() || !moveHistory.length) return;
    engine.undo();
    setMoveHistory(prev => prev.slice(0, -1));
    setTick(t => t + 1);
    setShowUndoButton(false); setWrongMoveSquare(null); setSelected(null); setLegalTargets([]);
    H.ok();
  }, [engine, moveHistory.length, trainingMode]);

  // Mode change handler
  const handleModeChange = useCallback((newMode: TrainingModeId) => {
    setTrainingModeId(newMode);
    reset();
  }, [setTrainingModeId, reset]);

  // Next variation handler
  const onNextVariation = useCallback(() => {
    const proceedWithNext = () => {
      if (completionProcessingRef.current) { setTimeout(proceedWithNext, 100); return; }
      setCompletionOpen(false);
      setShowStreakCelebration(false);
      handleNextVariation();
      reset();
    };
    proceedWithNext();
  }, [handleNextVariation, reset, setShowStreakCelebration]);

  if (!opening) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No opening data</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentMovesPlayed = engine.history().length - (playerColor === 'b' ? 1 : 0);
  const progress = { filled: currentMovesPlayed, total: totalExpectedMoves };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{cleanOpeningName(opening?.name || 'Training')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      <TouchableOpacity style={styles.progressBarAboveBoard} onPress={() => setVariationPickerOpen(true)} activeOpacity={0.8}>
        <View style={styles.progressBarHeader}>
          <Text style={styles.progressBarTitle} numberOfLines={1}>Variation {currentVariationIndex + 1} of {opening?.variations?.length || 1}</Text>
          <View style={styles.progressBarStats}>
            <Text style={styles.progressBarMoves}>{progress.filled}/{progress.total} moves</Text>
            {trainingCompleteRef.current && errors === 0 && <Text style={styles.progressBadgeSuccess}>✓</Text>}
            {trainingCompleteRef.current && errors > 0 && <Text style={styles.progressBadgeError}>✗</Text>}
          </View>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress.total > 0 ? (progress.filled / progress.total) * 100 : 0}%`, backgroundColor: trainingCompleteRef.current ? (errors === 0 ? colors.success : colors.destructive) : colors.primary }]} />
        </View>
        <View style={styles.progressBarFooter}>
          <Text style={styles.progressBarSubtitle}>Level {opening?.level || 1} • {playerColor === 'w' ? '♔ White' : '♚ Black'}</Text>
          <Text style={styles.progressBarTap}>Tap to switch ▾</Text>
        </View>
      </TouchableOpacity>

      {/* Learn Mode Indicator */}
      {trainingMode.shouldShowExplanations() && (
        <View style={styles.learnModeIndicator}>
          <Text style={styles.learnModeText}>📖 Study Mode - Follow the highlighted moves</Text>
        </View>
      )}

      {/* Chess Board */}
      <View style={styles.boardContainer}>
        <GraphicalBoard board={board} orientation={orientation} selected={selected} legalTargets={legalTargets} lastMove={{ from: null, to: null }} captureSquare={captureSquare} hintSource={hintSource} hintTarget={hintTarget} wrongMoveSquare={wrongMoveSquare} checkSquare={checkSquare} onSquarePress={onSquarePress} onDropMove={onDropMove} showCoords={true} showCornerMarkers={true} playerColor={playerColor} />
        {!piecesLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading pieces...</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {!trainingMode.shouldShowExplanations() && (
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>↻ Reset</Text>
          </TouchableOpacity>
        )}
        <TrainingControls onHint={handleHint} onModePress={() => setModePickerOpen(true)} onSeriesMode={() => setCurrentMode('series')} onRandomMode={() => setCurrentMode('random')} onUndo={handleUndo} showUndo={trainingMode.canUndo() && showUndoButton} hideHint={trainingMode.shouldShowExplanations()} currentMode={currentMode} variationLabel={cleanOpeningName(opening?.name || 'Opening')} progress={progress} progressStatus={trainingCompleteRef.current ? (errors === 0 ? 'success' : 'error') : 'neutral'} variationStatuses={variationStatuses} onPickVariation={() => setVariationPickerOpen(true)} hasMoves={engine.history().length > (playerColor === 'b' ? 1 : 0)} hideVariationSelector={true} trainingModeId={trainingModeId} />
      </View>

      {/* Modals */}
      <CompletionModal visible={completionOpen} success={completionSuccess} title={completionSuccess ? 'Perfect!' : 'Completed with mistakes'} message={completionSuccess ? 'You mastered this variation!' : 'Try again for a perfect score'} variationName={opening?.variationName || opening?.name} onRetry={() => { setCompletionOpen(false); setShowStreakCelebration(false); reset(); }} onNext={onNextVariation} onClose={() => { setCompletionOpen(false); setShowStreakCelebration(false); }} nextEnabled={Array.isArray(opening?.variations) && opening.variations.length > 0} xpEarned={earnedXP} correctCount={playerColor === 'w' ? sequence.white?.length || 0 : sequence.black?.length || 0} incorrectCount={errors} currentStreak={currentStreak} weeklyProgress={weeklyProgress} showStreakCelebration={showStreakCelebration} />
      <LearnCompleteModal visible={learnCompleteOpen} onClose={() => setLearnCompleteOpen(false)} variationName={opening?.variations?.[currentVariationIndex]?.name || `Variation ${currentVariationIndex + 1}`} onContinueLearning={() => { setLearnCompleteOpen(false); trainingCompleteRef.current = false; onNextVariation(); }} onSwitchToDrill={() => { setLearnCompleteOpen(false); trainingCompleteRef.current = false; handleModeChange('drill'); }} />
      <VariationPickerModal visible={variationPickerOpen} onClose={() => setVariationPickerOpen(false)} variations={opening?.variations || []} currentVariationIndex={currentVariationIndex} variationStatuses={variationStatuses} onSelectVariation={(idx) => { switchToVariation(idx); reset(); }} />
      <ModePickerModal visible={modePickerOpen} onClose={() => setModePickerOpen(false)} currentModeId={trainingModeId} hasMovesWithExplanations={true} onSelectMode={handleModeChange} />
      <RatingModal visible={ratingModalOpen} onClose={() => setRatingModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerSpacer: { width: 40 },
  backButton: { padding: 8 },
  backIcon: { fontSize: 28, color: colors.foreground, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, flex: 1, textAlign: 'center' },
  boardContainer: { alignItems: 'center', marginVertical: 12, position: 'relative' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', alignItems: 'center', justifyContent: 'center', borderRadius: 16, zIndex: 1000 },
  loadingText: { color: colors.primary, fontSize: 16, fontWeight: '600', marginTop: 12 },
  controlsContainer: { paddingHorizontal: 16 },
  resetButton: { marginTop: 24, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resetButtonText: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  errorText: { color: colors.destructive, fontSize: 16, marginBottom: 16 },
  backButtonText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  learnModeIndicator: { backgroundColor: colors.primary + '20', paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '40' },
  learnModeText: { color: colors.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  progressBarAboveBoard: { marginHorizontal: 16, marginBottom: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  progressBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressBarTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', flex: 1 },
  progressBarStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBarMoves: { color: colors.textSubtle, fontSize: 14, fontWeight: '600' },
  progressBadgeSuccess: { color: colors.success, fontSize: 16, fontWeight: '700' },
  progressBadgeError: { color: colors.destructive, fontSize: 16, fontWeight: '700' },
  progressBarTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressBarFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressBarSubtitle: { color: colors.textSubtle, fontSize: 12 },
  progressBarTap: { color: colors.primary, fontSize: 12, fontWeight: '500' },
});
