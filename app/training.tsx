import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import TrainingModeSelector from '@/src/components/TrainingModeSelector';
import InstructionDisplay from '@/src/components/InstructionDisplay';
import { TrainingMode, TrainingModeId, MoveExplanation, TRAINING_MODES } from '@/src/types/trainingModes';

// TEST MODE: Set to true to use local JSON files for Scotch Game
const USE_LOCAL_TEST_DATA = false;

// Load AI-enhanced Scotch Game files from assets
const scotchGameL1 = USE_LOCAL_TEST_DATA ? require('../assets/scotch-game-l1.json') : null;
const scotchGameL2 = USE_LOCAL_TEST_DATA ? require('../assets/scotch-game-l2.json') : null;

export default function TrainingScreen() {
  // Hooks
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { invalidateCache, updateUserProfile } = useLeaderboard();
  const { startSession, endSession } = useTraining();

  // Get opening data from Expo Router params or use test data
  const params = useLocalSearchParams();

  // Smart test data: Use AI-enhanced files based on level selection
  const getTestData = () => {
    if (!USE_LOCAL_TEST_DATA) return null;

    const openingData = params.openingData ? JSON.parse(params.openingData as string) : null;
    const level = openingData?.level || 1;

    console.log('🧪 TEST MODE: Loading Scotch Game Level', level);

    if (level === 2) return scotchGameL2;
    return scotchGameL1; // Default to Level 1
  };

  const initialOpening = USE_LOCAL_TEST_DATA
    ? getTestData()
    : (params.openingData ? JSON.parse(params.openingData as string) : null);

  // Variation management state
  const [currentOpening, setCurrentOpening] = useState(() => {
    if (initialOpening && !initialOpening.pgn && initialOpening.variations?.length > 0) {
      return { ...initialOpening, ...initialOpening.variations[0] };
    }
    return initialOpening;
  });
  const [currentMode, setCurrentMode] = useState<'series' | 'random'>('series');
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [variationStatuses, setVariationStatuses] = useState<Array<'pending' | 'success' | 'error'>>([]);

  // Check if the opening has moves with explanations (for Learn mode availability)
  const hasMovesWithExplanations = useMemo(() => {
    const variations = currentOpening?.variations;
    if (!Array.isArray(variations) || variations.length === 0) return false;
    // Check if at least one variation has moves array
    return variations.some((v: any) => Array.isArray(v?.moves) && v.moves.length > 0);
  }, [currentOpening?.variations]);

  // Training mode state - default to 'drill' for all openings
  const [trainingModeId, setTrainingModeId] = useState<TrainingModeId>('drill');
  const trainingMode = new TrainingMode(trainingModeId);
  const [currentExplanation, setCurrentExplanation] = useState<MoveExplanation | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [variationPickerOpen, setVariationPickerOpen] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);

  // Track completed variations to prevent double XP
  const [completedVariationIds, setCompletedVariationIds] = useState<Set<string>>(new Set());

  // Streak tracking
  const [currentStreak, setCurrentStreak] = useState(1);
  const [weeklyProgress, setWeeklyProgress] = useState([true, false, false, false, false]); // [W, Th, F, Sa, Su]
  const [showStreakCelebration, setShowStreakCelebration] = useState(true); // Show streak celebration once per day

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

  // Fetch user's streak data
  useEffect(() => {
    const fetchStreak = async () => {
      if (!user) return;

      try {
        // Get user's practice sessions from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: sessions } = await supabase
          .from('training_sessions')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (sessions && sessions.length > 0) {
          // Calculate current streak (consecutive days)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let streak = 0;
          let checkDate = new Date(today);

          for (let i = 0; i < 365; i++) { // Max 365 day streak
            const dayStart = new Date(checkDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(checkDate);
            dayEnd.setHours(23, 59, 59, 999);

            const practicedToday = sessions.some(s => {
              const sessionDate = new Date(s.created_at);
              return sessionDate >= dayStart && sessionDate <= dayEnd;
            });

            if (practicedToday) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0) {
              // If no practice today, check yesterday
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }

          setCurrentStreak(Math.max(1, streak));

          // Calculate weekly progress (last 5 days: W, Th, F, Sa, Su)
          const weekProgress = [false, false, false, false, false];
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

          // Map to our week starting from Wednesday (3)
          // W=3, Th=4, F=5, Sa=6, Su=0
          const weekDays = [3, 4, 5, 6, 0]; // Wednesday to Sunday

          weekDays.forEach((targetDay, index) => {
            let daysBack = 0;
            if (targetDay <= dayOfWeek) {
              daysBack = dayOfWeek - targetDay;
            } else {
              daysBack = 7 - (targetDay - dayOfWeek);
            }

            const checkDay = new Date(today);
            checkDay.setDate(checkDay.getDate() - daysBack);
            checkDay.setHours(0, 0, 0, 0);
            const checkDayEnd = new Date(checkDay);
            checkDayEnd.setHours(23, 59, 59, 999);

            const practiced = sessions.some(s => {
              const sessionDate = new Date(s.created_at);
              return sessionDate >= checkDay && sessionDate <= checkDayEnd;
            });

            weekProgress[index] = practiced;
          });

          setWeeklyProgress(weekProgress);
        }
      } catch (err) {
        console.error('[Training] Error fetching streak:', err);
      }
    };

    fetchStreak();
  }, [user]);

  // Check if we should show streak celebration (once per day after 12 PM)
  useEffect(() => {
    const checkStreakCelebration = async () => {
      try {
        const lastShownStr = await AsyncStorage.getItem('@last_streak_celebration');
        const now = new Date();

        console.log('[Training] Checking streak celebration...');
        console.log('[Training] Current time:', now.toISOString());
        console.log('[Training] Last shown:', lastShownStr);

        if (!lastShownStr) {
          // Never shown before, show it
          console.log('[Training] Never shown before, showing celebration');
          setShowStreakCelebration(true);
          return;
        }

        const lastShown = new Date(lastShownStr);

        // Get today at 12 PM
        const today12PM = new Date();
        today12PM.setHours(12, 0, 0, 0);

        // Get the date of last shown at 12 PM
        const lastShownDate = new Date(lastShown);
        lastShownDate.setHours(12, 0, 0, 0);

        console.log('[Training] Today 12 PM:', today12PM.toISOString());
        console.log('[Training] Last shown date 12 PM:', lastShownDate.toISOString());
        console.log('[Training] Now >= today12PM?', now >= today12PM);
        console.log('[Training] Different days?', today12PM.getTime() !== lastShownDate.getTime());

        // Show if:
        // 1. Current time is after 12 PM today AND
        // 2. Last shown was on a different day (comparing 12 PM timestamps)
        if (now >= today12PM && today12PM.getTime() !== lastShownDate.getTime()) {
          console.log('[Training] New day after 12 PM, showing celebration');
          setShowStreakCelebration(true);
        } else {
          console.log('[Training] Already shown today or before 12 PM, hiding celebration');
          setShowStreakCelebration(false);
        }
      } catch (error) {
        console.error('[Training] Error checking streak celebration:', error);
        setShowStreakCelebration(true); // Default to showing it
      }
    };

    checkStreakCelebration();
  }, []);

  // Mark streak celebration as shown when modal opens
  useEffect(() => {
    const markStreakShown = async () => {
      if (completionOpen && showStreakCelebration) {
        try {
          await AsyncStorage.setItem('@last_streak_celebration', new Date().toISOString());
        } catch (error) {
          console.error('[Training] Error saving streak celebration timestamp:', error);
        }
      }
    };

    markStreakShown();
  }, [completionOpen, showStreakCelebration]);

  // Load saved training mode preference on mount
  useEffect(() => {
    const loadTrainingMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('@training_mode');
        if (savedMode && (savedMode === 'learn' || savedMode === 'drill')) {
          // Only set 'learn' mode if explanations are available
          if (savedMode === 'learn' && !hasMovesWithExplanations) {
            setTrainingModeId('drill');
          } else {
            setTrainingModeId(savedMode as TrainingModeId);
          }
        }
        // If no saved preference, keep default (drill) - no else needed
      } catch (error) {
        console.error('[Training] Error loading training mode:', error);
      }
    };

    loadTrainingMode();
  }, [hasMovesWithExplanations]);

  // Save training mode preference when it changes
  useEffect(() => {
    const saveTrainingMode = async () => {
      try {
        await AsyncStorage.setItem('@training_mode', trainingModeId);
      } catch (error) {
        console.error('[Training] Error saving training mode:', error);
      }
    };

    saveTrainingMode();
  }, [trainingModeId]);

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
    // Note: PGN is stored in each variation, not at the top level
    // if (!opening?.pgn) {
    //   console.error('❌ CRITICAL: No PGN received in TrainingScreen!');
    // }
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

  console.log('🎯 TRAINING SCREEN - Opening data:', {
    name: opening?.name,
    color: opening?.color,
    level: opening?.level,
    variations: opening?.variations?.length
  });

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

    // Add move to history for undo functionality
    setMoveHistory(prev => [...prev, { move, fen: engine.fen }]);

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

      // In Learn Mode, advance to next variation in series mode or reset
      if (trainingMode.shouldShowExplanations()) {
        playCompletionSound(true); // Play a success sound

        // In series mode, automatically advance to next variation
        console.log('🔄 Learn mode completion check:', {
          currentMode,
          hasVariations: !!opening?.variations,
          variationCount: opening?.variations?.length,
          shouldAutoAdvance: currentMode === 'series' && opening?.variations?.length > 1
        });

        if (currentMode === 'series' && opening?.variations?.length > 1) {
          console.log('✅ Auto-advancing to next variation in 500ms');
          setTimeout(() => {
            handleNextVariation();
          }, 500);
        } else {
          console.log('⚠️ Not auto-advancing, resetting instead');
          setTimeout(() => {
            reset();
          }, 500);
        }
        return;
      }

      // Drill Mode: Show completion modal and track XP
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

          // Only update profile if XP > 0 AND we're in a mode that tracks XP
          if (xpToAward > 0 && trainingMode.shouldTrackXP()) {
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
          } else if (!trainingMode.shouldTrackXP()) {
            console.log('[Training] Learn mode - XP not tracked');
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
      // Wrong move - handle based on training mode
      const result = trainingMode.onIncorrectMove();

      setErrors((e) => e + 1);
      playIllegalMoveSound();
      H.error();
      setWrongMoveSquare(move.to);
      if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
      wrongMoveTimeout.current = setTimeout(() => setWrongMoveSquare(null), 800);

      if (result.action === 'ALLOW_UNDO') {
        // Learn mode: keep the move, allow undo
        setShowUndoButton(true);
        // Don't undo automatically, let user choose
      } else if (result.action === 'RESTART_VARIATION') {
        // Drill mode: undo and maybe restart
        engine.undo();
        setTick((t) => t + 1);
        // Could add auto-restart logic here if desired
      } else {
        // Default: undo the wrong move
        engine.undo();
        setTick((t) => t + 1);
      }
      return;
    }

    // Clear selection immediately after player's successful move
    setSelected(null);
    setLegalTargets([]);
    setShowUndoButton(false); // Clear undo button on correct move
    // Also clear hint highlights and wrong move indicator (and their timeouts)
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    setHintSource(null);
    setHintTarget(null);
    if (wrongMoveTimeout.current) clearTimeout(wrongMoveTimeout.current);
    setWrongMoveSquare(null);

    // Update explanation for next move
    updateCurrentExplanation();

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
        } catch { }
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

  // Function to update current explanation based on position
  const updateCurrentExplanation = () => {
    console.log('🔍 updateCurrentExplanation called');
    console.log('  - shouldShowExplanations:', trainingMode.shouldShowExplanations());
    console.log('  - opening?.variations:', opening?.variations?.length);

    if (!trainingMode.shouldShowExplanations()) {
      setCurrentExplanation(null);
      return;
    }

    // Get current variation data
    const variation = opening?.variations?.[currentVariationIndex];
    console.log('  - variation:', variation);
    console.log('  - variation?.moves:', variation?.moves?.length);

    if (!variation?.moves) {
      console.log('  ⚠️ No moves array in variation - explanations not available');
      setCurrentExplanation(null);
      return;
    }

    // Get the next move index (the move the player should make)
    const totalMoves = engine.history().length;
    const nextMoveIndex = totalMoves;

    console.log('  - nextMoveIndex:', nextMoveIndex);

    // Find the explanation for this move
    const moveData = variation.moves?.[nextMoveIndex];
    console.log('  - moveData:', moveData);

    if (moveData?.explanation) {
      console.log('  ✅ Setting explanation:', moveData.explanation.text);
      setCurrentExplanation(moveData.explanation);
    } else {
      console.log('  ⚠️ No explanation for this move');
      setCurrentExplanation(null);
    }
  };

  // Update explanation when training mode or position changes
  useEffect(() => {
    updateCurrentExplanation();
  }, [trainingModeId, tick, currentVariationIndex, opening]);

  // Undo handler for Learn mode
  const handleUndo = () => {
    if (!trainingMode.canUndo() || moveHistory.length === 0) return;

    // Undo last move
    engine.undo();
    setMoveHistory(prev => prev.slice(0, -1));
    setTick(t => t + 1);
    setShowUndoButton(false);
    setWrongMoveSquare(null);

    // Clear selection
    setSelected(null);
    setLegalTargets([]);

    H.ok();
  };

  // Handle mode change
  const handleModeChange = (newMode: TrainingModeId) => {
    setTrainingModeId(newMode);
    setShowUndoButton(false);
    updateCurrentExplanation();
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

      {/* Instruction Display (Learn Mode only) - Shows where mode selector was */}
      {trainingMode.shouldShowExplanations() && currentExplanation && (
        <InstructionDisplay
          explanation={currentExplanation}
          visible={true}
          isLearnMode={trainingMode.id === 'learn'}
        />
      )}

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
          showCoords={true}
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
          onModePress={() => setModePickerOpen(true)}
          onSeriesMode={handleSeriesMode}
          onRandomMode={handleRandomMode}
          currentMode={currentMode}
          variationLabel={`Variation ${currentVariationIndex + 1}`}
          progress={progress}
          progressStatus={trainingCompleteRef.current ? (errors === 0 ? 'success' : 'error') : 'neutral'}
          variationStatuses={variationStatuses}
          onPickVariation={() => setVariationPickerOpen(true)}
          hasMoves={engine.history().length > (playerColor === 'b' ? 1 : 0)}
          hideVariationSelector={trainingMode.id === 'learn'} // Hide in Learn mode for more space
        />

        {/* Undo Button (Learn Mode only) */}
        {trainingMode.canUndo() && showUndoButton && (
          <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
            <Text style={styles.undoButtonText}>↩️ Undo</Text>
          </TouchableOpacity>
        )}

        {/* Reset Button - Hidden in Learn Mode */}
        {!trainingMode.shouldShowExplanations() && (
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>↻ Reset</Text>
          </TouchableOpacity>
        )}
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
        currentStreak={currentStreak}
        weeklyProgress={weeklyProgress}
        showStreakCelebration={showStreakCelebration}
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
                            {
                              text: 'Unlock Premium', onPress: () => {
                                setVariationPickerOpen(false);
                                router.push('/paywall');
                              }
                            }
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

      {/* Mode Picker Modal */}
      <Modal
        visible={modePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Training Mode</Text>
            <View style={styles.modeOptionsContainer}>
              {Object.values(TRAINING_MODES).map((mode) => {
                // Learn mode is disabled if no explanations available
                const isDisabled = mode.id === 'learn' && !hasMovesWithExplanations;

                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.modeOption,
                      trainingModeId === mode.id && styles.modeOptionActive,
                      trainingModeId === mode.id && { borderColor: mode.color, backgroundColor: mode.color + '15' },
                      isDisabled && styles.modeOptionDisabled
                    ]}
                    onPress={() => {
                      if (isDisabled) return;
                      handleModeChange(mode.id);
                      setModePickerOpen(false);
                    }}
                    disabled={isDisabled}
                  >
                    <Text style={[styles.modeOptionEmoji, isDisabled && styles.modeOptionDisabledText]}>{mode.emoji}</Text>
                    <Text style={[
                      styles.modeOptionName,
                      trainingModeId === mode.id && styles.modeOptionNameActive,
                      isDisabled && styles.modeOptionDisabledText
                    ]}>{mode.name}</Text>
                    <Text style={[styles.modeOptionDescription, isDisabled && styles.modeOptionDisabledText]}>
                      {isDisabled ? 'Not available for this opening' : mode.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModePickerOpen(false)}
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
    marginVertical: 8, // Reduced from 20 to move board up and make variation component visible
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
  undoButton: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  undoButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
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
  modeOptionsContainer: {
    gap: 16,
    marginVertical: 8,
  },
  modeOption: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  modeOptionActive: {
    borderWidth: 3,
  },
  modeOptionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeOptionName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  modeOptionNameActive: {
    color: colors.primary,
  },
  modeOptionDescription: {
    fontSize: 14,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  modeOptionDisabled: {
    opacity: 0.4,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modeOptionDisabledText: {
    color: colors.textSubtle,
  },
});
