// Sound playback for React Native (Expo)
// Mirrors the web app's centralized SoundManager API for consistency

let ExpoAudio;
let ExpoAV;
try {
  // Lazy require to avoid bundling errors if module is missing in certain environments
  ExpoAudio = require('expo-audio');
} catch {
  ExpoAudio = null;
}
try {
  // Prefer expo-av if available (works in Expo Go)
  ExpoAV = require('expo-av');
} catch {
  ExpoAV = null;
}

// Sounds temporarily disabled until expo-audio is properly loaded
const ENABLE_SOUNDS = false;

// Timings (match web where helpful)
const CHECK_SOUND_DELAY = 100; // ms

// Sound assets - all chess move sounds from web app
const sources = {
  // Basic moves
  move: require('../assets/sounds/move.mp3'),
  capture: require('../assets/sounds/capture.mp3'),
  check: require('../assets/sounds/move-check.mp3'),
  castle: require('../assets/sounds/castle.mp3'),
  promote: require('../assets/sounds/promote.mp3'),

  // Training feedback
  error: require('../assets/sounds/illegal.mp3'),
  illegal: require('../assets/sounds/illegal.mp3'), // alias
  correct: require('../assets/sounds/puzzle-correct.mp3'),
  wrong: require('../assets/sounds/puzzle-wrong.mp3'),

  // Game events
  gameEnd: require('../assets/sounds/game-end.mp3'),
  notify: require('../assets/sounds/Notify.mp3'),
};

const cache = {};
let volume = 0.4; // default volume (0..1)
let soundQueue = [];
let isPlayingSequence = false;
let implChoice = null; // cache chosen implementation for logs

function getAudioImpl() {
  // Try expo-av first (most stable, available in Expo Go)
  if (ExpoAV?.Audio?.Sound) {
    return { type: 'av', AudioNS: ExpoAV.Audio };
  }
  // expo-audio may expose Audio.Sound or a custom AudioPlayer
  if (ExpoAudio?.Audio?.Sound) {
    return { type: 'expoAudioSound', AudioNS: ExpoAudio.Audio };
  }
  if (ExpoAudio?.AudioPlayer) {
    return { type: 'expoAudioPlayer', AudioNS: ExpoAudio };
  }
  return { type: 'none', AudioNS: null };
}

async function ensureLoaded(type) {
  const { type: impl, AudioNS } = getAudioImpl();
  if (!implChoice) {
    implChoice = impl;
    try { console.log('[sound] Using implementation:', implChoice); } catch {}
  }
  if (impl === 'none') throw new Error('No audio implementation available (expo-av or expo-audio)');
  if (cache[type]) return cache[type];

  if (impl === 'av' || impl === 'expoAudioSound') {
    const sound = new AudioNS.Sound();
    await sound.loadAsync(sources[type]);
    cache[type] = { impl, instance: sound };
    return cache[type];
  }

  if (impl === 'expoAudioPlayer') {
    const player = new AudioNS.AudioPlayer(sources[type]);
    await player.load();
    cache[type] = { impl, instance: player };
    return cache[type];
  }

  throw new Error('Unsupported audio implementation');
}

/**
 * Play a sound effect
 * @param {string} type - Sound type: move, capture, check, castle, promote, error, correct, wrong, gameEnd, notify
 * @returns {Promise<void>}
 */
export async function play(type) {
  if (!ENABLE_SOUNDS) return;

  const src = sources[type];
  if (!src) {
    console.warn(`Unknown sound type: ${type}`);
    return;
  }

  try {
    const { impl, instance } = await ensureLoaded(type);
    if (impl === 'av' || impl === 'expoAudioSound') {
      if (typeof instance.setVolumeAsync === 'function') {
        try { await instance.setVolumeAsync(volume); } catch {}
      }
      if (typeof instance.replayAsync === 'function') {
        await instance.replayAsync();
      } else {
        if (typeof instance.setPositionAsync === 'function') {
          try { await instance.setPositionAsync(0); } catch {}
        }
        if (typeof instance.playAsync === 'function') {
          await instance.playAsync();
        }
      }
      return;
    }

    if (impl === 'expoAudioPlayer') {
      // Best-effort volume if available
      if (typeof instance.setVolume === 'function') {
        try { instance.setVolume(volume); } catch {}
      }
      // Reset then play
      if ('currentTime' in instance) instance.currentTime = 0;
      await instance.play();
      return;
    }
  } catch (e) {
    console.warn(`Failed to play sound ${type}:`, e.message);
  }
}

/**
 * Preload all sounds for better performance
 */
export async function preloadSounds() {
  if (!ENABLE_SOUNDS) return;

  try {
    const soundTypes = Object.keys(sources);
    await Promise.all(
      soundTypes.map(async (type) => {
        try {
          await ensureLoaded(type);
        } catch (e) {
          console.warn(`Failed to preload sound ${type}`);
        }
      })
    );
    console.log('✅ All sounds preloaded');
  } catch (e) {
    console.warn('Failed to preload sounds:', e.message);
  }
}

/**
 * Enable or disable sounds
 */
export function setSoundsEnabled(enabled) {
  // This is a const, but we can add a mutable config in the future
  return ENABLE_SOUNDS;
}

/**
 * Set global volume (0..1)
 */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, Number(v) || 0));
}

/**
 * Get current volume
 */
export function getVolume() {
  return volume;
}

/**
 * Play appropriate sound for a chess move
 * - capture vs move
 * - optional delayed check sound
 */
export function playMoveSound(move) {
  if (!move) return;
  if (move.captured) {
    play('capture');
  } else {
    play('move');
  }
  if (move.san && (move.san.includes('+') || move.san.includes('#'))) {
    setTimeout(() => play('check'), CHECK_SOUND_DELAY);
  }
}

/**
 * Play illegal move sound (error feedback)
 */
export function playIllegalMoveSound() {
  play('illegal');
}

/**
 * Play completion sound for an exercise
 */
export function playCompletionSound(success = true) {
  play(success ? 'correct' : 'wrong');
}

/**
 * Queue sounds for sequential playback with optional per-item delays
 * sounds: array of sound type strings
 * delays: array of ms delays (same length or shorter)
 */
export function queueSounds(sounds = [], delays = []) {
  if (!Array.isArray(sounds) || sounds.length === 0) return;
  soundQueue.push(...sounds.map((s, i) => ({ sound: s, delay: delays[i] || 0 })));
  if (!isPlayingSequence) playQueuedSounds();
}

export function playQueuedSounds() {
  if (soundQueue.length === 0) {
    isPlayingSequence = false;
    return;
  }
  isPlayingSequence = true;
  const { sound, delay } = soundQueue.shift();
  setTimeout(() => {
    play(sound);
    playQueuedSounds();
  }, delay);
}

export function clearSoundQueue() {
  soundQueue = [];
  isPlayingSequence = false;
}
