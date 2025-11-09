import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrainingControls from '@/src/components/TrainingControls';
import CompletionModal from '@/src/components/CompletionModal';
import GraphicalBoard from '@/src/components/GraphicalBoard';
import { ChessEngine } from '@/src/logic/chessEngine';
import { parsePGN } from '@/src/utils/pgnParser';
import { playMoveSound, playIllegalMoveSound, playCompletionSound } from '@/src/utils/soundPlayer';
import * as H from '@/src/utils/haptics';
import { colors } from '@/src/theme/colors';
import { calculateXP, calculateLevel } from '@/src/utils/xp';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { ratingStorage } from '@/src/utils/storage';
import RatingModal from '@/src/components/RatingModal';

export default function TrainingScreen() {
  // Hooks
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { invalidateCache, updateUserProfile } = useLeaderboard();

  // Get opening data from Expo Router params
  const params = useLocalSearchParams();
  const initialOpening = params.openingData ? JSON.parse(params.openingData as string) : null;

  // Variation management state
  const [currentOpening, setCurrentOpening] = useState(initialOpening);
  const [currentMode, setCurrentMode] = useState<'series' | 'random'>('series');
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [variationStatuses, setVariationStatuses] = useState<Array<'pending' | 'success' | 'error'>>([]);
  const [variationPickerOpen, setVariationPickerOpen] = useState(false);

  // Use currentOpening instead of params
  const opening = currentOpening;

  // Variation statuses are initialized in a guarded effect later to avoid unnecessary resets

  // Debug: Log opening data on mount
  useEffect(() => {
    // console.log('=== TRAINING SCREEN RECEIVED ===');
    // console.log('Opening name:', opening?.name);
    // console.log('Opening color:', opening?.color, '→', opening?.color === 'b' ? 'BLACK' : 'WHITE');
    // console.log('Variations:', opening?.variations?.length);
    // console.log('Initial orientation set to:', opening?.color === 'b' ? 'black' : 'white');
    if (!opening?.pgn) {
      console.error('❌ CRITICAL: No PGN received in TrainingScreen!');
    }
    // console.log('=== END TRAINING SCREEN DEBUG ===');
  }, [opening]);

  const [engine] = useState(() => new ChessEngine());
  const [orientation, setOrientation] = useState(opening?.color === 'b' ? 'black' : 'white');
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const trainingCompleteRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [captureSquare, setCaptureSquare] = useState<string | null>(null);
  const captureTimeout = useRef<any>(null);
  const [hintSource, setHintSource] = useState<string | null>(null);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const hintTimeout = useRef<any>(null);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<string | null>(null);
  const wrongMoveTimeout = useRef<any>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(true);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const completionProcessingRef = useRef(false);

  const sequence = useMemo(() => {
    const parsed = parsePGN(opening?.pgn || '');
    return parsed;
  }, [opening]);

  // Board must be recalculated on every tick change to show updates
  const board = useMemo(() => engine.board, [tick]);
  const playerColor = orientation === 'white' ? 'w' : 'b';

  const totalExpectedMoves = useMemo(() => {
    return (sequence.white?.length || 0) + (sequence.black?.length || 0);
  }, [sequence]);

  const getExpectedMove = () => {
    // IMPORTANT: This is called AFTER the move is applied, so we need to check
    // against the PLAYER's color, not the current turn (which has flipped)
    const totalMoves = engine.history().length;

    // Calculate the move index for the player's color
    const moveIndex = playerColor === 'w'
      ? Math.floor(totalMoves / 2)          // White: moves at history index 0, 2, 4...
      : Math.floor((totalMoves - 1) / 2);   // Black: moves at history index 1, 3, 5...

    const expectedSan = playerColor === 'w' ? sequence.white[moveIndex] : sequence.black[moveIndex];

    // console.log('🎯 getExpectedMove DEBUG:');
    // console.log('  - Player color:', playerColor);
    // console.log('  - Total moves:', totalMoves);
    // console.log('  - Move index:', moveIndex);
    // console.log('  - Expected SAN:', expectedSan);
    // console.log('  - sequence.white:', sequence.white);
    // console.log('  - sequence.black:', sequence.black);

    return expectedSan;
  };

  const getOpponentResponse = () => {
    const currentTurn = engine.turn;
    const totalMoves = engine.history().length;
    const moveIndex = Math.floor((totalMoves - 1) / 2);

    if (currentTurn === 'b') {
      return sequence.black[moveIndex];
    } else if (currentTurn === 'w') {
      return sequence.white[moveIndex + 1];
    }
    return null;
  };

  const initPositionForOrientation = () => {
    engine.reset();
    if (playerColor === 'b' && sequence.white[0]) {
      try {
        engine.move(sequence.white[0]);
      } catch (err) {
        console.error('Failed to apply first white move:', err);
      }
    }
  };

  const reset = () => {
    initPositionForOrientation();
    setSelected(null);
    setLegalTargets([]);
    setErrors(0);
    setHintsUsed(0);
    setStartTime(Date.now());
    trainingCompleteRef.current = false;
    setTick((t) => t + 1);
    setLastMove({ from: null, to: null });
    setHintSource(null);
    setHintTarget(null);
    setWrongMoveSquare(null);
    setCheckSquare(null);
    setEarnedXP(0);
  };

  const switchToVariation = (index: number) => {
    const variations = opening?.variations || [];

    if (index < 0 || index >= variations.length) return;

    const newVariation = variations[index];
    setCurrentVariationIndex(index);
    setCurrentOpening({ ...opening, ...newVariation });
    setErrors(0);
    setHintsUsed(0);
    setStartTime(Date.now());
    trainingCompleteRef.current = false;

    // Reset will be called by useEffect when opening changes
  };

  const handleNextVariation = () => {
    // Wait for completion processing to finish
    const proceedWithNext = () => {
      if (completionProcessingRef.current) {
        setTimeout(proceedWithNext, 100);
        return;
      }

      // Close modal
      setCompletionOpen(false);

      const variations = opening?.variations || [];

      if (!variations.length) {
        reset();
        return;
      }

      const nextIndex = currentMode === 'series'
        ? (currentVariationIndex + 1) % variations.length
        : Math.floor(Math.random() * variations.length);

      // Freemium restriction: Only first 3 variations (indices 0, 1, 2)
      if (!isPremium && nextIndex >= 3) {
        Alert.alert(
          'Premium Required',
          'Free users can practice the first 3 variations. Unlock all variations with ChessMaxx Premium!',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Unlock Premium', onPress: () => router.push('/paywall') }
          ]
        );
        return;
      }

      switchToVariation(nextIndex);
    };

    proceedWithNext();
  };

  const handleSeriesMode = () => {
    setCurrentMode('series');
  };

  const handleRandomMode = () => {
    setCurrentMode('random');
  };

  const applyMove = (move: any) => {
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
  };

  const findKingSquare = (color: string) => {
    const brd = engine.board;
    const FILES = ['a','b','c','d','e','f','g','h'];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = brd[r]?.[f];
        if (p && p.type === 'k' && p.color === color) {
          return orientation === 'white' ? `${FILES[f]}${8 - r}` : `${FILES[7 - f]}${r + 1}`;
        }
      }
    }
    return null;
  };

  const refreshCheckHighlight = () => {
    if (engine.inCheck()) {
      const turnColor = engine.turn;
      const kingSq = findKingSquare(turnColor);
      setCheckSquare(kingSq);
    } else {
      setCheckSquare(null);
    }
  };

  const validateMove = (move: any) => {
    // Compute expected SAN based on the color that just moved
    const totalMoves = engine.history().length; // includes this move
    const moveIndex = Math.floor((totalMoves - 1) / 2);
    const expectedSan = move.color === 'w' ? sequence.white[moveIndex] : sequence.black[moveIndex];

    // console.log('✅ validateMove DEBUG:');
    // console.log('  - Player played:', move.san);
    // console.log('  - Expected:', expectedSan);
    // console.log('  - Match?', move.san === expectedSan);
    // console.log('  - Total moves:', engine.history().length);
    // console.log('  - Total expected:', totalExpectedMoves);

    const finalizeCompletion = async () => {
      if (trainingCompleteRef.current) return;
      trainingCompleteRef.current = true;
      completionProcessingRef.current = true;

      const success = errors === 0;
      playCompletionSound(success);
      setCompletionSuccess(success);
      setCompletionOpen(true);

      // Mark status for current variation, if any
      if (opening?.variations?.length > 0) {
        setVariationStatuses((prev) => {
          const next = [...prev];
          next[currentVariationIndex] = success ? 'success' : 'error';
          return next;
        });
      }

      // Calculate completion time in seconds
      const completionTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Get difficulty from opening data (default to 1 if not specified)
      const difficulty = opening?.difficulty || 1;

      // Calculate XP (for display, even if not logged in)
      const xpResult = calculateXP({
        difficulty,
        errors,
        hintsUsed,
        completionTimeSeconds,
      });

      // console.log('[Training] XP Calculation:', xpResult);
      // console.log('[Training] Breakdown:', xpResult.breakdown);

      // Store XP for display in modal
      setEarnedXP(xpResult.totalXP);

      // Save XP to database if user is authenticated
      if (user) {
        try {

          // Ensure user profile exists (for users created before profile system)
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // console.log('[Training] Profile does not exist, creating...');
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
                id: user.id,
                username: null,
                total_xp: 0,
                weekly_xp: 0,
                level: 1,
              });

            if (createError) {
              console.error('[Training] Error creating profile:', createError);
              // Continue anyway, maybe it was created by another process
            }
            // else {
            //   console.log('[Training] Profile created successfully');
            // }
          }

          // Get current user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('total_xp, weekly_xp')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('[Training] Error fetching profile:', profileError);
          } else {
            // Calculate new XP values
            const newTotalXP = (profile?.total_xp || 0) + xpResult.totalXP;
            const newWeeklyXP = (profile?.weekly_xp || 0) + xpResult.totalXP;
            const newLevel = calculateLevel(newTotalXP);

            // Update user profile with new XP
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                total_xp: newTotalXP,
                weekly_xp: newWeeklyXP,
                level: newLevel,
              })
              .eq('id', user.id);

            if (updateError) {
              console.error('[Training] Error updating profile:', updateError);
            } else {

              // Save variation completion to database (after profile exists)
              const { error: completionError } = await supabase
                .from('variation_completions')
                .insert({
                  user_id: user.id,
                  variation_id: opening?.id || opening?.name || 'unknown',
                  difficulty,
                  errors,
                  hints_used: hintsUsed,
                  completion_time_seconds: completionTimeSeconds,
                  xp_earned: xpResult.totalXP,
                });

              if (completionError) {
                console.error('[Training] Error saving completion:', completionError);
                // Don't return - XP was already saved
              }

              // console.log('[Training] XP saved successfully!', {
              //   xpEarned: xpResult.totalXP,
              //   newTotalXP,
              //   newWeeklyXP,
              //   newLevel,
              // });

              // Optimistically update user profile in cache
              updateUserProfile({
                total_xp: newTotalXP,
                weekly_xp: newWeeklyXP,
                level: newLevel,
              });

              // Invalidate leaderboard cache to trigger refetch
              invalidateCache();
            }
          }
        } catch (error) {
          console.error('[Training] Error saving XP:', error);
        }
      }

      // Increment variations completed count and check for rating prompt
      try {
        const variationsCompleted = await ratingStorage.incrementVariationsCompleted();

        // Check if we should show rating prompt
        const shouldShowRating = await ratingStorage.shouldShowRatingPrompt();
        if (shouldShowRating) {
          // console.log('[Training] Showing rating prompt after', variationsCompleted, 'variations');
          // Delay showing rating modal until completion modal is closed
          setTimeout(() => {
            setRatingModalOpen(true);
          }, 500);
        }
      } catch (error) {
        console.error('[Training] Error handling rating prompt:', error);
      }

      // Mark processing as complete
      completionProcessingRef.current = false;
    };

    if (move.san !== expectedSan) {
      // Wrong move
      setErrors((e) => e + 1);
      playIllegalMoveSound();
      H.error();
      setWrongMoveSquare(move.to);
      if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
      wrongMoveTimeout.current = setTimeout(() => setWrongMoveSquare(null), 800);

      // Undo the wrong move
      engine.undo();
      setTick((t) => t + 1);
      return;
    }

    // Correct move: auto-play opponent response if available
    const oppSan = getOpponentResponse();
    if (oppSan) {
      setTimeout(() => {
        try {
          const oppMove = engine.move(oppSan);
          applyMove(oppMove);
          setTick((t) => t + 1);
          refreshCheckHighlight();

          // After opponent move, check for completion
          if (engine.history().length >= totalExpectedMoves) {
            finalizeCompletion();
          }
        } catch {}
      }, 300);
    } else {
      // No opponent reply expected; check completion now
      if (engine.history().length >= totalExpectedMoves) {
        finalizeCompletion();
      }
    }
  };

  const onSquarePress = (sq: string) => {
    // console.log('🔥 Square pressed:', sq);
    const piece = engine.getPiece(sq);
    // console.log('🔥 Piece at square:', piece);

    if (selected) {
      // console.log('🔥 Already have selection:', selected);
      if (selected === sq) {
        // console.log('🔥 Deselecting');
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      // Try to move
      const legal = engine.getLegalMoves(selected);
      const legalSquares = legal.map((m: any) => m.to);
      // console.log('🔥 Legal targets:', legalSquares);

      if (legalSquares.includes(sq)) {
        // console.log('🔥 Attempting move from', selected, 'to', sq);
        try {
          const move = engine.move({ from: selected, to: sq });
          // console.log('🔥 Move successful:', move);
          setTick((t) => t + 1); // Update board immediately to show player's move
          const result = applyMove(move);
          if (result.ok) {
            validateMove(move);
          }
          setSelected(null);
          setLegalTargets([]);
        } catch (err) {
          console.error('❌ Move failed:', err);
        }
      } else {
        // console.log('🔥 Not a legal move, checking if new piece selection');
        // Select new piece
        if (piece && piece.color === playerColor) {
          // console.log('🔥 Selecting new piece at', sq);
          setSelected(sq);
          const moves = engine.getLegalMoves(sq);
          setLegalTargets(moves.map((m: any) => m.to));
        } else {
          // console.log('🔥 Clearing selection');
          setSelected(null);
          setLegalTargets([]);
        }
      }
    } else {
      // console.log('🔥 No selection yet');
      // First selection
      if (piece && piece.color === playerColor) {
        // console.log('🔥 First selection at', sq, 'piece:', piece);
        setSelected(sq);
        const moves = engine.getLegalMoves(sq);
        // console.log('🔥 Legal moves:', moves.map((m: any) => m.to));
        setLegalTargets(moves.map((m: any) => m.to));
      }
    }
  };

  const onDropMove = (from: string, to: string) => {
    // console.log('🔥 Drop move from', from, 'to', to);
    if (!from || !to) return;

    const legal = engine.getLegalMoves(from);
    const legalSquares = legal.map((m: any) => m.to);

    if (!legalSquares.includes(to)) {
      // console.log('🔥 Illegal drop');
      playIllegalMoveSound();
      H.error();
      return;
    }

    try {
      const move = engine.move({ from, to });
      // console.log('🔥 Drop successful:', move);
      setTick((t) => t + 1); // Update board immediately to show player's move
      const result = applyMove(move);
      if (result.ok) {
        validateMove(move);
      }
      setSelected(null);
      setLegalTargets([]);
    } catch (err) {
      console.error('❌ Drop move failed:', err);
      playIllegalMoveSound();
      H.error();
    }
  };

  const handleHint = () => {
    const expectedSan = getExpectedMove();
    if (!expectedSan) return;

    try {
      const moves = engine.history();
      const allMoves = engine.moves({ verbose: true });
      const hintMove = allMoves.find((m: any) => m.san === expectedSan);

      if (hintMove) {
        setHintsUsed((h) => h + 1);
        setHintSource(hintMove.from);
        setHintTarget(hintMove.to);
        H.warning();

        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(() => {
          setHintSource(null);
          setHintTarget(null);
        }, 2000);
      }
    } catch {}
  };

  useEffect(() => {
    // When orientation or opening (variation) changes, fully reset board state
    reset();
  }, [orientation, opening]);

  // Guard against resetting variation statuses unnecessarily; only init if empty/mismatch
  useEffect(() => {
    if (opening?.variations?.length > 0) {
      setVariationStatuses((prev) => {
        if (prev.length === opening.variations.length) return prev;
        return new Array(opening.variations.length).fill('pending');
      });
    }
  }, [opening?.variations?.length, opening?.id]);

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
  const progress = {
    filled: currentMovesPlayed,
    total: totalExpectedMoves
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{opening?.name || 'Training'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Chess Board */}
      <View style={styles.boardContainer}>
        <GraphicalBoard
          board={board}
          orientation={orientation}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          captureSquare={captureSquare}
          hintSource={hintSource}
          hintTarget={hintTarget}
          wrongMoveSquare={wrongMoveSquare}
          checkSquare={checkSquare}
          onSquarePress={onSquarePress}
          onDropMove={onDropMove}
          showCoords={false}
          showCornerMarkers={true}
        />
      </View>

      {/* Training Controls */}
      <View style={styles.controlsContainer}>
        <TrainingControls
          onHint={handleHint}
          onSeriesMode={handleSeriesMode}
          onRandomMode={handleRandomMode}
          currentMode={currentMode}
          variationLabel={opening?.variationName || opening?.name || `Variation ${currentVariationIndex + 1}`}
          progress={progress}
          progressStatus={trainingCompleteRef.current ? (errors === 0 ? 'success' : 'error') : 'neutral'}
          variationStatuses={variationStatuses}
          onPickVariation={() => setVariationPickerOpen(true)}
          hasMoves={engine.history().length > (playerColor === 'b' ? 1 : 0)}
        />

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={reset}>
          <Text style={styles.resetButtonText}>↻ Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Completion Modal */}
      <CompletionModal
        visible={completionOpen}
        success={completionSuccess}
        title={completionSuccess ? 'Perfect!' : 'Completed with mistakes'}
        message={completionSuccess ? 'You mastered this variation!' : 'Try again for a perfect score'}
        variationName={opening?.variationName || opening?.name}
        onRetry={() => {
          setCompletionOpen(false);
          reset();
        }}
        onNext={handleNextVariation}
        onClose={() => setCompletionOpen(false)}
        nextEnabled={Array.isArray(opening?.variations) && opening.variations.length > 0}
        xpEarned={earnedXP}
        correctCount={playerColor === 'w' ? sequence.white?.length || 0 : sequence.black?.length || 0}
        incorrectCount={errors}
      />

      {/* Variation Picker Modal */}
      <Modal
        visible={variationPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVariationPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Variation</Text>
            <ScrollView style={styles.modalScroll}>
              {(opening?.variations || []).map((variation: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.variationItem,
                    currentVariationIndex === idx && styles.variationItemActive
                  ]}
                  onPress={() => {
                    switchToVariation(idx);
                    setVariationPickerOpen(false);
                  }}
                >
                  <View style={styles.variationItemContent}>
                    <Text style={[
                      styles.variationText,
                      currentVariationIndex === idx && styles.variationTextActive
                    ]}>
                      {variation.name || variation.variationName || `Variation ${idx + 1}`}
                    </Text>
                    {variationStatuses[idx] === 'success' && (
                      <Text style={styles.statusBadge}>✓</Text>
                    )}
                    {variationStatuses[idx] === 'error' && (
                      <Text style={[styles.statusBadge, styles.statusBadgeError]}>✗</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setVariationPickerOpen(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <RatingModal
        visible={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 28,
    color: colors.foreground,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
    textAlign: 'center',
  },
  boardContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  controlsContainer: {
    paddingHorizontal: 16,
  },
  resetButton: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.destructive,
    fontSize: 16,
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  variationItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variationItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  variationItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variationText: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '500',
    flex: 1,
  },
  variationTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 18,
    color: colors.success,
    fontWeight: '700',
    marginLeft: 8,
  },
  statusBadgeError: {
    color: colors.destructive,
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
