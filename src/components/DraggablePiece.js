import React, { useMemo, useState } from 'react';
import { Image, Text, View, PanResponder } from 'react-native';
import pieceMap from '../assets/pieces/index';
import { select as hapticSelect } from '../utils/haptics';

// Better Unicode pieces with proper styling
const PIECE_UNICODE = { 
  p: '♟︎', r: '♜︎', n: '♞︎', b: '♝︎', q: '♛︎', k: '♚︎', 
  P: '♙︎', R: '♖︎', N: '♘︎', B: '♗︎', Q: '♕︎', K: '♔︎' 
};

export default function DraggablePiece({ fromSquare, piece, squareSize, startX, startY, onDrop, onSquarePress, orientation, playerColor }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDuringDrag, setSelectedDuringDrag] = useState(false);
  // Require a substantial move before treating as a drag to avoid accidental drops from taps
  const DRAG_THRESHOLD = Math.max(10, Math.floor(squareSize * 0.45));

  // Check if this piece belongs to the player
  const isPlayerPiece = playerColor && piece.color === playerColor;

  const panResponder = useMemo(() => PanResponder.create({
    // Prioritize this view for touch start so overlay grid doesn't steal it
    // ONLY allow drag/touch if this is the player's piece
    onStartShouldSetPanResponder: () => isPlayerPiece,
    onStartShouldSetPanResponderCapture: () => isPlayerPiece,
    // Only treat as drag if there is meaningful movement (distance > threshold)
    onMoveShouldSetPanResponder: (_, g) => {
      const d = Math.hypot(g.dx, g.dy);
      return d > DRAG_THRESHOLD;
    },
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      setIsDragging(true);
      setSelectedDuringDrag(false);
      hapticSelect();
    },
    onPanResponderMove: (_, gestureState) => {
      setPosition({ x: gestureState.dx, y: gestureState.dy });
      const dist = Math.hypot(gestureState.dx, gestureState.dy);
      if (!selectedDuringDrag && dist > DRAG_THRESHOLD && typeof onSquarePress === 'function') {
        // Select source square once dragging meaningfully starts to reveal legal targets
        try { onSquarePress(fromSquare); } catch {}
        setSelectedDuringDrag(true);
      }
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gestureState) => {
      const dist = Math.hypot(gestureState.dx, gestureState.dy);
      // Treat small drags as a tap: do not drop/move
      if (dist < DRAG_THRESHOLD) {
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
        if (onSquarePress) onSquarePress(fromSquare);
        return;
      }
      const f = Math.round((startX + gestureState.dx) / squareSize);
      const r = Math.round((startY + gestureState.dy) / squareSize);
      const nf = Math.max(0, Math.min(7, f));
      const nr = Math.max(0, Math.min(7, r));
      const FILES = ['a','b','c','d','e','f','g','h'];
      const sq = orientation === 'white' ? `${FILES[nf]}${8 - nr}` : `${FILES[7 - nf]}${nr + 1}`;

      setPosition({ x: 0, y: 0 });
      setIsDragging(false);

      // If piece was moved to a different square, call onDrop
      if (onDrop && sq !== fromSquare) {
        onDrop(fromSquare, sq);
      }
      // If piece was tapped (not dragged), call onSquarePress to select it
      else if (onSquarePress && sq === fromSquare) {
        onSquarePress(fromSquare);
      }
    },
  }), [fromSquare, onSquarePress, onDrop, squareSize, startX, startY, orientation, DRAG_THRESHOLD, isPlayerPiece]);

  const key = `${piece.color === 'w' ? 'w' : 'b'}${piece.type.toUpperCase()}`;
  const img = pieceMap[key];

  return (
    <View
      pointerEvents={isPlayerPiece ? "box-only" : "none"}
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: squareSize,
        height: squareSize,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { scale: isDragging ? 1.1 : 1 }
        ],
        shadowColor: '#000',
        shadowOpacity: isDragging ? 0.4 : 0.2,
        shadowOffset: { width: 0, height: isDragging ? 8 : 4 },
        shadowRadius: isDragging ? 12 : 6,
        elevation: isDragging ? 12 : 4,
        zIndex: isDragging ? 1000 : 1,
      }}
    >
      {img ? (
        <Image source={img} resizeMode="contain" style={{ width: squareSize * 0.9, height: squareSize * 0.9, opacity: 0.98 }} />
      ) : (
        <Text style={{ 
          fontSize: squareSize * 0.75, 
          color: piece.color === 'w' ? '#ffffff' : '#000000',
          textShadowColor: piece.color === 'w' ? '#000000' : '#ffffff',
          textShadowOffset: { width: 0.5, height: 0.5 }, 
          textShadowRadius: 1,
          fontWeight: '400'
        }}>
          {PIECE_UNICODE[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
        </Text>
      )}
    </View>
  );
}
