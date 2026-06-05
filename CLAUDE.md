# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start Expo dev server (JS only, no native changes)
npx expo start

# Run on iOS simulator (recompiles native)
npx expo run:ios

# Open native iOS project (always use workspace, not .xcodeproj)
open ios/WorkoutTracker.xcworkspace

# Clear Metro cache
npx expo start --clear

# Reset node_modules
rm -rf node_modules && npm install
```

There are no linting or test scripts configured.

## Architecture

### React Native / Expo

The app is an Expo bare workflow (not managed) targeting iOS-first. `index.js` is the entry point → `App.js` wraps everything in `ThemeProvider` → `AppNavigator` sets up the tab navigator.

**Navigation**: `src/navigation/AppNavigator.js` uses `createMaterialTopTabNavigator` with a custom bottom tab bar (swipe between tabs is enabled). Four tabs: Home, Workouts, Progress, Profile.

**Screens** (`src/screens/`):
- `HomeScreen.js` — dashboard: streak, daily goal ring (SVG), trend chart, week stats, step counter (Pedometer), and live `HeartRateCard`
- `WorkoutsScreen.js` — session log with swipeable cards + inline `CalendarScreen` toggled by a header button; sets can be marked as warmup (W toggle, amber tint)
- `CalendarScreen.js` — month heatmap + day detail/edit panel; exercise categories from `src/constants/exercises.js`
- `ProgressScreen.js` — body metrics (weight/cals) and exercise strength charts; period tabs: Week/Month/Year/All/Custom; custom date range picker; Stats card (sessions, sets, PB, % change) with warmup toggle; tappable chart dots showing value tooltip; collapsible Recent Sessions filtered to selected period
- `ProfileScreen.js` — theme selector + Dev Tools (Seed / Clear test data)

**Data layer**: All persistence goes through `src/services/StorageService.js`, a singleton that wraps `AsyncStorage`. Five keys: `@workouts`, `@user_profile`, `@workout_history`, `@progress_data`, `@fitness_data`. No backend — everything is local.

**Key data shapes**:
- Workout template: `{ id, name, createdAt, ... }`
- Session (history entry): `{ id, name, completedAt (ISO string), duration (min), caloriesBurned, exercises: [{ name, sets: [{ reps, weight, warmup?: boolean, unit?: string }] }], notes }`
- Sessions are keyed by `completedAt.slice(0,10)` (YYYY-MM-DD) throughout the codebase for grouping and calendar display
- Body metrics stored in `@fitness_data` as `{ 'YYYY-MM-DD': { weight, caloriesBurned, caloriesConsumed, workouts } }`

**Theming**: `src/contexts/ThemeContext.js` provides `colors` and `changeTheme` via `useTheme()`. The default dark theme is hardcoded in `src/constants/colors.js` (`Colors`). Most screens import `Colors` directly rather than using `useTheme` — only `ProfileScreen` uses the context fully.

**Charts**: Custom SVG charts built with `react-native-svg` (no chart library). `HomeScreen` has the trend chart; `ProgressScreen` has per-metric charts. The shared `LineChartSVG` component in `ProgressScreen.js` supports tappable data points (tooltip rendered as an absolutely-positioned View to avoid SVG coordinate distortion).

**Test data**: `src/utils/seedTestData.js` exports `seedTestData()` (6 weeks of sessions + body metrics) and `clearTestData()`. Triggered from ProfileScreen Dev Tools.

### Apple Watch integration

The Watch receives heart rate via HealthKit during a workout and sends it to the iPhone via WatchConnectivity. The iPhone bridge forwards it to React Native as a JS event.

**Data flow**: `WatchWorkoutManager.swift` (watchOS) → `WCSession.sendMessage` → `WatchBridge.swift` (iOS, `RCTEventEmitter`) → `onHeartRateUpdate` event → `WatchHeartRateService.js` → `HeartRateCard.js`

**Native files**:
- `ios/WorkoutTrackerWatch/` — standalone watchOS app (SwiftUI). `WatchWorkoutManager` handles HKWorkoutSession + WatchConnectivity.
- `ios/WorkoutTracker/WatchBridge.swift` + `WatchBridge.m` — React Native native module registered as `WatchBridge`
- `src/services/WatchHeartRateService.js` — JS subscription layer (`subscribeToHeartRate`)
- `src/components/HeartRateCard.js` — animated BPM display with heart rate zone badge

Heart rate zones are computed at both ends independently using the same thresholds (60/70/80/90% of maxHR=190).

### iOS Xcode project

Use `ios/WorkoutTracker.xcworkspace` (CocoaPods workspace). The project has two targets:
- `WorkoutTracker` — iOS app (React Native + Expo)
- `WorkoutTrackerWatch` — watchOS companion app (product type: `com.apple.product-type.application`, SDKROOT: watchos)

The Watch target is a build dependency of the iOS target and is embedded via an "Embed Watch Content" copy files phase (`dstSubfolderSpec = 16`). Bundle IDs: `com.josiahjeevanraj.workouttracker` (iOS), `com.josiahjeevanraj.workouttracker.watchapp` (Watch). Team: `8QD7NVVZHL`.

**Important**: Do not run `expo prebuild` — it will overwrite the manually configured `ios/` directory and undo the Watch target setup.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

