// Imports - adding necessary types and services
import type { Quest, GMFeedback, DifficultyTier } from "../../models/Quest"; // ADDED GMFeedback, DifficultyTier
import type { AgentState, PerformanceMetrics } from "../../models/AgentState"; // ADDED PerformanceMetrics
import { getDB, IndexedDb } from "../../db/indexed-db"; // ADDED IndexedDb
import {
  RemoteAPI,
  ValidationResult,
  MinimalAgentMetrics,
  GMValidationContext,
} from "../../api/remote-client"; // Existing
import { AnalyticsService } from "../analytics.service"; // ADDED
import type { SyncOperation } from "../../models/SyncOperation"; // ADDED

// --- Dependency Interfaces (Minimal, since QuestService was not provided) ---
interface IQuestService {
  getQuest(questId: string): Promise<Quest | undefined>;
  saveQuest(quest: Quest): Promise<void>;
}

// --- GM Validation Mock API Response Type ---
interface GMValidationResult {
  validatedDifficulty: DifficultyTier;
  reasoning: string;
  recommendations: string[];
  confidence: number;
  suggestedXPPerPomodoro: number;
  subtaskComplexity: string;
}

/**
 * GMService (Grandmaster Service)
 * Orchestrates all AI agent operations: Quest validation,
 * adaptive coaching, and state management.
 */
export class GMService {
  private db: IndexedDb;
  private remoteApi: RemoteAPI;
  private analyticsService: AnalyticsService; // ADDED
  private questService: IQuestService; // ADDED (Assumes injection)
  private static QUEUE_PROCESSING_INTERVAL = 60000; // 60 seconds

  constructor(analyticsService: AnalyticsService, questService: IQuestService) {
    // ADDED dependencies
    this.db = getDB();
    this.remoteApi = new RemoteAPI(); // Existing
    this.analyticsService = analyticsService; // INITIALIZED
    this.questService = questService; // INITIALIZED
  }

  /**
   * Retrieves or GENERATES the current agent state based on analytics.
   * MODIFIED: Uses AnalyticsService for real-time generation (Phase 2).
   */
  async getAgentState(userId: string): Promise<AgentState | null> {
    // 1. Generate fresh metrics using AnalyticsService
    const metrics: PerformanceMetrics =
      await this.analyticsService.generateAgentState(userId);

    // 2. Fetch the existing AgentState (contains historical patterns/actions)
    const existingState = await this.db.agentStates.get(userId);

    // 3. Merge fresh metrics into the existing state or create a new one
    const agentState: AgentState = {
      userId,
      metrics,
      detectedPatterns: existingState?.detectedPatterns || [],
      lastUpdated: new Date().toISOString(),
    } as AgentState;

    // 4. Save the new state for later pattern detection/coaching
    await this.db.agentStates.put(agentState);

    return agentState;
  }

  // --- NEW: Offline-First Queueing (Step 3.1) ---

  /**
   * Queues a quest for validation by the GM agent. This is the new entry point.
   */
  async queueValidation(userId: string, questId: string): Promise<void> {
    console.log(`[GMService] queueValidation called for questId=${questId}, userId=${userId}`);

    const quest = await this.questService.getQuest(questId);
    if (!quest) {
      console.log(`[GMService] Quest not found: ${questId}, aborting validation queue`);
      return;
    }

    console.log(`[GMService] Quest found, current validationStatus: ${quest.validationStatus}`);

    // Optimistic update: mark as 'queued'
    if (quest.validationStatus !== "queued") {
      console.log(`[GMService] Updating quest validationStatus to 'queued'`);
      quest.validationStatus = "queued";
      await this.questService.saveQuest(quest);
    } else {
      console.log(`[GMService] Quest already queued, skipping status update`);
    }

    // Queue the operation using the existing SyncQueue architecture
    console.log(`[GMService] Adding validation operation to sync queue...`);
    await this.db.queueSync({
      collection: "gm_validation" as "gm_validation",
      documentId: questId,
      userId: userId,
      priority: 2, // High priority
      operation: "validate",
      retries: 0,
      error: null,
    } as SyncOperation);
    console.log(`[GMService] Validation operation queued successfully in syncQueue`);
  }

  // --- Existing Method: Remote Validation (MODIFIED/RENAMED for clarity) ---

  /**
   * Executes the remote GM API call for validation.
   * Used by the queue processor when online.
   * RENAMED from validateQuest to validateQuestRemote.
   */
  async validateQuestRemote(userId: string, quest: Quest): Promise<void> {
    console.log('[GM Service] validateQuestRemote called');
    // 1. Gather Context (Required by the RemoteAPI signature)
    const metrics: PerformanceMetrics =
      await this.analyticsService.generateAgentState(userId);

    // Construct the context expected by RemoteAPI.validateQuest(quest, userContext)
    // Remove calculatedAt from metrics before sending to backend
    const { calculatedAt, ...minimalMetrics } = metrics;

    console.log('[GM Service] Metrics after removing calculatedAt:', minimalMetrics);

    const userContext: GMValidationContext = {
      userId: userId,
      metrics: minimalMetrics,
    };

    // 2. Call Remote API
    const validationResult: ValidationResult =
      await this.remoteApi.validateQuest(quest, userContext);

    console.log('[GM Service] Remote validation result:', validationResult);

    // 3. Process Response
    // Check if validation succeeded (either has status="validated" OR has suggestedDifficulty)
    const isValidated =
      (validationResult.status === "validated" || !validationResult.status) &&
      validationResult.suggestedDifficulty;

    if (isValidated) {
      console.log('[GM Service] Validation successful, updating quest...');

      // Update quest difficulty fields
      quest.difficulty.gmValidated = validationResult.suggestedDifficulty;
      quest.difficulty.isLocked = true;
      quest.difficulty.validatedAt = new Date().toISOString();
      quest.validationStatus = "validated";

      if (validationResult.suggestedXpPerPomodoro) {
        quest.difficulty.xpPerPomodoro =
          validationResult.suggestedXpPerPomodoro;
      }

      // Update GM Feedback (assuming ValidationResult contains necessary fields)
      quest.gmFeedback = {
        reasoning: validationResult.reasoning || "Validated remotely.",
        recommendations: validationResult.recommendations || [],
        confidence: validationResult.confidence || 1.0,
        suggestedDifficulty: validationResult.suggestedDifficulty,
        validatedAt: quest.difficulty.validatedAt,
      } as GMFeedback;

      console.log('[GM Service] Quest updated with validation:', {
        gmValidated: quest.difficulty.gmValidated,
        xpPerPomodoro: quest.difficulty.xpPerPomodoro,
        validationStatus: quest.validationStatus
      });

      await this.db.quests.put(quest);
      console.log('[GM Service] Quest saved to database successfully');
    } else {
      // Treat remote failure (not just error) as a failure status
      console.error('[GM Service] Validation failed, status:', validationResult.status);
      quest.validationStatus = "failed";
      await this.db.quests.put(quest);
      throw new Error(`Remote validation failed: ${validationResult.status || 'No status provided'}`);
    }
  }

  // --- NEW: Local Validation Pipeline (Step 3.2 - Offline Fallback) ---

  /**
   * Executes the local GM reasoning pipeline (fallback when offline).
   */
  private async runValidationPipelineLocal(
    userId: string,
    questId: string
  ): Promise<void> {
    const quest = await this.questService.getQuest(questId);
    if (!quest) throw new Error("Quest not found for local validation.");

    try {
      // 1. Gather Context
      const agentState: PerformanceMetrics =
        await this.analyticsService.generateAgentState(userId);
      const userLevel = (await this.db.users.get(userId))?.totalLevel || 1;

      const validationContext = {
        questTitle: quest.title,
        userAssignedDifficulty: quest.difficulty.userAssigned,
        subtaskCount: quest.subtasks.length,
        estimatedHours: quest.timeEstimateHours || 0,
        agentState: agentState,
        userLevel: userLevel,
      };

      // 2. Local Mock GM Reasoning
      const validationResult = this.mockGMValidation(validationContext);

      // 3. Update Quest Model
      const gmFeedback: GMFeedback = {
        reasoning: validationResult.reasoning,
        recommendations: validationResult.recommendations,
        confidence: validationResult.confidence * 0.9, // Lower confidence for local reasoning
        suggestedDifficulty: validationResult.validatedDifficulty,
        validatedAt: new Date().toISOString(),
        context: {
          userLevel: userLevel,
          subtaskComplexity: validationResult.subtaskComplexity,
          estimatedHours: validationContext.estimatedHours,
        },
      };

      quest.gmFeedback = gmFeedback;
      quest.validationStatus = "validated"; // Locally validated, ready for sync
      quest.difficulty.gmValidated = validationResult.validatedDifficulty;
      quest.difficulty.xpPerPomodoro = validationResult.suggestedXPPerPomodoro;
      quest.difficulty.validatedAt = gmFeedback.validatedAt;
      quest.difficulty.confidence = gmFeedback.confidence;

      // 4. Save the updated Quest (using QuestService for consistency)
      await this.questService.saveQuest(quest);
    } catch (error) {
      console.error(`GM Local Validation failed for Quest ${questId}:`, error);
      quest.validationStatus = "failed";
      await this.questService.saveQuest(quest);
      throw error;
    }
  }

  // --- NEW: Queue Consumer Logic (Step 3.3) ---

  /**
   * Periodically processes pending GM validation requests from the sync queue.
   * Tries remote validation first, falls back to local reasoning if remote fails.
   */
  async processPendingQueue(): Promise<void> {
    console.log("[GMService] processPendingQueue() called - ENTRY POINT");

    try {
      console.log("[GMService] Fetching pending sync operations...");
      const pendingOps: SyncOperation[] = await this.db.getPendingSyncOps(10);
      console.log(`[GMService] Found ${pendingOps.length} total pending operations`);

      const gmOps = pendingOps.filter(
        (op) => op.collection === "gm_validation" && op.operation === "validate"
      );
      console.log(`[GMService] Filtered to ${gmOps.length} GM validation operations`);

      if (gmOps.length === 0) {
        console.log("GMService: No pending validation requests in queue.");
        return;
      }

      console.log(
        `GMService: Processing ${gmOps.length} pending validation requests.`
      );

    for (const op of gmOps) {
      const quest = await this.questService.getQuest(op.documentId);
      if (!quest) {
        await this.db.removeSyncOp(op.id);
        continue;
      }

      try {
        // 1. Attempt Remote Validation (Online path)
        await this.validateQuestRemote(op.userId, quest);

        // If successful, remove from queue
        await this.db.removeSyncOp(op.id);
        continue;
      } catch (remoteError) {
        // 2. Remote call failed (Network or Server Error) - Fallback to Local
        console.warn(
          `GM Remote Validation failed for ${op.documentId}. Falling back to local reasoning.`
        );

        try {
          // 3. Run Local Validation (Offline path)
          await this.runValidationPipelineLocal(op.userId, op.documentId);

          // Local validation succeeded, remove op.
          await this.db.removeSyncOp(op.id);
        } catch (localError) {
          // 4. Local validation also failed (Leave in queue for retry)
          console.error(
            `GM Local Validation also failed for ${op.documentId}.`,
            localError
          );
        }
      }
    }
    } catch (error) {
      console.error("[GMService] processPendingQueue() FATAL ERROR:", error);
      throw error;
    }
  }

  // --- NEW: Mock Logic for Validation (Simulating GM Brain) ---

  /**
   * Mocks the external Grandmaster API call and reasoning.
   * Used for the offline fallback mechanism.
   */
  private mockGMValidation(context: any): GMValidationResult {
    const { userAssignedDifficulty, subtaskCount, estimatedHours, agentState } =
      context;
    let validatedDifficulty: DifficultyTier = userAssignedDifficulty;
    let confidence = 0.5;
    let suggestedXPPerPomodoro = 50; // Base XP

    let reasoning = `Initial assessment of quest "${context.questTitle}" assigned as ${userAssignedDifficulty}. `;
    let recommendations: string[] = [];

    // Rule 1: User consistently overestimating difficulty (low velocity, high quality)
    if (
      agentState.weeklyVelocity < 30 &&
      agentState.averageSessionQuality > 85
    ) {
      if (validatedDifficulty !== "Trivial") {
        validatedDifficulty = "Trivial";
        confidence += 0.3;
        reasoning +=
          "User profile suggests consistent overestimation of task difficulty. ";
        recommendations.push("Increase quest difficulty for higher XP gain.");
      }
    }

    // Rule 2: User underestimating large quests (High difficulty, low consistency, many subtasks)
    if (
      subtaskCount > 25 &&
      estimatedHours > 10 &&
      userAssignedDifficulty !== "Epic"
    ) {
      if (agentState.monthlyConsistency < 60) {
        validatedDifficulty = "Hard";
        suggestedXPPerPomodoro = 75;
        confidence += 0.2;
        reasoning +=
          "Quest size is excessive (25+ subtasks) and user consistency is low. Difficulty adjusted to Hard to reflect scope. ";
        recommendations.push(
          "Break this quest into smaller, manageable sub-quests."
        );
      }
    }

    // Rule 3: Burnout risk adjustment
    if (
      agentState.burnoutRisk === "High" ||
      agentState.burnoutRisk === "Critical"
    ) {
      if (validatedDifficulty !== "Trivial") {
        validatedDifficulty = "Easy";
        confidence += 0.1;
        reasoning += `User is currently at ${agentState.burnoutRisk} burnout risk. Difficulty temporarily lowered to Easy to reduce pressure.`;
        recommendations.push(
          "Consider taking a short break or reducing your active quest count."
        );
      }
    }

    // Final XP adjustment based on validated difficulty
    const xpMultiplier: Record<DifficultyTier, number> = {
      Trivial: 30,
      Easy: 45,
      Medium: 60,
      Hard: 90,
      Epic: 120,
    };
    suggestedXPPerPomodoro = xpMultiplier[validatedDifficulty];

    return {
      validatedDifficulty,
      reasoning: reasoning.trim(),
      recommendations,
      confidence: Math.min(1.0, confidence),
      suggestedXPPerPomodoro,
      subtaskComplexity:
        subtaskCount > 20 ? "High" : subtaskCount > 5 ? "Medium" : "Low",
    };
  }

  /**
   * Generates a list of actionable suggestions and coaching tips for the Home View.
   * Aggregates recommendations from recent quest validations and proactive coaching.
   */
  async getHomeSuggestions(userId: string): Promise<
    Array<{
      id: string;
      text: string;
      type: "recommendation" | "coaching" | "challenge" | "milestone" | "tip";
    }>
  > {
    const db = getDB();
    const quests = await db.quests.where("ownerId").equals(userId).toArray();
    const suggestions: Array<{
      id: string;
      text: string;
      type: "recommendation" | "coaching" | "challenge" | "milestone" | "tip";
    }> = [];

    // Threshold for recent quest validations (e.g., suggestions stay for 7 days)
    const recentValidationThreshold = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // 1. Extract Recommendations from recently validated quests
    for (const quest of quests) {
      if (
        quest.validationStatus === "validated" &&
        quest.gmFeedback &&
        (quest.gmFeedback.validatedAt || "") > recentValidationThreshold
      ) {
        // Use the quest title in the summary
        const summaryText = `GM updated '${quest.title}' to ${
          quest.difficulty.gmValidated
        }. Confidence: ${(quest.difficulty.confidence! * 100).toFixed(0)}%.`;
        suggestions.push({
          id: `gm_summary_${quest.questId}`,
          text: summaryText,
          type: "recommendation",
        });

        // Include specific recommendations
        quest.gmFeedback.recommendations.forEach((rec, index) => {
          suggestions.push({
            id: `gm_rec_${quest.questId}_${index}`,
            text: rec,
            type: "recommendation",
          });
        });
      }
    }

    // 2. Add Proactive Coaching based on AgentState
    const agentState = await this.getAgentState(userId);

    if (agentState?.metrics) {
      const metrics = agentState.metrics;

      // Burnout warning (Coaching)
      if (
        metrics.burnoutRisk === "High" ||
        metrics.burnoutRisk === "Critical"
      ) {
        suggestions.push({
          id: "gm_coaching_burnout",
          text: "⚠️ Burnout Risk is **HIGH**. The Grandmaster advises you to defer a non-critical quest or take a short break.",
          type: "coaching",
        });
      }

      // Consistency/Velocity Trend (Challenge/Tip)
      if (
        metrics.consistencyTrend === "declining" ||
        metrics.velocityTrend === "declining"
      ) {
        suggestions.push({
          id: "gm_coaching_declining",
          text: `Your focus consistency is declining. Complete **one session** today to stabilize your metrics.`,
          type: "challenge",
        });
      }

      // High Performer (Milestone)
      if (
        metrics.weeklyVelocity > 40 &&
        metrics.consistencyTrend === "improving"
      ) {
        suggestions.push({
          id: "gm_milestone_high_performer",
          text: `You're tracking at an **Elite Velocity**! Keep challenging yourself with 'Hard' quests.`,
          type: "milestone",
        });
      }

      // Streak Milestone (Milestone)
      if (metrics.streakDays > 0 && metrics.streakDays % 7 === 0) {
        suggestions.push({
          id: `gm_milestone_streak_${metrics.streakDays}`,
          text: `Congratulations on a **${metrics.streakDays}-day streak**! Keep that focus going!`,
          type: "milestone",
        });
      }
    }

    // Deduplicate suggestions based on text if necessary (optional for this phase)

    return suggestions;
  }
}
