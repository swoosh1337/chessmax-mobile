Add optional MP3 sounds here:

- move.mp3 — normal move
- capture.mp3 — capture
- check.mp3 — check or checkmate

Then edit `src/utils/soundPlayer.js`:
- Set `ENABLE_SOUNDS = true`
- Point `sources` to `require('../../assets/sounds/move.mp3')` etc.

