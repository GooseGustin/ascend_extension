# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ascend** is a gamified productivity application that transforms goals into RPG-style "quests" with XP, levels, and AI-powered coaching. The app features offline-first architecture, focus sessions (Pomodoro), and an AI "Grandmaster" service for intelligent quest validation.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (port 3000)
npm run dev

# Build main application
npm run build

# Build background worker for browser extension
npm run build:worker

# Build extension worker (TypeScript compilation only)
npm run build:ext-worker
```

## Architecture Overview

### Worker-Based Offline-First Pattern

The application separates UI (React components) from business logic (worker services) with IndexedDB as the local-first data store. All mutations save locally first, then queue for remote sync.

**Key Layers:**
- **UI Layer**: `App.tsx` orchestrates state and renders conditional panels (Home, Quests, Progress, Settings)
- **Service Layer**: `src/worker/services/` contains all business logic (QuestService, SessionService, GMService, etc.)
- **Data Layer**: IndexedDB (`AscendDB` v6) with Dexie ORM wrapper
- **Sync Layer**: Background queue processor handles offline/online transitions

### Critical Architecture Files

- `src/App.tsx` - Main orchestrator, holds master state, passes callbacks to child components
- `src/worker/db/indexed-db.ts` - Database schema and queries
- `src/worker/services/quest.service.ts` - Quest CRUD, GM integration
- `src/worker/services/gm/gm.service.ts` - AI validation orchestration
- `src/worker/services/session.service.ts` - Focus sessions, XP calculation
- `src/worker/worker.ts` - Background worker entry point
- `build-worker.js` - Custom esbuild script for extension bundle

## Data Flow Pattern

All mutations follow this pattern:

```typescript
// 1. Optimistic UI update
setState(prevState => /* updated state */);

// 2. Call service method
const result = await service.someMethod(userId, data);

// 3. Service saves to IndexedDB
await this.db.tableName.put(data);

// 4. Queue sync operation
await this.db.queueSync({
  operation: 'update',
  collection: 'tableName',
  documentId: data.id,
  priority: 7,
  userId: userId,
  retries: 0,
  error: null
});

// 5. Reload data to reflect changes
await loadAllData(userId);

// 6. On error, revert optimistic update
catch (error) {
  await loadOriginalData(userId);
}
```

### Service Instantiation

Services use **singleton pattern** where appropriate:

```typescript
// Singleton services (shared state)
let _taskServiceInstance: TaskService | null = null;
export function getTaskService(): TaskService {
  if (!_taskServiceInstance) _taskServiceInstance = new TaskService();
  return _taskServiceInstance;
}

// Per-component services (stateless operations)
const authService = new AuthService();
const questService = new QuestService();
```

Services receive dependencies via constructor injection:

```typescript
constructor(analyticsService: AnalyticsService, questService: IQuestService) {
  this.analyticsService = analyticsService;
  this.questService = questService;
}
```

## IndexedDB Schema (AscendDB v6)

Key tables and indexes:

```typescript
users: "userId, username, totalLevel"
quests: "questId, ownerId, type, isPublic, isCompleted, registeredAt, [ownerId+isCompleted]"
sessions: "sessionId, userId, questId, startTime, status, sessionType, [userId+startTime]"
taskOrders: "&id, userId, date, questId, [userId+date], [userId+date+questId]"
syncQueue: "id, userId, timestamp, priority, [priority+timestamp]"
agentStates: "userId, lastObservationTimestamp"
notifications: "id, userId, isRead, createdAt, [userId+isRead]"
settings: "userId, lastModified"
```

**Composite indexes** optimize common queries like "get user's incomplete quests" or "get today's sessions for user".

## GM (Grandmaster) AI Service

The GM service provides intelligent quest difficulty validation with offline fallback:

### Three-Layer Validation

1. **Queue Layer** (`queueValidation`): Offloads validation to sync queue
2. **Remote Layer** (`validateQuestRemote`): Calls backend AI API when online
3. **Local Layer** (`runValidationPipelineLocal`): Mock reasoning when offline

### Validation Triggers

Quest validation is automatically queued when:
- User assigns or changes difficulty
- User modifies title, description, or time estimate
- Subtasks are added/removed

### GM Lock Mechanism

Once validated, the GM "locks" difficulty to prevent user modification:

```typescript
if (isDifficultyBeingModified && quest.difficulty.isLocked) {
  throw new Error("GM Lock active: Difficulty cannot be modified.");
}
```

To unlock, user must request re-validation (triggers new queue operation).

### Validation Context

GM receives performance metrics for personalized validation:

```typescript
interface GMValidationContext {
  userId: string;
  quest: { title, description, subtasks, userAssignedDifficulty, timeEstimateHours };
  metrics: {
    weeklyVelocity: number;        // XP/hour this week
    monthlyConsistency: number;    // % active days
    burnoutRisk: "Low" | "Medium" | "High" | "Critical";
    streakDays: number;
    activeQuestCount: number;
    overdueQuestCount: number;
  }
}
```

## Gamification System

### Quest Model Structure

```typescript
interface Quest {
  questId: string;
  title: string;
  subtasks: Subtask[];

  gamification: {
    currentLevel: number;
    currentExp: number;
    expToNextLevel: number;
  };

  difficulty: {
    userAssigned: "Trivial" | "Easy" | "Medium" | "Hard" | "Epic";
    gmValidated: string | null;
    isLocked: boolean;
    xpPerPomodoro: number;
  };

  tracking: {
    totalTrackedTime: number;      // minutes
    velocity: number;               // XP/hour
    averageSessionQuality: number;  // 0-100
  };
}
```

### XP Calculation

XP is earned through focus sessions with quality multipliers:

```typescript
baseXP = difficulty.xpPerPomodoro;
qualityScore = calculateQualityScore(session); // 0-100
xpEarned = baseXP * (qualityScore / 100) * otherMultipliers;
```

Quality factors:
- Completion rate (planned vs actual duration)
- Interruptions (lower quality if interrupted)
- Overtime (bonus for exceeding planned time)
- Consistency (streak bonuses)

## Focus Session Workflow

Pomodoro sessions follow this flow:

```typescript
// 1. User clicks task
startFocusWithModal(task: Task | Subtask)

// 2. Create session in DB
const session = await sessionService.createSession(
  userId, questId, subtaskId, plannedDurationMin
);

// 3. Show modal with countdown timer
showModal(<FocusSessionModal session={sessionData} onEnd={endFocusSession} />);

// 4. On completion
await sessionService.completeSession(sessionId, actualDuration, notes);
  → Calculates quality score
  → Awards XP to quest
  → Updates user profile level/XP
  → Saves to DB and queues sync

// 5. Reload tasks to show updated XP/levels
await loadAllData(userId);
```

## State Management Pattern

App.tsx manages three synchronized data layers:

```typescript
// Layer 1: Worker quests (raw from services)
const [workerQuests, setWorkerQuests] = useState<WorkerQuest[]>([]);

// Layer 2: UI quests (converted for display)
const [quests, setQuests] = useState<Quest[]>([]);

// Layer 3: Tasks (flattened subtasks for home view)
const [tasks, setTasks] = useState<Task[]>([]);
```

### QuestUIAdapter Bridge

`QuestUIAdapter` converts between Quest (worker) and Task (UI) formats:

```typescript
// Extract subtasks from quests → Task[]
static questsToTasks(quests: Quest[]): Task[]

// Reverse lookup: find quest/subtask from task ID
static async findQuestAndSubtask(taskId: string, quests: Quest[])
```

## Sync Queue & Offline Operation

All operations queue for sync when offline:

```typescript
await this.db.queueSync({
  operation: 'update' | 'create' | 'delete' | 'validate',
  collection: 'quests' | 'sessions' | 'gm_validation',
  documentId: string,
  data?: any,
  priority: number,  // 1-10, lower = higher priority
  userId: string,
  retries: 0,
  error: null
});
```

**Priority Levels:**
- `2` - GM validation (high priority)
- `7` - Quest updates
- `9` - Session completion (highest priority)

**Processing:**
- Background loop runs every 60 seconds when online
- Processes operations in priority order
- Retries up to 5 times on failure
- GM validations fall back to local if remote fails

## Component Architecture

App.tsx conditionally renders panels based on `activeNav`:

```typescript
{activeNav === "home" && <MainPanel />}
{activeNav === "quests" && <QuestsMainPanel />}
{activeNav === "progress" && <ProgressMainPanel />}
{activeNav === "settings" && <SettingsMainPanel />}
```

**Callback Pattern:**
- Parent (App.tsx) passes mutation callbacks down
- Child components call callbacks on user actions
- App.tsx calls services and updates state
- React re-renders with new state

Example:
```typescript
<MainPanel
  onToggleTask={toggleTaskComplete}
  onReorderTasks={reorderTasks}
  onStartFocus={startFocusWithModal}
/>
```

## Task Order Persistence

User's custom task order is saved per-user per-date:

```typescript
// Save order when user drags tasks
saveHomeTaskOrder(userId, tasks.map(t => ({
  taskId: t.id,
  questId: t.questId
})));

// Load order on app init
const savedOrder = loadHomeTaskOrder(userId);

// Apply in TaskService
applyCustomOrder(userId, quests): Quest[] // sorted by saved order
```

Storage: `localStorage` with key `ascend:taskOrder:home:${userId}:${date}`

## Browser Extension Support

The app works as both a web app and browser extension:

- **Web mode**: Vite dev server on port 3000
- **Extension mode**: Compiled to `extension/` and `extension-ff/` folders
- Worker compiled separately: `npm run build:worker` → `extension/background.js`
- Manifest files in extension folders

## Common Patterns

### Adding a New Service Method

1. Define method in service class (`src/worker/services/`)
2. Update IndexedDB if schema changes (`indexed-db.ts`)
3. Call method from component via callback in `App.tsx`
4. Queue sync operation if mutation
5. Update state and trigger re-render

### Adding a New Quest Property

1. Update `Quest` interface in `src/worker/models/Quest.ts`
2. Update `QuestService.createQuest` to set default value
3. Add UI field in `QuestCreationForm` or `QuestDetails`
4. If property affects validation, update `GMService` context
5. Bump `IndexedDb` version if index needed

### Adding a New Component Panel

1. Create component in `src/components/`
2. Add navigation item in `NavigationSidebar`
3. Add conditional render in `App.tsx`:
   ```typescript
   {activeNav === "newPanel" && <NewPanel userId={userId} />}
   ```
4. Pass required data/callbacks as props

## Testing Notes

- Jest + ts-jest configured in `package.json`
- No existing test files in codebase (opportunity to add)
- Dev tools exposed to console for manual testing (`dev-tools.ts`)

## Important Constraints

### GM Difficulty Lock
Once a quest is GM-validated, difficulty cannot be changed unless user explicitly requests re-validation. Enforce this in `QuestService.updateQuest`.

### Offline-First Guarantee
Never block user actions on network. All operations must:
1. Save locally first
2. Queue for sync
3. Return success immediately
4. Sync asynchronously in background

### Service Dependency Order
When instantiating services with dependencies, order matters:

```typescript
// ✓ Correct order
const analyticsService = new AnalyticsService();
const questService = new QuestService(); // instantiates GMService internally
const gmService = new GMService(analyticsService, questService);

// ✗ Circular dependency - avoid
const questService = new QuestService(gmService); // gmService doesn't exist yet
```

### Data Sync Consistency
Always reload data after mutations to ensure UI reflects DB state:

```typescript
await service.updateSomething(userId, data);
await loadAllData(userId); // Refresh from DB
```

## Performance Considerations

- **IndexedDB indexes** speed up queries - use composite indexes for common queries
- **Singleton services** avoid re-instantiation overhead
- **Optimistic UI updates** provide instant feedback while sync happens in background
- **Batch sync operations** - 60-second interval reduces network requests
- **Local GM fallback** prevents blocking when offline

## Entry Points

- **Web app**: `index.html` → `src/main.tsx` → `App.tsx`
- **Worker**: `src/worker/worker.ts` (background processing)
- **Dev tools**: `src/worker/dev-tools.ts` (console debugging)
