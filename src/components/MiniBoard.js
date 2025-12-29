import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import { ChessEngine } from '../logic/chessEngine';
import { parsePGN } from '../utils/pgnParser';
import { colors } from '../theme/colors';
import { createLogger } from '../utils/logger';

const log = createLogger('MiniBoard');

const PIECE_UNICODE = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

export default function MiniBoard({ pgn, size = 320 }) {
  const square = size / 8;

  const board = useMemo(() => {
    const engine = new ChessEngine();
    if (pgn) {
      const sequence = parsePGN(pgn);
      // Play first few moves to show the opening position
      const movesToPlay = Math.min(6, Math.max(sequence.white.length, sequence.black.length));
      for (let i = 0; i < movesToPlay; i++) {
        if (sequence.white[i]) {
          try { engine.move(sequence.white[i]); } catch (err) {
            log.error('Failed to apply PGN move (white)', err, {
              move: sequence.white[i],
              index: i,
              pgnSnippet: String(pgn).slice(0, 120)
            });
          }
        }
        if (sequence.black[i]) {
          try { engine.move(sequence.black[i]); } catch (err) {
            log.error('Failed to apply PGN move (black)', err, {
              move: sequence.black[i],
              index: i,
              pgnSnippet: String(pgn).slice(0, 120)
            });
          }
        }
      }
    }
    return engine.board;
  }, [pgn]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="light" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.boardLight} />
            <Stop offset="100%" stopColor="#e1c190" />
          </LinearGradient>
          <LinearGradient id="dark" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.boardDark} />
            <Stop offset="100%" stopColor="#8f6a45" />
          </LinearGradient>
        </Defs>

        {/* Board squares */}
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 8 }).map((_, f) => {
            const isDark = (f + r) % 2 === 1;
            const x = f * square;
            const y = r * square;
            return (
              <Rect
                key={`sq-${r}-${f}`}
                x={x}
                y={y}
                width={square}
                height={square}
                fill={isDark ? 'url(#dark)' : 'url(#light)'}
              />
            );
          })
        )}

        {/* Pieces */}
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 8 }).map((_, f) => {
            const pieceObj = board[r]?.[f];
            if (!pieceObj) return null;
            
            const x = f * square + square / 2;
            const y = r * square + square / 2;
            const unicode = PIECE_UNICODE[pieceObj.color === 'w' ? pieceObj.type.toUpperCase() : pieceObj.type];
            
            return (
              <SvgText
                key={`piece-${r}-${f}`}
                x={x}
                y={y}
                fontSize={square * 0.75}
                textAnchor="middle"
                alignmentBaseline="central"
                fill={pieceObj.color === 'w' ? '#ffffff' : '#000000'}
                stroke={pieceObj.color === 'w' ? '#000000' : '#ffffff'}
                strokeWidth={0.5}
              >
                {unicode}
              </SvgText>
            );
          })
        )}
      </Svg>
    </View>
  );
}
