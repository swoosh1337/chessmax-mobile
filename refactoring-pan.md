# ChessMaxx Mobile - Refactoring Plan

> **Based on:** hamaki-mobile clean architecture patterns
> **Approach:** Phase by phase, with tests for each phase
> **TypeScript:** Convert only files we touch

---

## Summary of Issues Found

| Issue | Severity | Impact |
|-------|----------|--------|
| `app/training.tsx` - 2088 lines | CRITICAL | Unmaintainable, untestable |
| `app/(tabs)/index.tsx` - 1700 lines | CRITICAL | Mixed concerns, hard to modify |
| `app/profile.tsx` - 1042 lines | CRITICAL | Business logic in UI |
| No services layer | CRITICAL | Direct DB calls in components |
| No custom hooks | HIGH | Logic not reusable |
| 220 console.log calls | HIGH | No proper logging |
| No tests | CRITICAL | Zero coverage |
| 37.7 MB images (PNG) | HIGH | ~22 MB savings with WebP |
| Mixed JS/TS (49%) | MEDIUM | Inconsistent typing |

---

## Phase 1: Foundation

**Goal:** Establish patterns for types, logging, and constants

### Step 1.1: Create Types Directory

**Create:** `src/types/`

| File | Contents |
|------|----------|
| `src/types/user.ts` | UserProfile, AuthState, XPStats |
| `src/types/training.ts` | TrainingSession, VariationCompletion, Streak |
| `src/types/opening.ts` | Opening, Variation, Category, PGN |
| `src/types/leaderboard.ts` | LeaderboardEntry, RankingPeriod |
| `src/types/api.ts` | ApiResponse, ApiError |
| `src/types/index.ts` | Barrel exports |

**Tests to write:**
- `__tests__/types/typeGuards.test.ts` - Type guard functions

---

### Step 1.2: Create Logger Utility

**Create:** `src/utils/logger.ts`

```typescript
// Logger with levels: debug, info, warn, error
// Environment-aware: verbose in __DEV__, quiet in production
// Structured: log(message, data) format
```

**Replace in these files (220 calls total):**
- `src/api/apiClient.js` - 5 calls
- `src/components/GraphicalBoard.js` - 4 calls
- `app/training.tsx` - 15+ calls
- `src/context/AuthContext.js` - 10+ calls
- `src/context/LeaderboardContext.tsx` - 8 calls
- All other files with console.log

**Tests to write:**
- `__tests__/utils/logger.test.ts`
  - Test debug only logs in dev
  - Test error always logs
  - Test structured data formatting

---

### Step 1.3: Expand Constants

**Create/Update:**

| File | Contents |
|------|----------|
| `src/constants/colors.ts` | Move from theme/colors.js, add more tokens |
| `src/constants/spacing.ts` | xs, sm, md, lg, xl, xxl values |
| `src/constants/typography.ts` | Font sizes, families, weights |
| `src/constants/api.ts` | API base URLs, endpoints |
| `src/constants/index.ts` | Barrel exports |

**Tests to write:**
- `__tests__/constants/colors.test.ts` - Verify color values exist

---

## Phase 2: Services Layer

**Goal:** Extract all data access from components into testable services

### Step 2.1: Create Supabase Client Service

**Create:** `src/services/supabase/client.ts`

- Move from `src/lib/supabase.ts`
- Add proper TypeScript types
- Export singleton client

**Tests to write:**
- `__tests__/services/supabase/client.test.ts`
  - Test client initialization
  - Test auth helpers

---

### Step 2.2: Create User Service

**Create:** `src/services/supabase/userService.ts`

**Methods:**
```typescript
getUserProfile(userId: string): Promise<UserProfile>
updateUsername(userId: string, username: string): Promise<void>
getXPStats(userId: string): Promise<XPStats>
updateXP(userId: string, xpEarned: number): Promise<void>
```

**Extract from:**
- `app/profile.tsx` lines 94-132 (profile loading)
- `app/profile.tsx` lines 135-173 (username update)
- `src/context/LeaderboardContext.tsx` (XP updates)

**Tests to write:**
- `__tests__/services/supabase/userService.test.ts`
  - Test getUserProfile success/error
  - Test updateUsername validation
  - Test getXPStats caching behavior
  - Test updateXP increments correctly

---

### Step 2.3: Create Training Service

**Create:** `src/services/supabase/trainingService.ts`

**Methods:**
```typescript
getCompletedVariations(userId: string): Promise<string[]>
recordCompletion(userId: string, variationId: string, result: CompletionResult): Promise<void>
getStreakData(userId: string): Promise<StreakData>
getCalendarData(userId: string, month: number, year: number): Promise<CalendarData>
getRecentAttempts(userId: string, openingId: string): Promise<Attempt[]>
```

**Extract from:**
- `app/training.tsx` lines 113-155 (completed variations)
- `app/training.tsx` lines 157-195 (streak data)
- `src/context/TrainingContext.tsx` (completion recording)

**Tests to write:**
- `__tests__/services/supabase/trainingService.test.ts`
  - Test getCompletedVariations returns array
  - Test recordCompletion creates entry
  - Test getStreakData calculates correctly
  - Test getCalendarData filters by date

---

### Step 2.4: Create Leaderboard Service

**Create:** `src/services/supabase/leaderboardService.ts`

**Methods:**
```typescript
getWeeklyLeaderboard(limit?: number): Promise<LeaderboardEntry[]>
getAllTimeLeaderboard(limit?: number): Promise<LeaderboardEntry[]>
getUserRank(userId: string, period: 'weekly' | 'allTime'): Promise<number>
subscribeToLeaderboard(callback: (data: LeaderboardEntry[]) => void): () => void
```

**Extract from:**
- `src/context/LeaderboardContext.tsx` lines 54-100 (RPC calls)
- `app/leaderboard.tsx` (direct queries)

**Tests to write:**
- `__tests__/services/supabase/leaderboardService.test.ts`
  - Test getWeeklyLeaderboard sorts correctly
  - Test getAllTimeLeaderboard limits results
  - Test getUserRank returns correct position
  - Test subscription cleanup

---

### Step 2.5: Migrate API Layer

**Convert:** `src/api/` → `src/services/api/`

| From | To |
|------|-----|
| `src/api/apiClient.js` | `src/services/api/apiClient.ts` |
| `src/api/chessApi.js` | `src/services/api/chessApi.ts` |
| `src/api/userApi.js` | `src/services/api/userApi.ts` |

**Changes:**
- Add TypeScript types for all responses
- Use logger instead of console.log
- Add proper error handling

**Tests to write:**
- `__tests__/services/api/chessApi.test.ts`
  - Test getOpenings returns typed array
  - Test error handling on network failure

---

## Phase 3: Custom Hooks

**Goal:** Extract business logic from screens into reusable hooks

### Step 3.1: Create useTrainingSession Hook

**Create:** `src/hooks/useTrainingSession.ts`

**Provides:**
```typescript
interface UseTrainingSessionReturn {
  currentOpening: Opening | null;
  currentVariation: Variation | null;
  moveIndex: number;
  isComplete: boolean;
  startSession: (opening: Opening, variation: Variation) => void;
  makeMove: (move: string) => boolean;
  reset: () => void;
  getHint: () => string | null;
}
```

**Extract from:** `app/training.tsx` (training state management)

**Tests to write:**
- `__tests__/hooks/useTrainingSession.test.ts`
  - Test session initialization
  - Test move validation
  - Test completion detection
  - Test hint generation

---

### Step 3.2: Create useVariationCompletion Hook

**Create:** `src/hooks/useVariationCompletion.ts`

**Provides:**
```typescript
interface UseVariationCompletionReturn {
  completedVariations: Set<string>;
  isLoading: boolean;
  markComplete: (variationId: string) => Promise<void>;
  isCompleted: (variationId: string) => boolean;
  refetch: () => Promise<void>;
}
```

**Extract from:** `app/training.tsx` lines 113-155

**Tests to write:**
- `__tests__/hooks/useVariationCompletion.test.ts`
  - Test initial fetch
  - Test markComplete updates state
  - Test isCompleted returns correctly

---

### Step 3.3: Create useStreakTracking Hook

**Create:** `src/hooks/useStreakTracking.ts`

**Provides:**
```typescript
interface UseStreakTrackingReturn {
  currentStreak: number;
  longestStreak: number;
  calendarData: CalendarDay[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}
```

**Extract from:** `app/training.tsx` lines 157-195

**Tests to write:**
- `__tests__/hooks/useStreakTracking.test.ts`
  - Test streak calculation
  - Test calendar data formatting

---

### Step 3.4: Create useUserProfile Hook

**Create:** `src/hooks/useUserProfile.ts`

**Provides:**
```typescript
interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  updateUsername: (username: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}
```

**Extract from:** `app/profile.tsx` lines 94-173

**Tests to write:**
- `__tests__/hooks/useUserProfile.test.ts`
  - Test profile loading
  - Test username update
  - Test error handling

---

### Step 3.5: Create useLeaderboard Hook

**Create:** `src/hooks/useLeaderboard.ts`

**Provides:**
```typescript
interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
  userRank: number | null;
  period: 'weekly' | 'allTime';
  setPeriod: (period: 'weekly' | 'allTime') => void;
  refetch: () => Promise<void>;
}
```

**Extract from:** `src/context/LeaderboardContext.tsx`

**Tests to write:**
- `__tests__/hooks/useLeaderboard.test.ts`
  - Test period switching
  - Test data fetching
  - Test user rank calculation

---

### Step 3.6: Create useOpeningsData Hook

**Create:** `src/hooks/useOpeningsData.ts`

**Provides:**
```typescript
interface UseOpeningsDataReturn {
  openings: Opening[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  getOpeningsByCategory: (categoryId: string) => Opening[];
  refetch: () => Promise<void>;
}
```

**Extract from:** `app/(tabs)/index.tsx` lines 248+

**Tests to write:**
- `__tests__/hooks/useOpeningsData.test.ts`
  - Test openings loading
  - Test category grouping
  - Test caching behavior

---

## Phase 4: Screen Refactoring

**Goal:** Slim down screens to <300 lines using hooks and services

### Step 4.1: Refactor training.tsx

**Current:** 2088 lines
**Target:** ~300 lines

**Changes:**
1. Replace direct Supabase calls with services
2. Replace state management with hooks:
   - `useTrainingSession` for game state
   - `useVariationCompletion` for completions
   - `useStreakTracking` for streaks
3. Extract inline components
4. Use logger instead of console.log

**Tests to write:**
- `__tests__/screens/training.test.tsx`
  - Test training flow renders
  - Test mode switching
  - Test completion triggers modal

---

### Step 4.2: Refactor index.tsx (Home)

**Current:** 1700 lines
**Target:** ~250 lines

**Changes:**
1. Extract path animation to `components/home/PathView.tsx`
2. Extract chest rewards to `components/home/ChestReward.tsx`
3. Use `useOpeningsData` hook
4. Simplify category rendering

**Tests to write:**
- `__tests__/screens/home.test.tsx`
  - Test openings display
  - Test category filtering
  - Test navigation to training

---

### Step 4.3: Refactor profile.tsx

**Current:** 1042 lines
**Target:** ~200 lines

**Changes:**
1. Use `useUserProfile` hook
2. Extract reminder settings to `components/profile/ReminderSettings.tsx`
3. Extract stats display to `components/profile/ProfileStats.tsx`
4. Use services for all data operations

**Tests to write:**
- `__tests__/screens/profile.test.tsx`
  - Test profile display
  - Test username edit
  - Test logout flow

---

### Step 4.4: Refactor Context Files

**LeaderboardContext.tsx (385 → ~100 lines):**
1. Move RPC calls to `leaderboardService`
2. Keep only React context state
3. Use `useLeaderboard` hook internally

**TrainingContext.tsx:**
1. Move data calls to `trainingService`
2. Simplify to pure state management

**Tests to write:**
- `__tests__/context/LeaderboardContext.test.tsx`
- `__tests__/context/TrainingContext.test.tsx`

---

## Phase 5: Component Extraction

**Goal:** Break large components into focused, testable units

### Step 5.1: Split CompletionModal.js (676 lines)

**Create:** `src/components/completion/`

| File | Lines | Purpose |
|------|-------|---------|
| `CompletionModal.tsx` | ~150 | Main modal orchestration |
| `ConfettiAnimation.tsx` | ~100 | Confetti particle effect |
| `StreakDisplay.tsx` | ~80 | Current/longest streak |
| `XPEarnedDisplay.tsx` | ~80 | XP animation |
| `index.ts` | ~10 | Barrel exports |

**Tests to write:**
- `__tests__/components/completion/CompletionModal.test.tsx`
- `__tests__/components/completion/StreakDisplay.test.tsx`

---

### Step 5.2: Create Home Screen Components

**Create:** `src/components/home/`

| File | Purpose |
|------|---------|
| `PathView.tsx` | SVG path with animation |
| `ChestReward.tsx` | Chest unlock animation |
| `CategoryList.tsx` | Opening categories |
| `index.ts` | Barrel exports |

**Tests to write:**
- `__tests__/components/home/PathView.test.tsx`
- `__tests__/components/home/CategoryList.test.tsx`

---

### Step 5.3: Create UI Components

**Create:** `src/components/ui/`

| File | Purpose |
|------|---------|
| `LoadingSpinner.tsx` | Reusable loading indicator |
| `NetworkError.tsx` | Error with retry button |
| `SkeletonLoader.tsx` | Content placeholder |
| `ErrorBoundary.tsx` | React error boundary |
| `index.ts` | Barrel exports |

**Tests to write:**
- `__tests__/components/ui/NetworkError.test.tsx`
- `__tests__/components/ui/ErrorBoundary.test.tsx`

---

## Phase 6: Image Optimization

**Goal:** Convert PNGs to WebP, reduce app size by ~22 MB

### Step 6.1: Convert UI Icons (25 MB → ~8 MB)

**Convert:** `assets/new-icons/`

| Before | After |
|--------|-------|
| `icon_pawn.png` (2.1 MB) | `icon_pawn.webp` (~600 KB) |
| `icon_pawn_black.png` (2.3 MB) | `icon_pawn_black.webp` |
| `icon_knight.png` (2.2 MB) | `icon_knight.webp` |
| `icon_queen.png` (2.3 MB) | `icon_queen.webp` |
| `icon_rook.png` (2.3 MB) | `icon_rook.webp` |
| `icon_king.png` (2.2 MB) | `icon_king.webp` |
| `icon_chest.png` (2.4 MB) | `icon_chest.webp` |
| `icon_chest_locked.png` (2.3 MB) | `icon_chest_locked.webp` |
| `icon_star.png` (2.2 MB) | `icon_star.webp` |
| `flame icon.png` (2.0 MB) | `flame_icon.webp` |

---

### Step 6.2: Convert Mascot Images (9.2 MB → ~3 MB)

**Convert:** `assets/mascot/`

| Before | After |
|--------|-------|
| `turtle_holding_board.png` (2.1 MB) | `turtle_holding_board.webp` |
| `turtle_thinking.png` (1.8 MB) | `turtle_thinking.webp` |
| `turtle_sleeping.png` (1.8 MB) | `turtle_sleeping.webp` |
| `turtle_playing_chess.png` (1.8 MB) | `turtle_playing_chess.webp` |
| `turtle_sitting.png` (1.6 MB) | `turtle_sitting.webp` |

---

### Step 6.3: Convert App Images (3.5 MB → ~1.5 MB)

**Convert:** `assets/images/`

| Before | After |
|--------|-------|
| `icon.png` (1.1 MB) | `icon.webp` |
| `logo_transparent.png` (1.2 MB) | `logo_transparent.webp` |
| `icon copy.png` | DELETE (duplicate) |

**Update:** `app.json` with new paths

---

### Step 6.4: Create Asset Registry

**Create:** `src/assets/registry.ts`

```typescript
export const ICONS = {
  pawn: require('../../assets/new-icons/icon_pawn.webp'),
  knight: require('../../assets/new-icons/icon_knight.webp'),
  // ...
};

export const MASCOTS = {
  thinking: require('../../assets/mascot/turtle_thinking.webp'),
  // ...
};
```

**Update imports in:**
- `app/(tabs)/index.tsx` - Use registry instead of inline requires

---

## Phase 7: Testing Infrastructure

**Goal:** Set up Jest and add tests for all new code

### Step 7.1: Setup Jest

**Install:**
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo
```

**Create:** `jest.config.js`, `jest.setup.js`

**Configure:** Transform for TypeScript, mock setup

---

### Step 7.2: Create Test Utilities

**Create:** `__tests__/__helpers__/`

| File | Purpose |
|------|---------|
| `testUtils.tsx` | Render with providers |
| `mocks/supabase.ts` | Supabase client mock |
| `mocks/navigation.ts` | Navigation mock |
| `fixtures/users.ts` | Test user data |
| `fixtures/openings.ts` | Test opening data |

---

### Step 7.3: Test Coverage Targets

| Category | Target | Priority |
|----------|--------|----------|
| Services | 90% | HIGH |
| Hooks | 85% | HIGH |
| Utils | 95% | HIGH |
| Components | 70% | MEDIUM |
| Screens | 60% | MEDIUM |

---

## Execution Checklist

### Phase 1: Foundation
- [ ] Create `src/types/` directory and all type files
- [ ] Create `src/utils/logger.ts`
- [ ] Replace all console.log calls (220 total)
- [ ] Create `src/constants/` files
- [ ] Write Phase 1 tests

### Phase 2: Services Layer
- [ ] Create `src/services/supabase/client.ts`
- [ ] Create `src/services/supabase/userService.ts`
- [ ] Create `src/services/supabase/trainingService.ts`
- [ ] Create `src/services/supabase/leaderboardService.ts`
- [ ] Migrate `src/api/` to `src/services/api/`
- [ ] Write Phase 2 tests

### Phase 3: Custom Hooks
- [ ] Create `useTrainingSession` hook
- [ ] Create `useVariationCompletion` hook
- [ ] Create `useStreakTracking` hook
- [ ] Create `useUserProfile` hook
- [ ] Create `useLeaderboard` hook
- [ ] Create `useOpeningsData` hook
- [ ] Write Phase 3 tests

### Phase 4: Screen Refactoring
- [ ] Refactor `app/training.tsx` (2088 → ~300 lines)
- [ ] Refactor `app/(tabs)/index.tsx` (1700 → ~250 lines)
- [ ] Refactor `app/profile.tsx` (1042 → ~200 lines)
- [ ] Refactor context files
- [ ] Write Phase 4 tests

### Phase 5: Component Extraction
- [ ] Split `CompletionModal.js` into components
- [ ] Create home screen components
- [ ] Create UI components
- [ ] Convert touched JS files to TypeScript
- [ ] Write Phase 5 tests

### Phase 6: Image Optimization
- [ ] Convert `assets/new-icons/` to WebP
- [ ] Convert `assets/mascot/` to WebP
- [ ] Convert `assets/images/` to WebP
- [ ] Delete duplicate files
- [ ] Create asset registry
- [ ] Update app.json

### Phase 7: Testing Infrastructure
- [ ] Setup Jest configuration
- [ ] Create test utilities and mocks
- [ ] Achieve coverage targets

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Largest screen | 2088 lines | ~300 lines |
| Custom hooks | 3 | 15+ |
| Services | 0 | 5+ |
| Console.log | 220 | 0 |
| Test coverage | 0% | 70%+ |
| App image size | 37.7 MB | ~15 MB |
| TypeScript | 49% | 80%+ |
