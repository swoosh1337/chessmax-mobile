import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
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
import { useTraining } from '@/src/context/TrainingContext';
import { ratingStorage } from '@/src/utils/storage';
import RatingModal from '@/src/components/RatingModal';
import pieceMap from '@/src/assets/pieces/index';

export default function TrainingScreen() {
  // Hooks
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { invalidateCache, updateUserProfile } = useLeaderboard();
  const { startSession, endSession } = useTraining();

  // Get opening data from Expo Router params
  const params = useLocalSearchParams();
  const initialOpening = params.openingData ? JSON.parse(params.openingData as string) : null;

  // Variation management state
  const [currentOpening, setCurrentOpening] = useState(initialOpening);
  const [currentMode, setCurrentMode] = useState<'series' | 'random'>('series');
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [variationStatuses, setVariationStatuses] = useState<Array<'pending' | 'success' | 'error'>>([]);
  const [variationPickerOpen, setVariationPickerOpen] = useState(false);

  // Track completed variations to prevent double XP
  const [completedVariationIds, setCompletedVariationIds] = useState<Set<string>>(new Set());

  // Helper to generate unique ID for a variation
  const getUniqueVariationId = useCallback((index: number) => {
    if (!opening?.id) return `unknown_${index}`;
    const vName = opening?.variations?.[index]?.name || `var_${index}`;
    return `${opening.id}::${vName}`;
  }, [opening?.id, opening?.variations]);

  const hasAutoAdvanced = useRef(false);

  // Fetch completed variations for this opening
  useEffect(() => {
    const fetchCompletions = async () => {
      if (!user || !opening?.id) return;

      try {
        const { data } = await supabase
          .from('variation_completions')
          .select('variation_id')
          .eq('user_id', user.id)
          .eq('errors', 0) // Only count successful completions
          // Filter by opening ID prefix
          .ilike('variation_id', `${opening.id}::%`);

        if (data) {
          const completedSet = new Set(data.map(d => d.variation_id));
          setCompletedVariationIds(completedSet);

          // Auto-advance to first uncompleted variation (only once per mount)
          if (!hasAutoAdvanced.current && opening?.variations?.length > 0) {
            hasAutoAdvanced.current = true;
            
            let firstUncompletedIndex = 0;
            const variations = opening.variations;
            
            for (let i = 0; i < variations.length; i++) {
              const vName = variations[i].name || `var_${i}`;
              const uid = `${opening.id}::${vName}`;
              
              if (!completedSet.has(uid)) {
                firstUncompletedIndex = i;
                break;
              }
            }
            
            // If found an uncompleted variation (and it's not the first one we're already on), switch to it
            if (firstUncompletedIndex > 0) {
              console.log('[Training] Auto-advancing to variation index:', firstUncompletedIndex);
              switchToVariation(firstUncompletedIndex);
            }
          }
        }
      } catch (err) {
        console.error('[Training] Error fetching completions:', err);
      }
    };

    fetchCompletions();
  }, [user, opening?.id]);

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

  // Start training session on mount
  useEffect(() => {
    const initSession = async () => {
      if (!user || !opening) return;

      try {
        const sessionId = await startSession(
          opening.name || 'Unknown Opening',
          opening.variations?.[currentVariationIndex]?.name,
          opening.category
        );
        setTrainingSessionId(sessionId);
        console.log('[Training] Session started:', sessionId);
      } catch (error) {
        console.error('[Training] Error starting session:', error);
      }
    };

    initSession();
  }, [user, opening, currentVariationIndex]);

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
  const [trainingSessionId, setTrainingSessionId] = useState<string | null>(null);
  const [piecesLoaded, setPiecesLoaded] = useState(false);

  // Preload chess piece images
  useEffect(() => {
    const loadPieces = async () => {
      try {
        console.log('🎨 Preloading chess pieces...');
        const pieceAssets = Object.values(pieceMap);
        await Asset.loadAsync(pieceAssets);
        console.log('✅ Chess pieces loaded');
        setPiecesLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load pieces:', error);
        // Still allow the game to continue even if preload fails
        setPiecesLoaded(true);
      }
    };
    loadPieces();
  }, []);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🟢 STATE UPDATE - selected:', selected, 'legalTargets:', legalTargets);
  }, [selected, legalTargets]);

  useEffect(() => {
    console.log('💡 HINT STATE UPDATE - hintSource:', hintSource, 'hintTarget:', hintTarget);
  }, [hintSource, hintTarget]);

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
    // Clear hint highlights and timeout
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    setHintSource(null);
    setHintTarget(null);
    // Clear wrong move highlight and timeout
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
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

      // Freemium restriction:
      // - First 3 openings: All levels and all variations free
      // - Other openings: Only level 1 is free (all variations available for level 1)
      // - Levels 2+ for openings 4+: Require premium (blocked at opening selection)

      // No variation limits for level 1 anymore - all variations are available
      // Premium check is done at the level selection in index.tsx

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

      // Check if already completed
      const uniqueVariationId = getUniqueVariationId(currentVariationIndex);
      const isAlreadyCompleted = completedVariationIds.has(uniqueVariationId);

      // Calculate XP (for display, even if not logged in)
      const xpResult = calculateXP({
        difficulty,
        errors,
        hintsUsed,
        completionTimeSeconds,
      });

      // Only award XP if not already completed
      const xpToAward = isAlreadyCompleted ? 0 : xpResult.totalXP;

      // Store XP for display in modal
      setEarnedXP(xpToAward);

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
                seen_onboarding: false,
                paywall_seen: false,
              });

            if (createError) {
              console.error('[Training] Error creating profile:', createError);
              // Continue anyway, maybe it was created by another process
            }
          }

          // Only update profile if XP > 0
          if (xpToAward > 0) {
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
              const newTotalXP = (profile?.total_xp || 0) + xpToAward;
              const newWeeklyXP = (profile?.weekly_xp || 0) + xpToAward;
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
          }

          // Save variation completion to database (always, to record the attempt/practice)
          // BUT we only want to mark it as "completed" if it wasn't before?
          // Actually, recording the attempt is fine. The important part is we used unique ID.
          const { error: completionError } = await supabase
            .from('variation_completions')
            .insert({
              user_id: user.id,
              variation_id: uniqueVariationId,
              difficulty,
              errors,
              hints_used: hintsUsed,
              completion_time_seconds: completionTimeSeconds,
              xp_earned: xpToAward,
            });

          if (completionError) {
            console.error('[Training] Error saving completion:', completionError);
          } else if (success) {
            // Update local state to show as completed
            setCompletedVariationIds(prev => new Set(prev).add(uniqueVariationId));
          }

        } catch (error) {
          console.error('[Training] Error saving XP:', error);
        }
      }

      // End training session
      if (trainingSessionId && user) {
        try {
          await endSession(
            trainingSessionId,
            engine.history().length,
            errors,
            xpResult.totalXP
          );
          console.log('[Training] Session ended:', trainingSessionId);
        } catch (error) {
          console.error('[Training] Error ending session:', error);
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

    // Clear selection immediately after player's successful move
    setSelected(null);
    setLegalTargets([]);
    // Also clear hint highlights and wrong move indicator (and their timeouts)
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    setHintSource(null);
    setHintTarget(null);
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
    setWrongMoveSquare(null);

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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SQUARE PRESSED:', sq);
    const piece = engine.getPiece(sq);
    console.log('🎯 Piece at square:', piece);
    console.log('🎯 Current selected:', selected);
    console.log('🎯 Current legalTargets:', legalTargets);
    console.log('🎯 Player color:', playerColor);

    if (selected) {
      // console.log('🔥 Already have selection:', selected);
      if (selected === sq) {
        // console.log('🔥 Deselecting');
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      // Validate that selected square still has a valid piece
      const selectedPiece = engine.getPiece(selected);
      console.log('🎯 Validating selected piece at', selected, ':', selectedPiece);
      if (!selectedPiece || selectedPiece.color !== playerColor) {
        console.log('⚠️ STALE SELECTION! Clearing and reselecting');
        // Selection is stale, clear it and start fresh
        setSelected(null);
        setLegalTargets([]);
        // Try selecting the clicked square instead
        if (piece && piece.color === playerColor) {
          console.log('🎯 Selecting new piece at', sq);
          // Clear hint when selecting a piece
          if (hintTimeout.current) clearTimeout(hintTimeout.current);
          setHintSource(null);
          setHintTarget(null);
          setSelected(sq);
          const moves = engine.getLegalMoves(sq);
          console.log('🎯 Legal moves for', sq, ':', moves.map((m: any) => m.to));
          setLegalTargets(moves.map((m: any) => m.to));
        }
        return;
      }

      // Try to move
      const legal = engine.getLegalMoves(selected);
      const legalSquares = legal.map((m: any) => m.to);
      console.log('🎯 Legal moves from', selected, ':', legalSquares);

      console.log('🎯 Checking if', sq, 'is in legalSquares:', legalSquares);
      console.log('🎯 legalSquares.includes(', sq, '):', legalSquares.includes(sq));

      if (legalSquares.includes(sq)) {
        console.log('✅ LEGAL MOVE - Attempting move from', selected, 'to', sq);
        try {
          const move = engine.move({ from: selected, to: sq });
          console.log('✅ Move successful:', move);
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
        console.log('❌ NOT A LEGAL TARGET:', sq, 'is not in', legalSquares);
        console.log('🎯 Piece at target square:', piece);
        // Select new piece - but ONLY if it's the player's piece
        if (piece && piece.color === playerColor) {
          console.log('🎯 Selecting different piece at', sq);
          // Clear hint when selecting a piece
          if (hintTimeout.current) clearTimeout(hintTimeout.current);
          setHintSource(null);
          setHintTarget(null);
          setSelected(sq);
          const moves = engine.getLegalMoves(sq);
          console.log('🎯 Legal moves for', sq, ':', moves.map((m: any) => m.to));
          setLegalTargets(moves.map((m: any) => m.to));
        } else {
          console.log('🎯 Clearing selection (clicked empty or opponent piece)');
          setSelected(null);
          setLegalTargets([]);
        }
      }
    } else {
      console.log('🎯 No previous selection');
      // First selection - ONLY allow player's pieces
      if (piece && piece.color === playerColor) {
        console.log('🎯 First selection at', sq, 'piece:', piece);
        // Clear hint when selecting a piece
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        setHintSource(null);
        setHintTarget(null);
        setSelected(sq);
        const moves = engine.getLegalMoves(sq);
        console.log('🎯 Legal moves for', sq, ':', moves.map((m: any) => m.to));
        setLegalTargets(moves.map((m: any) => m.to));
      } else if (piece && piece.color !== playerColor) {
        console.log('⛔ BLOCKED: Clicked opponent piece at', sq, '- not showing moves');
      } else {
        console.log('🎯 Clicked empty square, no selection');
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  const onDropMove = (from: string, to: string) => {
    // console.log('🔥 Drop move from', from, 'to', to);
    if (!from || !to) return;

    // Validate that the piece being dragged belongs to the player
    const piece = engine.getPiece(from);
    if (!piece || piece.color !== playerColor) {
      console.warn('[Training] Attempted to drag opponent piece or empty square');
      return;
    }

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
    // If hint is currently showing, hide it (toggle behavior)
    if (hintSource || hintTarget) {
      console.log('💡 HINT: Toggling OFF - clearing hint highlights');
      if (hintTimeout.current) clearTimeout(hintTimeout.current);
      setHintSource(null);
      setHintTarget(null);
      return;
    }

    const expectedSan = getExpectedMove();
    console.log('💡 HINT: Expected move SAN:', expectedSan);
    if (!expectedSan) {
      console.log('💡 HINT: No expected move found');
      return;
    }

    try {
      const allMoves = engine.moves({ verbose: true });
      console.log('💡 HINT: All legal moves:', allMoves.map((m: any) => m.san));
      const hintMove = allMoves.find((m: any) => m.san === expectedSan);
      console.log('💡 HINT: Found hint move:', hintMove);

      if (hintMove) {
        console.log('💡 HINT: Setting highlights - from:', hintMove.from, 'to:', hintMove.to);
        setHintsUsed((h) => h + 1);
        setHintSource(hintMove.from);
        setHintTarget(hintMove.to);
        H.warning();

        // Auto-clear hint after 3 seconds
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(() => {
          console.log('💡 HINT: Auto-clearing hint highlights after timeout');
          setHintSource(null);
          setHintTarget(null);
        }, 3000);
      } else {
        console.log('💡 HINT: Expected move not found in legal moves!');
      }
    } catch (err) {
      console.error('💡 HINT ERROR:', err);
    }
  };

  useEffect(() => {
    // When orientation or opening (variation) changes, fully reset board state
    reset();
  }, [orientation, opening]);

  // Initialize and update variation statuses
  useEffect(() => {
    if (opening?.variations?.length > 0) {
      setVariationStatuses((prev) => {
        // Create new array based on variations
        const next = new Array(opening.variations.length).fill('pending');
        
        // Preserve current session progress (if better than pending)
        prev.forEach((status, idx) => {
          if (idx < next.length && status !== 'pending') {
            next[idx] = status;
          }
        });

        // Mark historically completed variations
        if (completedVariationIds.size > 0) {
          opening.variations.forEach((_: any, idx: number) => {
            const uid = getUniqueVariationId(idx);
            if (completedVariationIds.has(uid)) {
              next[idx] = 'success';
            }
          });
        }

        // Check if changed to avoid loop
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    }
  }, [opening?.variations?.length, opening?.id, completedVariationIds, getUniqueVariationId]);

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
          lastMove={{ from: null, to: null }}
          captureSquare={captureSquare}
          hintSource={hintSource}
          hintTarget={hintTarget}
          wrongMoveSquare={wrongMoveSquare}
          checkSquare={checkSquare}
          onSquarePress={onSquarePress}
          onDropMove={onDropMove}
          showCoords={false}
          showCornerMarkers={true}
          playerColor={playerColor}
        />

        {/* Loading Overlay */}
        {!piecesLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading pieces...</Text>
          </View>
        )}
      </View>

      {/* Training Controls */}
      <View style={styles.controlsContainer}>
        <TrainingControls
          onHint={handleHint}
          onSeriesMode={handleSeriesMode}
          onRandomMode={handleRandomMode}
          currentMode={currentMode}
          variationLabel={`Variation ${currentVariationIndex + 1}`}
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
              {(opening?.variations || []).map((variation: any, idx: number) => {
                // All variations are now accessible (premium check is done at level selection)
                const isLocked = false;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.variationItem,
                      currentVariationIndex === idx && styles.variationItemActive,
                      isLocked && styles.variationItemLocked
                    ]}
                    onPress={() => {
                      if (isLocked) {
                        Alert.alert(
                          'Premium Required',
                          'Unlock all variations with ChessMaxx Premium!',
                          [
                            { text: 'Maybe Later', style: 'cancel' },
                            { text: 'Unlock Premium', onPress: () => {
                              setVariationPickerOpen(false);
                              router.push('/paywall');
                            }}
                          ]
                        );
                        return;
                      }
                      switchToVariation(idx);
                      setVariationPickerOpen(false);
                    }}
                    disabled={false}
                  >
                    <View style={styles.variationItemContent}>
                      <Text style={[
                        styles.variationText,
                        currentVariationIndex === idx && styles.variationTextActive,
                        isLocked && styles.variationTextLocked
                      ]}>
                        Variation {idx + 1}
                      </Text>
                      {isLocked && (
                        <Text style={styles.lockBadge}>🔒</Text>
                      )}
                      {!isLocked && variationStatuses[idx] === 'success' && (
                        <Text style={styles.statusBadge}>✓</Text>
                      )}
                      {!isLocked && variationStatuses[idx] === 'error' && (
                        <Text style={[styles.statusBadge, styles.statusBadgeError]}>✗</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
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
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    zIndex: 1000,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
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
  variationItemLocked: {
    opacity: 0.5,
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
  variationTextLocked: {
    color: colors.textSubtle,
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
  lockBadge: {
    fontSize: 16,
    marginLeft: 8,
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
