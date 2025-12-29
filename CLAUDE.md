# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChessMaxx is a React Native mobile app built with Expo that helps users learn chess openings through interactive training. The app features:
- Native OAuth authentication (Google/Apple Sign-In via Supabase)
- In-app purchases with 3-day free trial
- Real-time leaderboards with XP tracking
- Interactive chess training with opening variations
- Profile management with account deletion support

**Tech Stack:**
- React Native 0.81.5 + Expo SDK 54
- TypeScript + JavaScript (mixed codebase)
- Supabase for auth and database
- RevenueCat/Expo IAP for subscriptions
- expo-router for file-based navigation

## Development Commands

### Starting Development
```bash
npm install                 # Install dependencies
npm start                   # Start Expo dev server
npm run ios                 # Run on iOS simulator/device
npm run android             # Run on Android emulator/device
```

### Building and Linting
```bash
npm run lint                # Run ESLint
npx expo prebuild           # Generate native projects
npx expo prebuild --clean   # Clean rebuild (use after config changes)
```

### Running on Specific Platforms
```bash
# iOS
npm run ios                                    # Default simulator
npx expo run:ios --device                      # Physical device
npx expo run:ios --configuration Release       # Release build

# Android
npm run android                                # Default emulator
npx expo run:android --device                  # Physical device
npx expo run:android --variant release         # Release build
```

## Architecture Overview

### App Flow and Navigation

The app uses **expo-router** with file-based routing. The navigation flow is:

```
app/index.tsx                  → Entry point, checks auth/onboarding state
  ↓
app/auth.tsx                   → Sign-in screen (if not authenticated)
  ↓
app/onboarding.tsx             → First-time user onboarding
  ↓
app/paywall.tsx                → Subscription paywall (modal)
  ↓
app/(tabs)/_layout.tsx         → Main app with bottom tabs
  ├─ app/(tabs)/index.tsx      → Home/Training screen
  ├─ app/(tabs)/leaderboard.tsx → Leaderboards
  └─ app/(tabs)/profile.tsx    → User profile
  ↓
app/training.tsx               → Full-screen training session
```

**Key Routing Files:**
- `app/_layout.tsx` - Root layout with context providers and stack navigator
- `app/(tabs)/_layout.tsx` - Bottom tab navigation configuration
- All routes support TypeScript typed routes via `experiments.typedRoutes: true`

### Context Architecture

The app uses multiple React Contexts for global state management, nested in `app/_layout.tsx`:

```tsx
<AuthProvider>           // Authentication state (session, user)
  <SubscriptionProvider> // IAP status (isPremium, products)
    <TrainingProvider>   // Training sessions, calendar data
      <LeaderboardProvider> // XP, rankings, leaderboard data
```

**Context Files:**
- `src/context/AuthContext.js` - Manages Supabase auth, Google/Apple sign-in
- `src/context/SubscriptionContext.tsx` - Handles IAP, premium status
- `src/context/TrainingContext.tsx` - Training sessions, completions, calendar
- `src/context/LeaderboardContext.tsx` - XP system, leaderboard fetching

**Important:** Contexts are initialized on app load. `AuthContext` checks session from AsyncStorage first, then listens to `supabase.auth.onAuthStateChange()` for updates.

### Authentication System

**OAuth Flow:**
1. User taps "Sign in with Google/Apple" → Native auth dialog appears
2. On success → Supabase stores session with access_token + refresh_token
3. Tokens persisted to AsyncStorage for session restoration
4. AuthContext updates → triggers navigation to onboarding/paywall/main app

**Files:**
- `src/lib/supabase.ts` - Supabase client configuration with AsyncStorage
- `src/lib/googleAuth.ts` - Google Sign-In native implementation
- `src/lib/appleAuth.ts` - Apple Sign-In native implementation
- `src/utils/auth.ts` - Auth utilities (signOut, token handling)

**Important Implementation Details:**
- Access tokens expire after 1 hour, auto-refresh via refresh token
- AppState listener starts/stops auto-refresh (see `src/lib/supabase.ts:34`)
- Session persists across app restarts via AsyncStorage
- Guest mode supported (no authentication required for browsing)

See `AUTH_FLOW_EXPLANATION.md` for complete token lifecycle documentation.

### Subscription System

**Products:**
- Weekly with 3-day trial: `com.igrigolia.chessmaxmobile.weekly.trial`
- Yearly plan: `com.igrigolia.chessmaxmobile.yearly`

**Flow:**
1. User sees paywall → selects plan → taps "Try for Free" or "Subscribe"
2. Native App Store sheet opens → user confirms with biometrics
3. During trial (3 days) → full premium access, NO CHARGE
4. On day 4 → $0.99 charged, weekly billing starts
5. App checks subscription status via `InAppPurchases.getPurchaseHistoryAsync()`

**Files:**
- `src/context/SubscriptionContext.tsx` - IAP logic, subscription status
- `src/services/iap/` - IAP adapters (RevenueCat, StoreKit)
- `app/paywall.tsx` - Paywall UI and purchase flow

**Important:**
- Developer emails (in `SubscriptionContext.tsx:DEVELOPER_EMAILS`) get free premium access
- Subscription status checked on app launch and when app becomes active
- Apple manages trial period, billing, and cancellation - app only reads status

See `FREE_TRIAL_SUBSCRIPTION_EXPLAINED.md` for complete subscription documentation.

### Database Schema

**Supabase Tables:**
- `user_profiles` - User data (username, total_xp, weekly_xp, level)
- `variation_completions` - Training history (variation_id, xp_earned, errors, time)
- `training_sessions` - Daily training streaks and calendar data
- `speedrun_sessions` - Leaderboard speedrun times

**RLS Policies:**
- Profiles are publicly readable (for leaderboards)
- Users can only update their own profile
- Completions are user-specific (only owner can read/write)

See `LEADERBOARD_SETUP.md` and SQL migration files for schema details.

### API Integration

**Backend Communication:**
- `src/api/apiClient.js` - Axios client with auth token injection
- `src/api/chessApi.js` - Chess-related endpoints (openings, attempts, stats)
- `src/api/userApi.js` - User-related endpoints (profile updates)

**Key Endpoints:**
- `GET /Openings` - Fetch all chess openings
- `POST /pgn-attempt` - Submit variation attempt
- `GET /get-stats` - Get user statistics for opening
- `GET /recent-attempts` - Fetch recent attempt history

**Important:** API client automatically includes Supabase access_token via `setAuth()` in `AuthContext`.

### Chess Engine and Training

**Core Logic:**
- `src/logic/chessEngine.js` - Chess game logic using chess.js library
- `src/utils/pgnParser.js` - Parse PGN notation for openings
- `src/components/GraphicalBoard.js` - Interactive chessboard with drag-and-drop
- `src/components/TrainingControls.js` - Training UI (hints, next move, etc.)

**Training Flow:**
1. User selects opening from home screen
2. `app/training.tsx` loads variation and initializes chess engine
3. User makes moves via drag-and-drop on `GraphicalBoard`
4. Engine validates moves, provides hints, tracks errors
5. On completion → XP calculated, saved to database
6. TrainingContext updates calendar and session data

**XP Calculation:**
- Base XP varies by difficulty (beginner/intermediate/advanced)
- Penalties for errors and hints used
- Bonuses for perfect completions
- See `src/utils/xp.ts` for calculation logic

## Important Files and Their Purposes

### Configuration
- `app.json` - Expo app configuration (bundle IDs, plugins, schemes)
- `tsconfig.json` - TypeScript config with path aliases (`@/*`)
- `.env` - Environment variables (Supabase URL/keys, OAuth client IDs)
- `babel.config.js` - Babel configuration for Expo

### Key Components
- `src/components/GraphicalBoard.js` - Main chessboard component
- `src/components/CategorySection.js` - Opening categories on home screen
- `src/components/CompactOpeningCard.js` - Opening card UI
- `src/components/TrainingCalendar.tsx` - Calendar with training streak
- `src/components/TrainingStatistics.tsx` - Stats display

### Utilities
- `src/utils/storage.ts` - AsyncStorage helpers
- `src/utils/haptics.js` - Haptic feedback utilities
- `src/utils/soundPlayer.js` - Sound effects (move sounds)
- `src/utils/onboardingStorage.js` - Onboarding state persistence
- `src/theme/colors.js` - App color palette

### Assets
- `assets/images/` - App icons, logos, mascot images
- `assets/pieces/` - Chess piece SVGs (loaded via `src/assets/pieces/index.js`)

## Common Development Tasks

### Adding a New Context Provider

1. Create context file in `src/context/YourContext.tsx`:
```tsx
import { createContext, useContext, useState } from 'react';

const YourContext = createContext(null);

export const YourProvider = ({ children }) => {
  const [state, setState] = useState(null);
  return (
    <YourContext.Provider value={{ state, setState }}>
      {children}
    </YourContext.Provider>
  );
};

export const useYour = () => {
  const context = useContext(YourContext);
  if (!context) throw new Error('useYour must be used within YourProvider');
  return context;
};
```

2. Add to `app/_layout.tsx` provider chain (order matters for dependencies)

### Adding a New Route

1. Create file in `app/` directory (e.g., `app/new-screen.tsx`)
2. If using tabs, add to `app/(tabs)/`
3. Register in appropriate `_layout.tsx`:
```tsx
<Stack.Screen name="new-screen" options={{ headerShown: false }} />
```

### Working with Supabase

**Querying Data:**
```tsx
import { supabase } from '@/src/lib/supabase';

// Fetch data
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Insert data
const { error } = await supabase
  .from('variation_completions')
  .insert({ user_id: userId, xp_earned: 50 });

// Update data
const { error } = await supabase
  .from('user_profiles')
  .update({ total_xp: newXP })
  .eq('id', userId);
```

**Real-time Subscriptions:**
```tsx
const channel = supabase
  .channel('leaderboard-changes')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'user_profiles' },
    (payload) => console.log('Profile updated:', payload)
  )
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

### Testing Authentication Locally

**Using Expo Go (Limited):**
- Google Sign-In: Works in iOS simulator, requires real device for Android
- Apple Sign-In: NOT available in Expo Go, requires EAS Build

**Using Development Build:**
```bash
# Create development build
npx expo prebuild
npm run ios  # or npm run android

# Or use EAS Build
eas build --profile development --platform ios
```

**Environment Variables Required:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

See `SETUP_CHECKLIST.md` and `GOOGLE_SETUP.md`/`APPLE_SETUP.md` for complete setup.

### Testing In-App Purchases

**Sandbox Testing:**
1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Launch app, attempt purchase
4. Sign in with sandbox account when prompted
5. Trial period accelerated (3 minutes instead of 3 days)

**Important:**
- Sandbox accounts can only be used in development builds (not production)
- Use "Restore Purchases" to test restoration flow
- Check console for `[IAP]` logs to debug issues

See `REVENUECAT_TESTING.md` for RevenueCat integration details.

## Code Style and Conventions

### File Naming
- React components: PascalCase (e.g., `GraphicalBoard.js`, `TrainingContext.tsx`)
- Utilities: camelCase (e.g., `apiClient.js`, `haptics.js`)
- Routes: kebab-case or index.tsx (e.g., `app/training.tsx`, `app/(tabs)/index.tsx`)

### Import Aliases
- `@/` resolves to project root (configured in `tsconfig.json`)
- Example: `import { supabase } from '@/src/lib/supabase'`

### TypeScript/JavaScript Mix
- New code should use TypeScript (.tsx, .ts)
- Legacy code is JavaScript (.js) - can be migrated incrementally
- Contexts and utilities being migrated to TypeScript

### State Management Patterns
- Global state: Use Context API (already established pattern)
- Component state: Use `useState` for simple state, `useReducer` for complex state
- Async state: Use `useEffect` with cleanup for subscriptions
- Prefer custom hooks for reusable logic (e.g., `useColorScheme` in `hooks/`)

## Environment Setup

### Required Environment Variables (.env)
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google OAuth (Web Client ID from Google Cloud Console)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### Platform-Specific Files
- **iOS:** `GoogleService-Info.plist` in project root (for Google Sign-In)
- **Android:** SHA-1 fingerprint added to Google Console (for Google Sign-In)

### Apple Developer Setup
- Bundle ID: `com.igrigolia.chessmax-mobile`
- App Store Connect: Configure IAP products, sandbox testers
- See `APPLE_SETUP.md` for complete setup

## Debugging Tips

### Common Issues

**"No valid client ID" (Google Sign-In):**
- Check `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`
- Ensure it's the **Web Client ID**, not iOS or Android
- Restart Metro: `npx expo start --clear`

**"Session not found" (Auth issues):**
- Check Supabase URL and anon key
- Verify OAuth providers enabled in Supabase dashboard
- Check console for `[AuthContext]` logs

**"Purchase failed" (IAP issues):**
- Verify product IDs match App Store Connect exactly
- Check sandbox account is signed in (iOS Settings → App Store → Sandbox Account)
- Look for `[IAP]` console logs

**App crashes on startup:**
- Run `npx expo prebuild --clean` to rebuild native projects
- Check for missing dependencies: `npm install`
- Clear cache: `npx expo start --clear`

### Useful Console Logs
- `[AuthContext]` - Authentication events
- `[IAP]` - In-app purchase events
- `[Supabase]` - Database operations
- `[LeaderboardContext]` - XP and leaderboard updates

### Inspecting AsyncStorage (iOS Simulator)
```bash
xcrun simctl get_app_container booted com.igrigolia.chessmax-mobile data
cd Library/Preferences
cat * | grep -E "(auth-token|onboarding|paywall)"
```

## Documentation Files Reference

The repository contains extensive documentation:
- `AUTH_FLOW_EXPLANATION.md` - Complete auth token lifecycle
- `FREE_TRIAL_SUBSCRIPTION_EXPLAINED.md` - IAP and trial system
- `SETUP_CHECKLIST.md` - Initial setup guide
- `GOOGLE_SETUP.md` - Google OAuth configuration
- `APPLE_SETUP.md` - Apple Sign-In configuration
- `LEADERBOARD_SETUP.md` - Database schema and RLS policies
- `DELETE_ACCOUNT_SETUP.md` - Account deletion implementation
- `PRIVACY_POLICY.md` and `TERMS_OF_USE.txt` - Legal documents

**Always reference these docs when working on related features.**

## Release Process

### iOS Release
1. Update version in `app.json`
2. Build for App Store: `eas build --platform ios --profile production`
3. Submit to App Store Connect via EAS or manually
4. Fill out App Store listing, screenshots, privacy details
5. Submit for review

### Android Release
1. Update version in `app.json`
2. Build for Play Store: `eas build --platform android --profile production`
3. Upload AAB to Google Play Console
4. Fill out Play Store listing
5. Submit for review

### Pre-Release Checklist
- [ ] Test all auth flows (Google, Apple, Guest)
- [ ] Test IAP (trial, purchase, restore)
- [ ] Verify leaderboard updates
- [ ] Test account deletion
- [ ] Check privacy policy and terms are up to date
- [ ] Verify all environment variables are set correctly
- [ ] Test on physical devices (iOS and Android)

## Additional Notes

### Apple App Review Considerations
- Account deletion must be available in-app (implemented in profile screen)
- Privacy policy and terms must be accessible before sign-in
- IAP must clearly show trial duration and pricing
- See `APPLE_REVIEW_FIXES.md` for common rejection issues

### Performance Considerations
- Chess piece images are preloaded in `app/_layout.tsx`
- Use `expo-image` for optimized image loading
- Leaderboards cached and only refetch when app becomes active
- Training sessions saved to local storage before syncing to Supabase

### Security Notes
- Never commit `.env` file (already in `.gitignore`)
- API tokens stored in AsyncStorage (encrypted by OS)
- All Supabase queries protected by RLS policies
- OAuth handled by Supabase (no manual token management needed)
