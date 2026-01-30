export interface AntiQuestAnalytics {
  totalOccurrences: number;
  totalXPLost: number;
  avgGap: number;
  longestGap: number;
  currentGapDays: number;
  gaps: number[];
  trends: {
    occurrenceTrend: number;
    xpLossTrend: number;
    gapTrend: number;
  };
  occurrencesByDay: Array<{
    date: string;
    count: number;
  }>;
  xpLossByDay: Array<{
    date: string;
    xpLoss: number;
  }>;
}