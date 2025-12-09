import React from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';
import { MoveExplanation } from '@/src/types/trainingModes';

interface InstructionDisplayProps {
    explanation: MoveExplanation | null;
    visible: boolean;
    style?: any;
    isLearnMode?: boolean; // Make box taller in Learn mode
}

// Chess piece symbols for each piece type
const PIECE_SYMBOLS: Record<string, string> = {
    'K': '♔', // King
    'Q': '♕', // Queen
    'R': '♖', // Rook
    'B': '♗', // Bishop
    'N': '♘', // Knight
    // Pawns don't have a letter prefix, we'll detect them by pattern
};

// Add piece symbol to a move notation (e.g., "Nf3" -> "♘f3", "d4" -> "♙d4")
function addPieceSymbol(move: string): string {
    // If move starts with a piece letter, add the symbol before it
    const firstChar = move.charAt(0);
    if (PIECE_SYMBOLS[firstChar]) {
        return PIECE_SYMBOLS[firstChar] + move.slice(1);
    }

    // If it's just a square (pawn move like "d4", "e4"), add pawn symbol
    if (/^[a-h][1-8]/.test(move)) {
        return '♙' + move;
    }

    // Castling
    if (move === 'O-O' || move === '0-0') return '♔O-O';
    if (move === 'O-O-O' || move === '0-0-0') return '♔O-O-O';

    return move;
}

// Helper to render text with backticks as bold with piece symbols
function renderFormattedText(text: string) {
    // First, remove quotation marks
    let cleanedText = text.replace(/["]/g, '');

    // Split by backticks, alternating between normal and code
    const parts = cleanedText.split(/`([^`]+)`/);

    return parts.map((part, index) => {
        // Odd indices are the content inside backticks
        const isCode = index % 2 === 1;

        if (isCode) {
            // Add piece symbol to move notation inside backticks
            const moveWithSymbol = addPieceSymbol(part);
            return (
                <Text key={index} style={styles.codeText}>
                    {moveWithSymbol}
                </Text>
            );
        }

        // Also handle **bold** markdown
        const boldParts = part.split(/\*\*([^*]+)\*\*/);

        return boldParts.map((boldPart, boldIndex) => {
            const isBold = boldIndex % 2 === 1;

            if (isBold) {
                // Add piece symbol to move notation inside **bold**
                const moveWithSymbol = addPieceSymbol(boldPart);
                return (
                    <Text key={`${index}-${boldIndex}`} style={styles.boldText}>
                        {moveWithSymbol}
                    </Text>
                );
            }

            return <Text key={`${index}-${boldIndex}`}>{boldPart}</Text>;
        });
    });
}

export default function InstructionDisplay({
    explanation,
    visible,
    style,
    isLearnMode = false
}: InstructionDisplayProps) {
    if (!visible || !explanation) return null;

    // Get concept badge color
    const getConceptColor = (concept: string) => {
        const colors: Record<string, string> = {
            'development': '#10B981',
            'center-control': '#3B82F6',
            'king-safety': '#F59E0B',
            'attack': '#EF4444',
            'defense': '#8B5CF6',
            'positional': '#6366F1',
            'general': '#6B7280',
        };
        return colors[concept] || colors.general;
    };

    const conceptColor = getConceptColor(explanation.concept);

    return (
        <View style={[
            styles.container,
            isLearnMode && styles.containerLearnMode, // Taller in Learn mode
            style
        ]}>
            {/* Concept badge */}
            <View style={[styles.conceptBadge, { backgroundColor: conceptColor + '20' }]}>
                <View style={[styles.conceptDot, { backgroundColor: conceptColor }]} />
                <Text style={[styles.conceptText, { color: conceptColor }]}>
                    {explanation.concept.replace(/-/g, ' ').toUpperCase()}
                </Text>
            </View>

            {/* Instruction text with formatted backticks */}
            <Text style={styles.instructionText}>
                {renderFormattedText(explanation.text)}
            </Text>

            {/* Decorative element */}
            <View style={styles.decorativeLine} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        height: 140, // Fixed height to prevent resizing when text changes
        justifyContent: 'flex-start', // Align content to top
    },
    containerLearnMode: {
        height: 220, // Much taller in Learn mode to fit longest AI explanations
    },
    conceptBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    conceptDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    conceptText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    instructionText: {
        color: colors.foreground,
        fontSize: 16, // Increased from 15 for better readability
        fontWeight: '500',
        lineHeight: 24, // Increased from 22 for better spacing
    },
    codeText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    boldText: {
        fontWeight: '800',
        fontSize: 16,
    },
    decorativeLine: {
        height: 2,
        width: 40,
        backgroundColor: colors.primary,
        borderRadius: 1,
        marginTop: 12,
        opacity: 0.5,
    },
});
