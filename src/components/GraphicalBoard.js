import React, { useMemo } from 'react';
import { Dimensions, View, TouchableOpacity } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Polygon } from 'react-native-svg';
import { Text } from 'react-native';
import DraggablePiece from './DraggablePiece';
import { colors } from '../theme/colors';

const FILES = ['a','b','c','d','e','f','g','h'];

function squareName(fileIndex, rankIndex, orientation = 'white') {
  if (orientation === 'white') {
    const file = FILES[fileIndex];
    const rank = 8 - rankIndex;
    return `${file}${rank}`;
  }
  const file = FILES[7 - fileIndex];
  const rank = rankIndex + 1;
  return `${file}${rank}`;
}

export default function GraphicalBoard({ board, orientation = 'white', selected, legalTargets = [], lastMove = {}, captureSquare, hintSource, hintTarget, wrongMoveSquare, checkSquare, onSquarePress, onDropMove, showCoords = true, showCornerMarkers = true }) {
  const size = Math.min(Dimensions.get('window').width - 24, 360);
  const square = Math.floor(size / 8);

  const legalSet = useMemo(() => new Set(legalTargets || []), [legalTargets]);
  const lmFrom = lastMove?.from;
  const lmTo = lastMove?.to;

  return (
    <View style={{ width: square * 8, height: square * 8, borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: colors.primary, position: 'relative', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
      <Svg width={square * 8} height={square * 8}>
        <Defs>
          <LinearGradient id="light" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.boardLight} />
            <Stop offset="100%" stopColor="#e1c190" />
          </LinearGradient>
          <LinearGradient id="dark" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.boardDark} />
            <Stop offset="100%" stopColor="#8f6a45" />
          </LinearGradient>
          <LinearGradient id="sel" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0a84ff33" />
            <Stop offset="100%" stopColor="#0a84ff55" />
          </LinearGradient>
          <LinearGradient id="last" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#f6f66966" />
            <Stop offset="100%" stopColor="#f6f66988" />
          </LinearGradient>
          <LinearGradient id="wrong" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#ff000055" />
            <Stop offset="100%" stopColor="#ff000088" />
          </LinearGradient>
          <LinearGradient id="check" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#ef444466" />
            <Stop offset="100%" stopColor="#ef444488" />
          </LinearGradient>
        </Defs>
        {Array.from({ length: 8 }).map((_, r) => (
          Array.from({ length: 8 }).map((_, f) => {
            const isDark = (f + r) % 2 === 1;
            const x = f * square;
            const y = r * square;
            const sq = squareName(f, r, orientation);
            const isLast = sq === lmFrom || sq === lmTo;
            const isSelected = selected === sq;
            const fill = isDark ? 'url(#dark)' : 'url(#light)';
            return (
              <Rect key={`sq-${r}-${f}`} x={x} y={y} width={square} height={square} fill={fill} />
            );
          })
        ))}
        {Array.from({ length: 8 }).map((_, r) => (
          Array.from({ length: 8 }).map((_, f) => {
            const x = f * square;
            const y = r * square;
            const sq = squareName(f, r, orientation);
            const isLast = sq === lmFrom || sq === lmTo;
            const isSelected = selected === sq;
            const isLegal = legalSet.has(sq);
            const isHintSource = hintSource === sq;
            const isHintTarget = hintTarget === sq;
            const strokeWidth = 3;
            return (
              <React.Fragment key={`overlay-${r}-${f}`}>
                {isLast && (
                  <Rect
                    key={`lm-${r}-${f}`}
                    x={x + strokeWidth / 2}
                    y={y + strokeWidth / 2}
                    width={square - strokeWidth}
                    height={square - strokeWidth}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={strokeWidth}
                    opacity={0.8}
                  />
                )}
                {isSelected && <Rect key={`sel-${r}-${f}`} x={x} y={y} width={square} height={square} fill={'url(#sel)'} />}
                {captureSquare === sq && (
                  <Rect key={`cap-${r}-${f}`} x={x} y={y} width={square} height={square} fill={'rgba(220,20,60,0.25)'} />
                )}
                {wrongMoveSquare === sq && (
                  <Rect key={`wrng-${r}-${f}`} x={x} y={y} width={square} height={square} fill={'url(#wrong)'} />
                )}
                {checkSquare === sq && (
                  <Rect key={`chk-${r}-${f}`} x={x} y={y} width={square} height={square} fill={'url(#check)'} />
                )}
                {isLegal && (
                  <Rect
                    key={`legal-${r}-${f}`}
                    x={x + strokeWidth / 2}
                    y={y + strokeWidth / 2}
                    width={square - strokeWidth}
                    height={square - strokeWidth}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={strokeWidth}
                    opacity={0.95}
                  />
                )}
                {isHintSource && (
                  <Rect
                    key={`hint-src-${r}-${f}`}
                    x={x + strokeWidth / 2}
                    y={y + strokeWidth / 2}
                    width={square - strokeWidth}
                    height={square - strokeWidth}
                    fill="none"
                    stroke="#fff59d"
                    strokeWidth={strokeWidth}
                    opacity={0.95}
                  />
                )}
                {isHintTarget && (
                  <Rect
                    key={`hint-tgt-${r}-${f}`}
                    x={x + strokeWidth / 2}
                    y={y + strokeWidth / 2}
                    width={square - strokeWidth}
                    height={square - strokeWidth}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={strokeWidth}
                    opacity={0.95}
                  />
                )}
              </React.Fragment>
            );
          })
        ))}

      </Svg>
      {/* Touch layer (tap to select) - allows drag gestures to pass through */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {Array.from({ length: 8 }).map((_, r) => (
          <View key={`row-${r}`} pointerEvents="box-none" style={{ position: 'absolute', top: r * square, left: 0, right: 0, height: square, flexDirection: 'row' }}>
            {Array.from({ length: 8 }).map((_, f) => {
              const sq = squareName(f, r, orientation);
              return (
                <TouchableOpacity
                  key={`touch-${r}-${f}`}
                  onPress={() => onSquarePress && onSquarePress(sq)}
                  activeOpacity={0.9}
                  style={{ width: square, height: square }}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Draggable piece layer */}
      {Array.from({ length: 8 }).map((_, r) => 
        Array.from({ length: 8 }).map((_, f) => {
          const br = orientation === 'white' ? r : 7 - r;
          const bf = orientation === 'white' ? f : 7 - f;
          const pieceObj = board[br]?.[bf];
          if (!pieceObj) return null;
          const from = squareName(f, r, orientation);
          return (
            <DraggablePiece
              key={`piece-${r}-${f}-${pieceObj.type}-${pieceObj.color}`}
              fromSquare={from}
              piece={pieceObj}
              squareSize={square}
              startX={f * square}
              startY={r * square}
              onDrop={onDropMove}
              onSquarePress={onSquarePress}
              orientation={orientation}
            />
          );
        })
      )}
      {showCornerMarkers && (
        <>
          <View style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, top: -7, left: -7, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 }} />
          <View style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, top: -7, right: -7, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 }} />
          <View style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, bottom: -7, left: -7, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 }} />
          <View style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, bottom: -7, right: -7, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 }} />
        </>
      )}
      {showCoords && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: square * 8, height: square * 8 }}>
          {/* files bottom */}
          <View style={{ position: 'absolute', bottom: -16, left: 0, right: 0, flexDirection: 'row' }}>
            {FILES.map((f, i) => (
              <View key={`f-${f}`} style={{ width: square, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>{orientation === 'white' ? f : FILES[7 - i]}</Text>
              </View>
            ))}
          </View>
          {/* ranks left */}
          <View style={{ position: 'absolute', top: 0, left: -16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={`r-${i}`} style={{ height: square, justifyContent: 'center' }}>
                <Text style={{ color: '#666' }}>{orientation === 'white' ? 8 - i : i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
