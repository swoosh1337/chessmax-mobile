import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/src/theme/colors';
import { TRAINING_MODES, TrainingModeId, TrainingModeConfig } from '@/src/types/trainingModes';

interface TrainingModeSelectorProps {
    currentMode: TrainingModeId;
    onModeChange: (mode: TrainingModeId) => void;
    style?: any;
}

export default function TrainingModeSelector({
    currentMode,
    onModeChange,
    style
}: TrainingModeSelectorProps) {
    const modes: TrainingModeConfig[] = Object.values(TRAINING_MODES);

    return (
        <View style={[styles.container, style]}>
            {modes.map((mode) => {
                const isActive = currentMode === mode.id;
                const isLocked = mode.unlockRequirement !== null && mode.unlockRequirement !== undefined;

                return (
                    <TouchableOpacity
                        key={mode.id}
                        style={[
                            styles.modeButton,
                            isActive && styles.modeButtonActive,
                            isActive && { borderColor: mode.color, backgroundColor: mode.color + '20' },
                            isLocked && styles.modeButtonLocked,
                        ]}
                        onPress={() => !isLocked && onModeChange(mode.id)}
                        disabled={isLocked}
                        activeOpacity={0.7}
                    >
                        {/* Icon/Emoji */}
                        <Text style={[styles.modeEmoji, isActive && styles.modeEmojiActive]}>
                            {mode.emoji}
                        </Text>

                        {/* Mode Name */}
                        <Text style={[styles.modeName, isActive && styles.modeNameActive]}>
                            {mode.name}
                        </Text>

                        {/* Description */}
                        {isActive && (
                            <Text style={styles.modeDescription}>
                                {mode.description}
                            </Text>
                        )}

                        {/* Lock indicator */}
                        {isLocked && mode.unlockRequirement && (
                            <View style={styles.lockContainer}>
                                <Text style={styles.lockIcon}>🔒</Text>
                                <Text style={styles.lockText}>
                                    {mode.unlockRequirement.type === 'learnLines'
                                        ? `Learn ${mode.unlockRequirement.count} ${mode.unlockRequirement.count === 1 ? 'line' : 'lines'}`
                                        : `Complete ${mode.unlockRequirement.count} ${mode.unlockRequirement.count === 1 ? 'variation' : 'variations'}`}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    modeButton: {
        flex: 1,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    modeButtonActive: {
        borderWidth: 2,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    modeButtonLocked: {
        opacity: 0.5,
    },
    modeEmoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    modeEmojiActive: {
        fontSize: 32,
    },
    modeName: {
        color: colors.foreground,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    modeNameActive: {
        fontSize: 16,
    },
    modeDescription: {
        color: colors.textSubtle,
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 4,
    },
    lockContainer: {
        marginTop: 8,
        alignItems: 'center',
    },
    lockIcon: {
        fontSize: 16,
        marginBottom: 2,
    },
    lockText: {
        color: colors.textSubtle,
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
});
