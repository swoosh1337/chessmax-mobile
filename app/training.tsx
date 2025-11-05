import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
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

export default function TrainingScreen() {
  // Get opening data from Expo Router params
  const params = useLocalSearchParams();
  const opening = params.openingData ? JSON.parse(params.openingData as string) : null;

  // Debug: Log opening data on mount
  useEffect(() => {
    console.log('=== TRAINING SCREEN RECEIVED ===');
    console.log('Opening name:', opening?.name);
    console.log('Opening color:', opening?.color, '→', opening?.color === 'b' ? 'BLACK' : 'WHITE');
    console.log('Initial orientation set to:', opening?.color === 'b' ? 'black' : 'white');
    if (!opening?.pgn) {
      console.error('❌ CRITICAL: No PGN received in TrainingScreen!');
    }
    console.log('=== END TRAINING SCREEN DEBUG ===');
  }, [opening]);

  const [engine] = useState(() => new ChessEngine());
  const [orientation, setOrientation] = useState(opening?.color === 'b' ? 'black' : 'white');
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
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

    console.log('🎯 getExpectedMove DEBUG:');
    console.log('  - Player color:', playerColor);
    console.log('  - Total moves:', totalMoves);
    console.log('  - Move index:', moveIndex);
    console.log('  - Expected SAN:', expectedSan);
    console.log('  - sequence.white:', sequence.white);
    console.log('  - sequence.black:', sequence.black);

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
    trainingCompleteRef.current = false;
    setTick((t) => t + 1);
    setLastMove({ from: null, to: null });
    setHintSource(null);
    setHintTarget(null);
    setWrongMoveSquare(null);
    setCheckSquare(null);
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
    const expectedSan = getExpectedMove();

    console.log('✅ validateMove DEBUG:');
    console.log('  - Player played:', move.san);
    console.log('  - Expected:', expectedSan);
    console.log('  - Match?', move.san === expectedSan);

    if (!expectedSan) {
      trainingCompleteRef.current = true;
      const success = errors === 0;
      playCompletionSound(success);
      setCompletionSuccess(success);
      setCompletionOpen(true);
      return;
    }

    if (move.san === expectedSan) {
      // Correct move
      const oppSan = getOpponentResponse();
      if (oppSan) {
        setTimeout(() => {
          try {
            const oppMove = engine.move(oppSan);
            applyMove(oppMove);
            setTick((t) => t + 1);
            refreshCheckHighlight();
          } catch {}
        }, 300);
      }
      setTick((t) => t + 1);
    } else {
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
    }
  };

  const onSquarePress = (sq: string) => {
    console.log('🔥 Square pressed:', sq);
    const piece = engine.getPiece(sq);
    console.log('🔥 Piece at square:', piece);

    if (selected) {
      console.log('🔥 Already have selection:', selected);
      if (selected === sq) {
        console.log('🔥 Deselecting');
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      // Try to move
      const legal = engine.getLegalMoves(selected);
      const legalSquares = legal.map((m: any) => m.to);
      console.log('🔥 Legal targets:', legalSquares);

      if (legalSquares.includes(sq)) {
        console.log('🔥 Attempting move from', selected, 'to', sq);
        try {
          const move = engine.move({ from: selected, to: sq });
          console.log('🔥 Move successful:', move);
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
        console.log('🔥 Not a legal move, checking if new piece selection');
        // Select new piece
        if (piece && piece.color === playerColor) {
          console.log('🔥 Selecting new piece at', sq);
          setSelected(sq);
          const moves = engine.getLegalMoves(sq);
          setLegalTargets(moves.map((m: any) => m.to));
        } else {
          console.log('🔥 Clearing selection');
          setSelected(null);
          setLegalTargets([]);
        }
      }
    } else {
      console.log('🔥 No selection yet');
      // First selection
      if (piece && piece.color === playerColor) {
        console.log('🔥 First selection at', sq, 'piece:', piece);
        setSelected(sq);
        const moves = engine.getLegalMoves(sq);
        console.log('🔥 Legal moves:', moves.map((m: any) => m.to));
        setLegalTargets(moves.map((m: any) => m.to));
      }
    }
  };

  const onDropMove = (from: string, to: string) => {
    console.log('🔥 Drop move from', from, 'to', to);
    if (!from || !to) return;

    const legal = engine.getLegalMoves(from);
    const legalSquares = legal.map((m: any) => m.to);

    if (!legalSquares.includes(to)) {
      console.log('🔥 Illegal drop');
      playIllegalMoveSound();
      H.error();
      return;
    }

    try {
      const move = engine.move({ from, to });
      console.log('🔥 Drop successful:', move);
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
    initPositionForOrientation();
    refreshCheckHighlight();
  }, [orientation, opening]);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            onSeriesMode={() => {}}
            onRandomMode={() => {}}
            currentMode="series"
            variationLabel={opening?.variationName || opening?.name || 'Variation 1'}
            progress={progress}
            progressStatus="neutral"
            variationStatuses={[]}
            onPickVariation={() => {}}
            hasMoves={engine.history().length > (playerColor === 'b' ? 1 : 0)}
          />

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>↻ Reset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Completion Modal */}
      <CompletionModal
        visible={completionOpen}
        success={completionSuccess}
        title={completionSuccess ? 'Perfect!' : 'Completed with errors'}
        message={completionSuccess ? 'You mastered this variation!' : 'Try again for a perfect score'}
        variationName={opening?.variationName || opening?.name}
        onRetry={() => {
          setCompletionOpen(false);
          reset();
        }}
        onNext={() => {
          setCompletionOpen(false);
          router.back();
        }}
        onClose={() => setCompletionOpen(false)}
        nextEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
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
});
