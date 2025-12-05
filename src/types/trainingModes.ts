// Training mode types and configuration
export type TrainingModeId = 'learn' | 'drill';

export interface MoveExplanation {
    text: string;
    concept: 'development' | 'center-control' | 'king-safety' | 'attack' | 'defense' | 'positional';
    visualHints?: {
        highlightSquares: string[];
        arrows?: Array<[string, string]>;
    };
}

export interface EnhancedMove {
    move: string;
    fen: string;
    explanation?: MoveExplanation;
}

export interface MoveResult {
    success: boolean;
    message: string;
    action: 'CONTINUE' | 'ALLOW_UNDO' | 'RESTART_VARIATION' | 'SHOW_HINT';
    xpChange?: number;
    showHint?: boolean;
}

export interface TrainingModeConfig {
    id: TrainingModeId;
    name: string;
    icon: string;
    emoji: string;
    description: string;
    color: string;
    features: {
        showExplanations: boolean;
        showHints: boolean;
        allowUndo: boolean;
        trackXP: boolean;
        trackProgress: boolean;
        showMistakes: boolean;
    };
    unlockRequirement?: {
        type: 'completedVariations' | 'learnLines';
        count: number;
    } | null;
}

// Training mode configurations
export const TRAINING_MODES: Record<TrainingModeId, TrainingModeConfig> = {
    learn: {
        id: 'learn',
        name: 'Learn',
        icon: '📚',
        emoji: '📚',
        description: 'Learn moves with explanations',
        color: '#8B5CF6',
        features: {
            showExplanations: true,
            showHints: true,
            allowUndo: true,
            trackXP: false,
            trackProgress: true,
            showMistakes: true,
        },
        unlockRequirement: null,
    },
    drill: {
        id: 'drill',
        name: 'Drill',
        icon: '🎯',
        emoji: '🎯',
        description: 'Practice for XP and mastery',
        color: '#F59E0B',
        features: {
            showExplanations: false,
            showHints: false,
            allowUndo: false,
            trackXP: true,
            trackProgress: true,
            showMistakes: true,
        },
        unlockRequirement: null,
    },
};

// Training mode handler class
export class TrainingMode {
    private config: TrainingModeConfig;

    constructor(modeId: TrainingModeId) {
        this.config = TRAINING_MODES[modeId];
    }

    get id(): TrainingModeId {
        return this.config.id;
    }

    get name(): string {
        return this.config.name;
    }

    get features() {
        return this.config.features;
    }

    shouldShowHints(): boolean {
        return this.config.features.showHints;
    }

    shouldTrackXP(): boolean {
        return this.config.features.trackXP;
    }

    canUndo(): boolean {
        return this.config.features.allowUndo;
    }

    shouldShowExplanations(): boolean {
        return this.config.features.showExplanations;
    }

    onCorrectMove(): MoveResult {
        return {
            success: true,
            message: this.config.features.trackXP ? 'Correct! +10 XP' : 'Correct!',
            action: 'CONTINUE',
            xpChange: this.config.features.trackXP ? 10 : 0,
        };
    }

    onIncorrectMove(): MoveResult {
        if (this.config.id === 'learn') {
            return {
                success: false,
                message: 'You made an incorrect move.',
                action: 'ALLOW_UNDO',
                showHint: true,
            };
        } else {
            // Drill mode
            return {
                success: false,
                message: 'Incorrect! Try again.',
                action: 'RESTART_VARIATION',
                xpChange: -5,
            };
        }
    }

    getConfig(): TrainingModeConfig {
        return this.config;
    }
}
