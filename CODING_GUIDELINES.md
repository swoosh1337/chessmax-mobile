# ChessMaxx Coding Guidelines

This document outlines the coding standards and best practices for the ChessMaxx mobile app. **Always reference this before creating new code.**

## Table of Contents
1. [File Size Limits](#file-size-limits)
2. [Clean Code Principles](#clean-code-principles)
3. [Naming Conventions](#naming-conventions)
4. [Component Structure](#component-structure)
5. [Custom Hooks](#custom-hooks)
6. [Styling Guidelines](#styling-guidelines)
7. [TypeScript Standards](#typescript-standards)
8. [Testing Requirements](#testing-requirements)

---

## File Size Limits

**Maximum 700 lines per file.** This is a hard rule.

When a file exceeds 700 lines:
1. Extract reusable logic into custom hooks (`src/hooks/`)
2. Extract UI sections into separate components (`src/components/`)
3. Move styles to separate files if needed
4. Split large screens into sub-components

```
✅ Good: profile.tsx (599 lines)
❌ Bad: profile.tsx (978 lines)
```

---

## Clean Code Principles

### DRY (Don't Repeat Yourself)
- Extract repeated code into functions or hooks
- Create shared components for common UI patterns
- Use constants for repeated values

```typescript
// ❌ Bad
const timeout1 = setTimeout(() => {}, 5000);
const timeout2 = setTimeout(() => {}, 5000);

// ✅ Good
const TIMEOUT_MS = 5000;
const timeout1 = setTimeout(() => {}, TIMEOUT_MS);
const timeout2 = setTimeout(() => {}, TIMEOUT_MS);
```

### KISS (Keep It Simple, Stupid)
- Prefer simple solutions over clever ones
- Break complex functions into smaller, focused functions
- Avoid premature optimization
- Don't add features that aren't requested

### Single Responsibility
- Each function should do ONE thing
- Each component should have ONE purpose
- Each hook should manage ONE concern

```typescript
// ❌ Bad: Hook does too many things
function useEverything() {
  // handles auth, training, settings, etc.
}

// ✅ Good: Focused hooks
function useReminderSettings() { /* notification settings only */ }
function useStreakData() { /* streak data only */ }
function useTrainingPreferences() { /* training mode only */ }
```

---

## Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `StatBar.tsx`, `XPRewardModal.tsx` |
| Hooks | camelCase with `use` prefix | `usePathNodes.ts`, `useReminderSettings.ts` |
| Utilities | camelCase | `notifications.ts`, `storage.ts` |
| Services | camelCase | `userService.ts`, `streakService.ts` |
| Types | camelCase or PascalCase | `trainingModes.ts` |
| Tests | Same as file + `.test` | `usePathNodes.test.ts` |

### Variables and Functions
```typescript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_TIMEOUT_MS = 5000;

// Variables: camelCase
const userProfile = await fetchProfile();
const isLoading = true;

// Functions: camelCase, verb prefix
function fetchUserData() {}
function handleSubmit() {}
function calculateXP() {}

// Boolean variables: is/has/should prefix
const isLoading = true;
const hasPermission = false;
const shouldRefresh = true;

// Event handlers: handle prefix
const handlePress = () => {};
const handleTimeChange = () => {};
```

### Components
```typescript
// Props interface: ComponentNameProps
interface StatBarProps {
  xp: number;
  streak: number;
}

// Component: PascalCase
export default function StatBar({ xp, streak }: StatBarProps) {}
```

### Hooks
```typescript
// Hook name: useDescriptiveName
// Return type: UseHookNameResult
interface UseReminderSettingsResult {
  reminderEnabled: boolean;
  handleReminderToggle: (value: boolean) => void;
}

export function useReminderSettings(): UseReminderSettingsResult {}
```

---

## Component Structure

### Preferred Order
```typescript
// 1. Imports (grouped)
import React from 'react';                          // React
import { View, Text } from 'react-native';          // React Native
import { router } from 'expo-router';               // Expo
import { useAuth } from '@/src/context/AuthContext'; // Internal

// 2. Types/Interfaces
export interface MyComponentProps {
  title: string;
  onPress: () => void;
}

// 3. Component
export default function MyComponent({ title, onPress }: MyComponentProps) {
  // 3a. Hooks (always at top)
  const { user } = useAuth();
  const [state, setState] = useState();

  // 3b. Derived values
  const displayName = user?.name || 'Guest';

  // 3c. Effects
  useEffect(() => {}, []);

  // 3d. Handlers
  const handlePress = () => {};

  // 3e. Render
  return <View>...</View>;
}

// 4. Styles (at bottom)
const styles = StyleSheet.create({});
```

### Component Size Guidelines
- **Max 200 lines** for a simple component
- **Max 400 lines** for a complex component with styles
- If larger, extract into sub-components or hooks

---

## Custom Hooks

### When to Create a Hook
Create a custom hook when:
1. Logic is reused across multiple components
2. Component has complex state management (>3 useState calls)
3. Side effects need to be managed (API calls, subscriptions)
4. Logic can be tested independently

### Hook Structure
```typescript
// src/hooks/useMyHook.ts

import { useState, useEffect, useCallback } from 'react';

// 1. Options interface (if needed)
export interface UseMyHookOptions {
  enabled?: boolean;
  initialValue?: string;
}

// 2. Result interface (always define)
export interface UseMyHookResult {
  data: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

// 3. Hook implementation
export function useMyHook(options: UseMyHookOptions = {}): UseMyHookResult {
  const { enabled = true, initialValue = '' } = options;

  const [data, setData] = useState<string | null>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use useCallback for functions returned to consumers
  const refresh = useCallback(() => {
    // implementation
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // implementation
  }, [enabled]);

  return { data, isLoading, error, refresh };
}
```

### Hook Location
- **`src/hooks/`** - Reusable hooks
- **`src/context/`** - Context providers with hooks

---

## Styling Guidelines

### Use Theme Colors
Always use colors from `src/theme/colors.js`:

```typescript
import { colors } from '@/src/theme/colors';

// ✅ Good
backgroundColor: colors.card
borderColor: colors.border
color: colors.foreground

// ❌ Bad
backgroundColor: '#1a1a1a'
borderColor: '#333333'
color: '#ffffff'
```

### Available Colors
```javascript
colors.background     // #000000 - Pure black
colors.card          // #1a1a1a - Card backgrounds
colors.foreground    // #ffffff - Primary text
colors.textSubtle    // #999999 - Secondary text
colors.primary       // #fbbf24 - Gold/amber accent
colors.border        // #333333 - Borders
colors.destructive   // #ef4444 - Errors/danger
colors.success       // #10b981 - Success states
```

### Modal Styling Pattern
```typescript
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.card,      // Use colors.card, NOT cardBackground
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,        // Always add border
  },
});
```

### StyleSheet at Bottom
Always place `StyleSheet.create()` at the bottom of the file.

---

## TypeScript Standards

### Always Define Types
```typescript
// ❌ Bad
function calculateXP(level, bonus) {
  return level * 100 + bonus;
}

// ✅ Good
function calculateXP(level: number, bonus: number): number {
  return level * 100 + bonus;
}
```

### Interface vs Type
- Use `interface` for object shapes (props, options, results)
- Use `type` for unions, intersections, or simple aliases

```typescript
// Interface for objects
interface UserProfile {
  id: string;
  name: string;
}

// Type for unions
type TrainingMode = 'learn' | 'drill';

// Type for complex types
type AsyncResult<T> = { data: T | null; error: Error | null };
```

### Avoid `any`
```typescript
// ❌ Bad
function handleEvent(event: any) {}

// ✅ Good
function handleEvent(event: GestureResponderEvent) {}

// If truly unknown, use proper typing
function handleUnknown(value: unknown) {
  if (typeof value === 'string') {
    // now TypeScript knows it's a string
  }
}
```

---

## Testing Requirements

### Test File Location
```
src/hooks/useMyHook.ts      → __tests__/hooks/useMyHook.test.ts
src/components/MyComp.tsx   → __tests__/components/MyComp.test.tsx
src/services/myService.ts   → __tests__/services/myService.test.ts
```

### What to Test
1. **Hooks**: State changes, effects, returned functions
2. **Components**: Rendering, user interactions, props
3. **Services**: API calls, data transformations

### Test Structure
```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMyHook } from '@/src/hooks/useMyHook';

// Mock dependencies at top
jest.mock('@/src/services/api', () => ({
  fetchData: jest.fn(),
}));

describe('useMyHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.data).toBeNull();
  });

  it('should fetch data when enabled', async () => {
    const { result } = renderHook(() => useMyHook({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

---

## Quick Reference Checklist

Before creating new code, verify:

- [ ] File will stay under 700 lines
- [ ] Using theme colors from `colors.js`
- [ ] Following naming conventions
- [ ] Types are properly defined
- [ ] Single responsibility principle followed
- [ ] No code duplication (DRY)
- [ ] Solution is simple (KISS)
- [ ] Tests written for new hooks/components

---

## Examples of Good Code

### Good Hook
See: `src/hooks/useReminderSettings.ts` - Clean, focused, well-typed

### Good Component
See: `src/components/StatBar.tsx` - Simple, single purpose, uses theme colors

### Good Modal
See: `src/components/SubscriptionCard.tsx` - Proper styling with borders

---

*Last updated: January 2026*
