# Migration Plan: ChessMaxx Mobile

## Phase 1: Core Setup (Test after each step)
1. ✅ Fresh scaffold created
2. ⏳ Install dependencies
3. ⏳ Create babel.config.js (disable Reanimated plugin)
4. ⏳ Create index.js entry point (switch from Expo Router)
5. ⏳ Copy theme/colors

## Phase 2: Core Logic (No UI yet)
6. ⏳ Copy chess engine
7. ⏳ Copy API client
8. ⏳ Copy utils

## Phase 3: Assets
9. ⏳ Copy chess piece images
10. ⏳ Copy sound files

## Phase 4: Basic Components
11. ⏳ Copy GraphicalBoard (without drag/drop first)
12. ⏳ Test board rendering

## Phase 5: Interactive Features
13. ⏳ Copy DraggablePiece
14. ⏳ Test drag and drop

## Phase 6: Screens (One at a time)
15. ⏳ Create basic App wrapper
16. ⏳ Create HomeScreen (minimal)
17. ⏳ Create TrainingScreen (with opening param) ← This is where error occurred
18. ⏳ Test opening parameter passing

## Testing Points
- After Phase 1: App should boot without "opening" error
- After Phase 2: API calls should work
- After Phase 4: Board should render
- After Phase 5: Pieces should be draggable
- After Phase 6: Navigation with opening param should work

## If Error Occurs
- We'll know exactly which file caused it
- Roll back that file and debug specifically
