# Workout Tracker — Documentation

---

## Non-Technical: App Modules & Features

This section describes what each part of the app does from a user perspective.

---

### Home (Dashboard)

The main screen you see when you open the app. It gives you an at-a-glance picture of your fitness day and recent trends.

**What it shows:**
- **Greeting & date** — your name and today's date at the top.
- **Today's summary card** — your current streak (consecutive workout days), a ring showing your daily goal completion percentage, and three counters: Calories burned, Active minutes, and Workouts completed.
- **Trend chart** — a chart that plots one of four metrics over time: Calories Burned, Body Weight, Workouts, or Duration. Use the pills below the chart to switch between them.
- **Period selector** — tabs (Week / Month / Year / All) that control what time range the chart covers.
- **This Week stats** — four summary cards showing Workouts, Total time, Average heart rate, and Training volume with comparison to the previous week.

---

### Workouts

A log of all your completed workout sessions, organised by day.

**What it shows:**
- **Summary bar** — total workouts, total time, and total calories for the period visible.
- **Day sections** — sessions grouped by date (e.g. "Today", "Yesterday"). Tap a section header to expand or collapse it. Each card shows the workout name, duration, exercise count, calories, and a **NEW PR** badge if your notes mention a personal record.
- **Session detail** — tap any session card to expand a list of every exercise performed, including sets, reps, and weight.

**What you can do:**
- **Log a Workout** — tap the floating "Log Workout" button (bottom right). Choose a category (Strength, Cardio, Flexibility, etc.), pick or search for a specific workout, set the duration, add notes, and save.
- **Delete a session** — swipe left on a session card (or use the delete option inside the detail view).

---

### Calendar

A monthly calendar that shows which days you trained and lets you add or edit the data for any day.

**What it shows:**
- **Heatmap calendar** — each day cell is colour-coded by workout intensity: light teal for a light session, bright teal for a hard one. Empty days are dark.
- **Day detail panel** — tap any day to see its logged data: calories consumed, calories burned, body weight, and the list of workouts performed.
- **Month navigation** — arrows at the top let you page backwards and forwards through months.

**What you can do:**
- **Edit a day** — tap a day, then tap the edit (pencil) icon. You can update calories consumed, calories burned, body weight, and add or remove workouts.
- **Add workouts to a day** — inside the edit view, tap "Add Workout" to open a searchable list of exercises grouped by category (Strength, Cardio, Flexibility, Sports, Recovery).

---

### Progress

Charts and session history for tracking how specific metrics improve over time.

**Two modes — toggle at the top:**

**Body Metrics mode**
Tracks weight, calories burned, and calories consumed. Use the pills to switch metric, and the Week / Month / Year / All tabs to change the time window. A trend badge shows whether you're up or down compared to the start of the period. Tap **Log Today's Data** to record a new reading.

**Exercise mode**
Tap "Select an exercise" to choose from Running, Cycling, Swimming, Bench Press, Squats, or Deadlifts. For cardio exercises (Running, Cycling, Swimming) you get a chart of Pace or Distance over time, plus a list of your five most recent sessions showing distance, duration, and pace. Strength exercise charting is coming soon.

---

### Profile

Your personal settings and account summary.

**What it shows:**
- **Identity card** — your avatar initials, name, member-since date, and three headline stats: total workouts logged, current streak, and personal records set.
- **Settings rows** — Edit Profile, Goals & Targets, Notifications, Units (metric/imperial), and Theme.

**What you can do:**
- **Switch theme** — tap Theme to choose from the available colour schemes (e.g. Ocean Blue, Sunset Orange).
- **Edit profile / goals / notifications / units** — these rows are wired up for future expansion; tapping them currently opens a placeholder.

---

---

## Technical: Architecture & Developer Guide

This section is for developers who need to understand, maintain, or extend the codebase.

---

### Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | React Native via Expo SDK | ~53 |
| Language | JavaScript (ES2022) | — |
| Navigation | React Navigation v6 (bottom tabs) | — |
| Local storage | `@react-native-async-storage/async-storage` | — |
| Charts | Custom SVG via `react-native-svg` | 15.12.1 |
| Icons | `@expo/vector-icons` (Ionicons) | — |
| Build / distribution | EAS Build + EAS Submit | — |

`react-native-chart-kit` remains in `package.json` but is no longer imported by any screen. It can be removed safely.

---

### Project Structure

```
WorkoutTracker/
├── App.js                    # Root: wraps ThemeProvider + AppNavigator
├── app.json                  # Expo config (name, bundle ID, icons, splash)
├── eas.json                  # EAS Build profiles (development / preview / production)
├── index.js                  # Expo entry point (registerRootComponent)
├── src/
│   ├── constants/
│   │   ├── colors.js         # Named export `Colors` — single source of truth for all tokens
│   │   └── themes.js         # Theme map (id → full colour set) consumed by ThemeContext
│   ├── contexts/
│   │   └── ThemeContext.js   # React context + provider for runtime theme switching
│   ├── hooks/                # (Currently contains a Jira status update utility — not used at runtime)
│   ├── navigation/
│   │   └── AppNavigator.js   # Bottom-tab navigator wiring all five screens
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── WorkoutsScreen.js
│   │   ├── CalendarScreen.js
│   │   ├── ProgressScreen.js
│   │   └── ProfileScreen.js
│   └── services/
│       └── StorageService.js # Singleton class wrapping AsyncStorage CRUD
└── redesign/                 # Static HTML/JSX side-by-side UI critique (not loaded by the app)
```

---

### Navigation

`AppNavigator.js` creates a single `createBottomTabNavigator` with five tabs. All screens are top-level — there is no stack navigator yet, so deep-linking and modal navigation within a tab are handled inside individual screen components via React Native `Modal`.

Tab order: Home → Workouts → Calendar → Progress → Profile.

Tab bar is styled to match the dark design system (`Colors.cardBackground` background, `Colors.primary` active tint).

---

### Design System

**`src/constants/colors.js`**

Exports a single named object `Colors` (also default-exported for legacy compatibility). All screens should import via the named export:

```js
import { Colors } from '../constants/colors';
```

Key tokens:

| Token | Value | Usage |
|---|---|---|
| `Colors.background` | `#111928` | Screen backgrounds |
| `Colors.cardBackground` | `#1F2937` | Card / modal surfaces |
| `Colors.borderColor` | `#374151` | Card borders, dividers |
| `Colors.text` | `#58D8DB` | Cyan accent — chart lines, active indicators |
| `Colors.primary` | `#283b89` | Dark blue — buttons, active tab |
| `Colors.gray` | `#6B7280` | Secondary text, inactive labels |
| `Colors.green` | `#34D399` | Positive trend indicators |
| `Colors.softRed` | `#F87171` | Negative trends, cardio category |
| `Colors.indigo` | `#6366F1` | Push/upper-body category |
| `Colors.amber` | `#FBBF24` | Core / consumed calories |
| `Colors.textSecondary` | `#B0BEC5` | Muted body text |

**Theme system (`ThemeContext` + `themes.js`)**

`ThemeProvider` (mounted in `App.js`) loads the user's saved theme from AsyncStorage key `selectedTheme` on mount. It exposes `{ colors, currentTheme, changeTheme, availableThemes }` via `useTheme()`. Only `ProfileScreen` currently consumes `useTheme`; all other screens reference `Colors` directly from `constants/colors.js`. If full theming is wanted across all screens, the other screens should be migrated to consume `colors` from `useTheme()`.

---

### Data Layer — `StorageService`

A singleton class (`src/services/StorageService.js`) that wraps `AsyncStorage`. All persistence goes through this service. AsyncStorage keys:

| Key | Data |
|---|---|
| `@workouts` | Array of workout template objects |
| `@workout_history` | Array of completed session objects |
| `@user_profile` | Single user profile object |
| `@progress_data` | `{ bodyMetrics: [...], exercises: { [name]: [...] } }` |

**Workout session shape** (written by `addWorkoutSession`):
```js
{
  id: string,           // Date.now().toString()
  name: string,
  duration: number,     // minutes
  exerciseCount: number,
  caloriesBurned: number,
  exercises: [{ name, sets, reps, weight }],
  notes: string,
  completedAt: string,  // ISO 8601
}
```

**Body metric shape** (written by ProgressScreen log modal):
```js
{
  date: string,             // ISO 8601
  weight?: number,
  caloriesBurned?: number,
  caloriesConsumed?: number,
}
```

All methods are `async` and return `null` / `false` / `{}` on error rather than throwing, so callers should handle falsy returns.

---

### Screen-by-Screen Notes

**`HomeScreen.js`**

Pure presentational — all data is hardcoded sample data. Uses `react-native-svg` for the `ActivityRing` (donut progress ring) and `AreaChart` (gradient-fill area chart) components defined in the same file. Both are stateless functional components.

State: `selectedMetric` (string), `timePeriod` (string).

**`WorkoutsScreen.js`**

The most stateful screen. Reads and writes workout history via `StorageService`. Uses `SectionList` to group sessions by day. The log-workout flow is a multi-step modal (category → workout selection → duration/notes → save). Default session data is seeded on first load if storage is empty.

Key helpers: `daysAgo(n)` builds ISO timestamps for seeding; `CATEGORIES` array defines the exercise taxonomy used in the picker.

**`CalendarScreen.js`**

Manages a `workoutData` map keyed by `YYYY-MM-DD` strings. The calendar grid is built by `buildGrid(year, month)` which pads the first row with `null` cells for the day-of-week offset. Workout intensity level (1–4) is derived from the number of workouts logged on a day and mapped to opacity via `heatColor(level)`. Category colours for workout type badges are derived from `getWorkoutColor(name)` using keyword matching.

**`ProgressScreen.js`**

Reads body metrics and exercise sessions from `StorageService`. Chart data is computed on-render by `getBodyChartData()` / `getExerciseChartData()` — these filter `bodyData` / `exerciseData` state based on `timeView` and the current offset (week/month/year). The `LineChartSVG` component (defined in the same file) renders via `react-native-svg`; it breaks the data into continuous segments, skipping zero values, so gaps in the log don't produce misleading zero-dips.

**`ProfileScreen.js`**

Consumes `useTheme()`. The theme picker modal maps `availableThemes` from the context. All settings rows other than Theme are non-functional placeholders.

---

### Adding a New Screen

1. Create `src/screens/YourScreen.js`.
2. Import it in `src/navigation/AppNavigator.js` and add a `<Tab.Screen>` entry.
3. Add a corresponding `Ionicons` icon name to the `tabBarIcon` switch in `AppNavigator`.

---

### Running Locally

```bash
npm install
npx expo start        # opens Expo DevTools
# press 'i' for iOS simulator, 'a' for Android emulator
```

Clear Metro cache if you see stale bundle errors:
```bash
npx expo start --clear
```

### Building for Distribution

```bash
# iOS (requires Apple Developer account)
eas build --platform ios
eas submit -p ios

# Android (requires Google Play account)
eas build --platform android
eas submit -p android
```

OTA update (no store review required for JS-only changes):
```bash
eas update --branch production
```

---

## Context

A running log of significant changes made to the project. Update this section whenever a meaningful feature, refactor, or architectural decision is made.

---

### 2026-05-13 — ProgressScreen redesign

**What changed:**
- Replaced `react-native-chart-kit` `LineChart` with a custom `LineChartSVG` component built on `react-native-svg`, consistent with the SVG chart pattern used in `HomeScreen`.
- Chart handles sparse data correctly — days with no logged value render as gaps rather than zero-dips.
- Per-metric colour coding: cyan (`Colors.text`) for Body Weight, red (`Colors.softRed`) for Calories Burned, amber (`Colors.amber`) for Calories Consumed, and matching colours for cardio metrics.
- Header layout updated to match other screens (title left, Body / Exercise toggle right).
- Period tabs (`Week / Month / Year / All`) now use the same pill design as `HomeScreen`.
- Period navigation chevrons changed from `#007AFF` iOS blue to `Colors.text` (cyan) to match the design system.
- Metric value labels changed from `Colors.primary` (dark navy — illegible on dark background) to `#FFFFFF`.
- Modals converted to bottom-sheet style with drag handle, matching `WorkoutsScreen`.
- Exercise picker now shows a colour-coded icon per exercise type.
- Session cards show friendly dates (e.g. "Mon, Apr 7") instead of raw ISO strings.
- Added proper empty states (icon + message) for no-data periods and the strength placeholder.

**Why:** `ProgressScreen` was the last screen still using the old UI library and styling conventions. This brings it in line with the redesigned Home, Workouts, Calendar, and Profile screens.

---

### 2026-05-13 — DOCS.md created

Initial documentation written covering:
- Non-technical module descriptions for all five screens.
- Technical reference: tech stack, project structure, navigation, design system tokens, theme system, StorageService API with data shapes, per-screen developer notes, and build/run commands.
