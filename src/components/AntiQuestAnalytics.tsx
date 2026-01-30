import { useMemo, useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Calendar, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Cell } from 'recharts';
import type { Quest } from '../worker/models/Quest';
import { AnalyticsService } from '../worker/services/analytics.service';

interface AntiQuestAnalyticsProps {
  antiQuests: Quest[];
  view: 'aq-overview' | 'aq-trends' | 'aq-impact' | 'aq-gaps';
  userId?: string;
}

export function AntiQuestAnalytics({ antiQuests, view, userId }: AntiQuestAnalyticsProps) {
  const analytics = useMemo(() => {
    // Get all occurrences across all AntiQuests
    const allOccurrences = antiQuests.flatMap(aq =>
      (aq.antiEvents || []).map(occ => ({
        ...occ,
        antiQuestTitle: aq.title,
        severity: aq.severity?.userAssigned || 'moderate',
      }))
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate time periods
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter occurrences by time period
    const occurrencesLast7Days = allOccurrences.filter(occ =>
      new Date(occ.timestamp) >= lastWeekStart
    );
    const occurrencesLast30Days = allOccurrences.filter(occ =>
      new Date(occ.timestamp) >= lastMonthStart
    );
    const occurrencesLast90Days = allOccurrences.filter(occ =>
      new Date(occ.timestamp) >= last90Days
    );

    // Calculate total XP lost
    const totalXPLost = allOccurrences.reduce((sum, occ) => sum + occ.xpPenalty, 0);
    const xpLostLast30Days = occurrencesLast30Days.reduce((sum, occ) => sum + occ.xpPenalty, 0);

    // Calculate current gap (time since last occurrence)
    const lastOccurrence = allOccurrences[allOccurrences.length - 1];
    const currentGapDays = lastOccurrence
      ? Math.floor((now.getTime() - new Date(lastOccurrence.timestamp).getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    // Calculate average gap between occurrences
    const gaps: number[] = [];
    for (let i = 1; i < allOccurrences.length; i++) {
      const gap = (new Date(allOccurrences[i].timestamp).getTime() -
                   new Date(allOccurrences[i - 1].timestamp).getTime()) / (24 * 60 * 60 * 1000);
      gaps.push(gap);
    }
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const longestGap = gaps.length > 0 ? Math.max(...gaps) : 0;

    // Calculate trend (comparing last 14 days to previous 14 days)
    const last14DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previous14DaysStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const occurrencesLast14Days = allOccurrences.filter(occ =>
      new Date(occ.timestamp) >= last14DaysStart
    ).length;
    const occurrencesPrevious14Days = allOccurrences.filter(occ => {
      const timestamp = new Date(occ.timestamp);
      return timestamp >= previous14DaysStart && timestamp < last14DaysStart;
    }).length;

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (occurrencesLast14Days < occurrencesPrevious14Days * 0.8) {
      trend = 'improving';
    } else if (occurrencesLast14Days > occurrencesPrevious14Days * 1.2) {
      trend = 'worsening';
    }

    // Generate 30-day frequency chart data
    const frequencyData30Days: { date: string; occurrences: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = occurrencesLast30Days.filter(occ => {
        const occDate = new Date(occ.timestamp);
        return occDate.toDateString() === date.toDateString();
      }).length;
      frequencyData30Days.push({ date: dateStr, occurrences: count });
    }

    // Generate 90-day frequency chart data (weekly buckets)
    const frequencyData90Days: { week: string; occurrences: number }[] = [];
    for (let i = 12; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = occurrencesLast90Days.filter(occ => {
        const occDate = new Date(occ.timestamp);
        return occDate >= weekStart && occDate < weekEnd;
      }).length;
      frequencyData90Days.push({ week: weekLabel, occurrences: count });
    }

    return {
      totalOccurrences: allOccurrences.length,
      occurrencesThisWeek: occurrencesLast7Days.length,
      occurrencesThisMonth: occurrencesLast30Days.length,
      totalXPLost,
      xpLostLast30Days,
      currentGapDays,
      avgGap,
      longestGap,
      trend,
      frequencyData30Days,
      frequencyData90Days,
      allOccurrences,
      gaps,
    };
  }, [antiQuests]);

  if (view === 'aq-overview') {
    return <OverviewView analytics={analytics} />;
  }

  if (view === 'aq-trends') {
    return <TrendsView analytics={analytics} />;
  }

  if (view === 'aq-impact') {
    return <ImpactView analytics={analytics} userId={userId} />;
  }

  if (view === 'aq-gaps') {
    return <GapsView analytics={analytics} />;
  }

  return null;
}

function OverviewView({ analytics }: { analytics: any }) {
  return (
    <div className="flex-1 bg-[#36393f] overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl text-white mb-2">AntiQuest Analytics Overview</h1>
          <p className="text-sm text-[#b9bbbe]">
            Aggregate behavioral patterns and performance metrics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Occurrences This Week */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-[#b9bbbe]">This Week</div>
              <Calendar className="w-4 h-4 text-[#fb923c]" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.occurrencesThisWeek}
            </div>
            <div className="text-xs text-[#72767d]">occurrences</div>
          </div>

          {/* Occurrences This Month */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-[#b9bbbe]">This Month</div>
              <Calendar className="w-4 h-4 text-[#f97316]" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.occurrencesThisMonth}
            </div>
            <div className="text-xs text-[#72767d]">occurrences</div>
          </div>

          {/* Total XP Lost (30 Days) */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-[#b9bbbe]">XP Lost (30d)</div>
              <TrendingDown className="w-4 h-4 text-[#fb923c]" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              −{analytics.xpLostLast30Days}
            </div>
            <div className="text-xs text-[#72767d]">total: −{analytics.totalXPLost} XP</div>
          </div>

          {/* Current Gap */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-[#b9bbbe]">Current Gap</div>
              {analytics.currentGapDays >= analytics.longestGap ? (
                <Award className="w-4 h-4 text-[#86efac]" />
              ) : (
                <Calendar className="w-4 h-4 text-[#b9bbbe]" />
              )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.currentGapDays}
              <span className="text-lg text-[#b9bbbe] ml-1">days</span>
            </div>
            <div className="text-xs text-[#72767d]">
              {analytics.currentGapDays >= analytics.longestGap
                ? '🎉 New record!'
                : `record: ${Math.floor(analytics.longestGap)} days`}
            </div>
          </div>

          {/* Longest Gap */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-[#b9bbbe]">Longest Gap</div>
              <Award className="w-4 h-4 text-[#faa61a]" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {Math.floor(analytics.longestGap)}
              <span className="text-lg text-[#b9bbbe] ml-1">days</span>
            </div>
            <div className="text-xs text-[#72767d]">
              avg: {analytics.avgGap.toFixed(1)} days
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-[#b9bbbe]">2-Week Trend</div>
              {analytics.trend === 'improving' && <TrendingUp className="w-4 h-4 text-[#86efac]" />}
              {analytics.trend === 'stable' && <Minus className="w-4 h-4 text-[#b9bbbe]" />}
              {analytics.trend === 'worsening' && <TrendingDown className="w-4 h-4 text-[#fb923c]" />}
            </div>
            <div className="text-xl font-bold mb-1" style={{
              color: analytics.trend === 'improving' ? '#86efac' :
                     analytics.trend === 'worsening' ? '#fb923c' : '#dcddde'
            }}>
              {analytics.trend.charAt(0).toUpperCase() + analytics.trend.slice(1)}
            </div>
            <div className="text-xs text-[#72767d]">
              {analytics.trend === 'improving' && 'Frequency decreasing'}
              {analytics.trend === 'stable' && 'Consistent pattern'}
              {analytics.trend === 'worsening' && 'Frequency increasing'}
            </div>
          </div>
        </div>

        {/* Frequency Chart */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-white">Occurrence Frequency</h2>
            <div className="text-xs text-[#b9bbbe]">Last 30 Days</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.frequencyData30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
              <XAxis
                dataKey="date"
                stroke="#72767d"
                tick={{ fill: '#72767d', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#72767d"
                tick={{ fill: '#72767d', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18191c',
                  border: '1px solid #4f545c',
                  borderRadius: '4px',
                  color: '#dcddde'
                }}
                labelStyle={{ color: '#b9bbbe' }}
              />
              <Bar dataKey="occurrences" fill="#fb923c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Empty State */}
        {analytics.totalOccurrences === 0 && (
          <div className="bg-[#2f3136] rounded-lg p-12 border border-[#202225] text-center">
            <Award className="w-16 h-16 text-[#86efac] mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No AntiQuest Activity</h3>
            <p className="text-sm text-[#b9bbbe]">
              No occurrences have been logged yet. Keep up the momentum!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrendsView({ analytics }: { analytics: any }) {
  return (
    <div className="flex-1 bg-[#36393f] overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl text-white mb-2">Trend Analysis</h1>
          <p className="text-sm text-[#b9bbbe]">
            Rolling averages and directional patterns over time
          </p>
        </div>

        {/* 90-Day Trend Chart */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-white">90-Day Frequency Pattern</h2>
            <div className="text-xs text-[#b9bbbe]">Weekly Buckets</div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={analytics.frequencyData90Days}>
              <defs>
                <linearGradient id="colorOccurrences" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
              <XAxis
                dataKey="week"
                stroke="#72767d"
                tick={{ fill: '#72767d', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#72767d"
                tick={{ fill: '#72767d', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18191c',
                  border: '1px solid #4f545c',
                  borderRadius: '4px',
                  color: '#dcddde'
                }}
                labelStyle={{ color: '#b9bbbe' }}
              />
              <Area
                type="monotone"
                dataKey="occurrences"
                stroke="#fb923c"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOccurrences)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Momentum Indicators */}
        <div className="grid grid-cols-3 gap-4">
          {/* Weekly Average (Last 4 Weeks) */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Weekly Average
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {(analytics.occurrencesThisMonth / 4.3).toFixed(1)}
            </div>
            <div className="text-xs text-[#72767d]">occurrences/week</div>
          </div>

          {/* Momentum Status */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Momentum
            </div>
            <div className="flex items-center gap-2">
              {analytics.trend === 'improving' && (
                <>
                  <TrendingUp className="w-5 h-5 text-[#86efac]" />
                  <span className="text-lg font-bold text-[#86efac]">Reducing</span>
                </>
              )}
              {analytics.trend === 'stable' && (
                <>
                  <Minus className="w-5 h-5 text-[#b9bbbe]" />
                  <span className="text-lg font-bold text-[#dcddde]">Plateau</span>
                </>
              )}
              {analytics.trend === 'worsening' && (
                <>
                  <TrendingDown className="w-5 h-5 text-[#fb923c]" />
                  <span className="text-lg font-bold text-[#fb923c]">Regression</span>
                </>
              )}
            </div>
            <div className="text-xs text-[#72767d] mt-1">
              {analytics.trend === 'improving' && 'Frequency decreasing'}
              {analytics.trend === 'stable' && 'Consistent pattern'}
              {analytics.trend === 'worsening' && 'Attention recommended'}
            </div>
          </div>

          {/* Consistency Score */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Pattern Stability
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {analytics.gaps.length > 0
                ? (100 - Math.min(100, (Math.sqrt(analytics.gaps.reduce((sum: number, gap: number) => {
                    const variance = Math.pow(gap - analytics.avgGap, 2);
                    return sum + variance;
                  }, 0) / analytics.gaps.length) / analytics.avgGap) * 100)).toFixed(0)
                : '100'}%
            </div>
            <div className="text-xs text-[#72767d]">
              {analytics.gaps.length > 0 && (Math.sqrt(analytics.gaps.reduce((sum: number, gap: number) => {
                const variance = Math.pow(gap - analytics.avgGap, 2);
                return sum + variance;
              }, 0) / analytics.gaps.length) / analytics.avgGap) < 0.3
                ? 'Very consistent'
                : 'Variable pattern'}
            </div>
          </div>
        </div>

        {/* Trend Interpretation */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
          <h3 className="text-md text-white mb-3">Interpretation</h3>
          <div className="space-y-2 text-sm text-[#dcddde]">
            {analytics.trend === 'improving' && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-[#86efac] mt-1.5" />
                <p>
                  Your occurrence frequency has decreased by more than 20% in the last two weeks.
                  This suggests effective behavioral change. Continue current strategies.
                </p>
              </div>
            )}
            {analytics.trend === 'stable' && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-[#b9bbbe] mt-1.5" />
                <p>
                  Your pattern has remained consistent over the past month.
                  If improvement is desired, consider adjusting your approach or environmental factors.
                </p>
              </div>
            )}
            {analytics.trend === 'worsening' && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-[#fb923c] mt-1.5" />
                <p>
                  Occurrence frequency has increased. Review recent changes in routine, stress levels,
                  or environmental triggers that may be contributing to this pattern.
                </p>
              </div>
            )}
          </div>
        </div>

        {analytics.totalOccurrences === 0 && (
          <div className="bg-[#2f3136] rounded-lg p-12 border border-[#202225] text-center">
            <TrendingUp className="w-16 h-16 text-[#86efac] mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No Trend Data Available</h3>
            <p className="text-sm text-[#b9bbbe]">
              Log occurrences to begin tracking behavioral trends over time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactView({ analytics, userId }: { analytics: any; userId?: string }) {
  const [dailyXPData, setDailyXPData] = useState<Array<{ date: string; xpGained: number; xpLost: number }>>([]);
  const [totalProductiveXP, setTotalProductiveXP] = useState(0);

  useEffect(() => {
    const fetchXPData = async () => {
      if (!userId) return;

      const analyticsService = new AnalyticsService();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch sessions for the last 30 days
      const sessions = await analyticsService.getSessionsByDateRange(
        userId,
        thirtyDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );

      // Group sessions by date
      const xpByDate = new Map<string, number>();
      sessions.forEach(session => {
        const dateStr = new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        xpByDate.set(dateStr, (xpByDate.get(dateStr) || 0) + (session.xpEarned || 0));
      });

      // Calculate total productive XP
      const totalXP = sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0);
      setTotalProductiveXP(totalXP);

      // Build daily data matching the 30-day frequency data
      const dailyData = analytics.frequencyData30Days.map((day: any) => {
        const xpGained = xpByDate.get(day.date) || 0;
        // Calculate actual XP lost from antiEvents on this day
        const xpLost = analytics.allOccurrences
          .filter((occ: any) => {
            const occDate = new Date(occ.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return occDate === day.date;
          })
          .reduce((sum: number, occ: any) => sum + (occ.xpPenalty || 0), 0);

        return {
          date: day.date,
          xpGained,
          xpLost: -xpLost,
        };
      });

      setDailyXPData(dailyData);
    };

    fetchXPData();
  }, [userId, analytics]);

  const netXP = totalProductiveXP - Math.abs(analytics.totalXPLost);
  const impactPercentage = totalProductiveXP > 0
    ? ((Math.abs(analytics.totalXPLost) / totalProductiveXP) * 100).toFixed(1)
    : 0;

  return (
    <div className="flex-1 bg-[#36393f] overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl text-white mb-2">Impact Analysis</h1>
          <p className="text-sm text-[#b9bbbe]">
            Understanding the effect of AntiQuests on overall progress
          </p>
        </div>

        {/* Impact Overview Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Productive XP Earned */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Productive XP (Est.)
            </div>
            <div className="text-3xl font-bold text-[#86efac] mb-1">
              +{totalProductiveXP}
            </div>
            <div className="text-xs text-[#72767d]">from quests & tasks</div>
          </div>

          {/* AntiQuest XP Lost */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              AntiQuest Penalties
            </div>
            <div className="text-3xl font-bold text-[#fb923c] mb-1">
              −{Math.abs(analytics.totalXPLost)}
            </div>
            <div className="text-xs text-[#72767d]">total penalties</div>
          </div>

          {/* Net XP */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Net Impact
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {netXP > 0 ? '+' : ''}{netXP}
            </div>
            <div className="text-xs text-[#72767d]">
              {impactPercentage}% reduction from penalties
            </div>
          </div>
        </div>

        {/* XP Comparison Chart */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-white">Daily XP Balance</h2>
            <div className="text-xs text-[#b9bbbe]">Last 30 Days</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyXPData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
              <XAxis
                dataKey="date"
                stroke="#72767d"
                tick={{ fill: '#72767d', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#72767d"
                tick={{ fill: '#72767d', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18191c',
                  border: '1px solid #4f545c',
                  borderRadius: '4px',
                  color: '#dcddde'
                }}
                labelStyle={{ color: '#b9bbbe' }}
              />
              <Bar dataKey="xpGained" fill="#86efac" name="Productive XP" radius={[4, 4, 0, 0]} />
              <Bar dataKey="xpLost" fill="#fb923c" name="Penalties" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Context and Perspective */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
          <h3 className="text-md text-white mb-4">Contextual Perspective</h3>
          <div className="space-y-4">
            {totalProductiveXP > Math.abs(analytics.totalXPLost) * 2 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#86efac] bg-opacity-20 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-[#86efac]" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-1">
                    Strong Net Progress
                  </div>
                  <div className="text-sm text-[#b9bbbe]">
                    Your productive efforts significantly outweigh AntiQuest penalties.
                    While improvement is always valuable, you're maintaining forward momentum.
                  </div>
                </div>
              </div>
            )}
            {totalProductiveXP <= Math.abs(analytics.totalXPLost) * 2 && totalProductiveXP > Math.abs(analytics.totalXPLost) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#faa61a] bg-opacity-20 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4 text-[#faa61a]" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-1">
                    Moderate Impact
                  </div>
                  <div className="text-sm text-[#b9bbbe]">
                    AntiQuest penalties are having a noticeable effect on your progress.
                    Reducing frequency could meaningfully accelerate advancement.
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5865F2] bg-opacity-20 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-[#5865F2]" />
              </div>
              <div>
                <div className="text-sm font-medium text-white mb-1">
                  Progress Matters More
                </div>
                <div className="text-sm text-[#b9bbbe]">
                  Remember: completing quests and tasks generates far more XP than penalties remove.
                  AntiQuests track patterns, but forward action drives leveling.
                </div>
              </div>
            </div>
          </div>
        </div>

        {analytics.totalOccurrences === 0 && (
          <div className="bg-[#2f3136] rounded-lg p-12 border border-[#202225] text-center">
            <Award className="w-16 h-16 text-[#86efac] mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No Impact Data</h3>
            <p className="text-sm text-[#b9bbbe]">
              All XP is going toward progress. Keep maintaining positive momentum!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GapsView({ analytics }: { analytics: any }) {
  // Generate gap timeline data
  const gapTimelineData = analytics.allOccurrences.map((occ: any, index: number) => {
    if (index === 0) return null;
    const prevOcc = analytics.allOccurrences[index - 1];
    const gap = (new Date(occ.timestamp).getTime() - new Date(prevOcc.timestamp).getTime()) / (24 * 60 * 60 * 1000);
    return {
      index: index,
      gap: gap,
      date: new Date(occ.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      improving: gap >= analytics.avgGap,
    };
  }).filter(Boolean);

  const isCurrentGapImproving = analytics.currentGapDays >= analytics.avgGap;

  return (
    <div className="flex-1 bg-[#36393f] overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl text-white mb-2">Gap Analysis</h1>
          <p className="text-sm text-[#b9bbbe]">
            Time between occurrences and improvement patterns
          </p>
        </div>

        {/* Gap Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {/* Current Gap vs Average */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Current vs Average
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white">
                {analytics.currentGapDays}
              </span>
              <span className="text-sm text-[#72767d]">days</span>
              {isCurrentGapImproving && (
                <TrendingUp className="w-5 h-5 text-[#86efac] ml-auto" />
              )}
            </div>
            <div className="text-xs text-[#72767d]">
              avg: {analytics.avgGap.toFixed(1)} days
            </div>
            {isCurrentGapImproving && (
              <div className="text-xs text-[#86efac] mt-1">
                Above average! Keep going.
              </div>
            )}
          </div>

          {/* Gap Consistency */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Average Gap
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white">
                {analytics.avgGap.toFixed(1)}
              </span>
              <span className="text-sm text-[#72767d]">days</span>
            </div>
            <div className="text-xs text-[#72767d]">
              between occurrences
            </div>
          </div>

          {/* Best Gap Streak */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Best Streak
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-[#faa61a]">
                {Math.floor(analytics.longestGap)}
              </span>
              <span className="text-sm text-[#72767d]">days</span>
              <Award className="w-5 h-5 text-[#faa61a] ml-auto" />
            </div>
            <div className="text-xs text-[#72767d]">
              {analytics.currentGapDays >= analytics.longestGap
                ? 'Current streak is a record!'
                : 'personal best'}
            </div>
          </div>
        </div>

        {/* Gap Timeline Chart */}
        {gapTimelineData.length > 0 && (
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-white">Gap Timeline</h2>
              <div className="text-xs text-[#b9bbbe]">
                Green = Above Average
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gapTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
                <XAxis
                  dataKey="date"
                  stroke="#72767d"
                  tick={{ fill: '#72767d', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#72767d"
                  tick={{ fill: '#72767d', fontSize: 12 }}
                  label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#72767d' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18191c',
                    border: '1px solid #4f545c',
                    borderRadius: '4px',
                    color: '#dcddde'
                  }}
                  labelStyle={{ color: '#b9bbbe' }}
                  formatter={(value: any) => [`${value.toFixed(1)} days`, 'Gap']}
                />
                <Bar
                  dataKey="gap"
                  radius={[4, 4, 0, 0]}
                  fill="#fb923c"
                >
                  {gapTimelineData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.improving ? '#86efac' : '#fb923c'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gap Progress Indicator */}
        {analytics.currentGapDays > 0 && (
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
            <h3 className="text-md text-white mb-4">Current Gap Progress</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#b9bbbe]">Days since last occurrence</span>
                  <span className="text-white font-medium">{analytics.currentGapDays}</span>
                </div>
                <div className="w-full h-3 bg-[#202225] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, (analytics.currentGapDays / analytics.longestGap) * 100)}%`,
                      backgroundColor: analytics.currentGapDays >= analytics.longestGap ? '#86efac' : '#5865F2'
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#72767d] mt-1">
                  <span>0 days</span>
                  <span>Record: {Math.floor(analytics.longestGap)} days</span>
                </div>
              </div>

              {analytics.currentGapDays >= analytics.avgGap && (
                <div className="bg-[#86efac] bg-opacity-10 border border-[#86efac] border-opacity-30 rounded p-3">
                  <div className="flex items-center gap-2 text-[#86efac] text-sm">
                    <Award className="w-4 h-4" />
                    <span>
                      {analytics.currentGapDays >= analytics.longestGap
                        ? 'New personal record! Exceptional progress.'
                        : 'Above average gap maintained. Keep it up!'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Improvement Insights */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#202225]">
          <h3 className="text-md text-white mb-3">Pattern Insights</h3>
          <div className="space-y-3 text-sm text-[#dcddde]">
            {analytics.gaps.length > 0 && (
              <>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#5865F2] mt-1.5" />
                  <p>
                    You've had <strong>{analytics.gaps.filter((g: number) => g >= analytics.avgGap).length}</strong> gaps
                    that exceeded your average, showing {((analytics.gaps.filter((g: number) => g >= analytics.avgGap).length / analytics.gaps.length) * 100).toFixed(0)}%
                    improvement rate.
                  </p>
                </div>
                {analytics.currentGapDays >= analytics.longestGap && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86efac] mt-1.5" />
                    <p>
                      Your current gap has reached a new personal best. This represents
                      meaningful behavioral change.
                    </p>
                  </div>
                )}
                {analytics.currentGapDays < analytics.avgGap && analytics.gaps.length > 2 && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#fb923c] mt-1.5" />
                    <p>
                      Current gap is below your average. Focus on extending the time
                      between occurrences by reinforcing successful strategies.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {analytics.totalOccurrences === 0 && (
          <div className="bg-[#2f3136] rounded-lg p-12 border border-[#202225] text-center">
            <Calendar className="w-16 h-16 text-[#86efac] mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No Gap Data Available</h3>
            <p className="text-sm text-[#b9bbbe]">
              Gap analysis requires at least two logged occurrences to compare patterns.
            </p>
          </div>
        )}

        {analytics.totalOccurrences === 1 && (
          <div className="bg-[#2f3136] rounded-lg p-8 border border-[#202225] text-center">
            <Calendar className="w-12 h-12 text-[#5865F2] mx-auto mb-3" />
            <h3 className="text-lg text-white mb-2">First Occurrence Logged</h3>
            <p className="text-sm text-[#b9bbbe]">
              Gap analysis will become available after logging additional occurrences.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
