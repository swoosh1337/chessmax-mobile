import React from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';
import { MoveExplanation } from '@/src/types/trainingModes';

interface InstructionDisplayProps {
    explanation: MoveExplanation | null;
    visible: boolean;
    style?: any;
}

export default function InstructionDisplay({
    explanation,
    visible,
    style
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
        <View style={[styles.container, style]}>
            {/* Concept badge */}
            <View style={[styles.conceptBadge, { backgroundColor: conceptColor + '20' }]}>
                <View style={[styles.conceptDot, { backgroundColor: conceptColor }]} />
                <Text style={[styles.conceptText, { color: conceptColor }]}>
                    {explanation.concept.replace(/-/g, ' ').toUpperCase()}
                </Text>
            </View>

            {/* Instruction text */}
            <Text style={styles.instructionText}>
                {explanation.text}
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
        minHeight: 140, // Fixed minimum height to prevent resizing
        justifyContent: 'space-between', // Distribute content
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
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
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
