import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { QuestService } from '../worker/services/quest.service';
import { AnalyticsService } from '../worker/services/analytics.service';
// import { workerRequest } from '../worker';

interface CompletionTrendsViewProps {
    userId: string; 
}

export function CompletionTrendsView({userId}: CompletionTrendsViewProps) {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [questTrends, setQuestTrends] = useState<any[]>([]);
  const [avgCompletionRate, setAvgCompletionRate] = useState(0);

  useEffect(() => {
    async function loadTrends() {
          const analyticsService = new AnalyticsService();
          const questService = new QuestService();
        const allQuests = await questService.getUserQuests(userId);
        // Filter out AntiQuests - they don't have sessions/velocity
        const quests = allQuests.filter((q: any) => q.type !== 'AntiQuest');

      // Calculate weekly completion trends
      const weeks: any = [];
      for (let i = 5; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);
        
        const sessions = await analyticsService.getSessionsByDateRange(
          userId,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        );
        
        const completed = sessions.filter((s: any) => s.status === 'completed').length;
        const started = sessions.length;
        const rate = started > 0 ? Math.round((completed / started) * 100) : 0;
        
        weeks.push({
          week: `Week ${6 - i}`,
          completed,
          started,
          rate
        });
      }
      
      setWeeklyData(weeks);
      
      // Calculate per-quest trends
      const trends = await Promise.all(
        quests.map(async (quest: any) => {
        //   const allSessions = await workerRequest('analytics:getQuestSessions', { 
        const allSessions = await analyticsService.getQuestSessions(
            quest.questId, 
            50 
        );
          
          // Split into this week and last week
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          
          const thisWeekSessions = allSessions.filter((s: any) => 
            new Date(s.startTime) > weekAgo
          );
          const lastWeekSessions = allSessions.filter((s: any) => 
            new Date(s.startTime) > twoWeeksAgo && new Date(s.startTime) <= weekAgo
          );
          
          const thisWeekRate = thisWeekSessions.length > 0 
            ? Math.round((thisWeekSessions.filter((s: any) => s.status === 'completed').length / thisWeekSessions.length) * 100)
            : 0;
          const lastWeekRate = lastWeekSessions.length > 0
            ? Math.round((lastWeekSessions.filter((s: any) => s.status === 'completed').length / lastWeekSessions.length) * 100)
            : 0;
          
          const change = thisWeekRate - lastWeekRate;
          
          return {
            quest: quest.title,
            icon: quest.type === 'DungeonQuest' ? '⚔️' : '📋',
            color: quest.color || '#5865F2',
            completionRate: thisWeekRate,
            trend: change >= 0 ? 'up' : 'down',
            change,
            lastWeek: lastWeekRate,
            thisWeek: thisWeekRate
          };
        })
      );
      
      setQuestTrends(trends);
      setAvgCompletionRate(Math.round(
        trends.reduce((sum, q) => sum + q.completionRate, 0) / trends.length
      ));
    }
    
    loadTrends();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl text-white mb-2">Completion Trends</h2>
        <p className="text-sm text-[#b9bbbe]">
          Track how your completion rates evolve over time
        </p>
      </div>

      {/* Overall Completion Rate */}
      <div className="bg-[#2f3136] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-1">
              Average Completion Rate
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl text-white">{avgCompletionRate}%</span>
              <div className="flex items-center gap-1 text-[#57F287]">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+7% this week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
            <XAxis dataKey="week" stroke="#72767d" style={{ fontSize: '12px' }} />
            <YAxis stroke="#72767d" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18191c',
                border: 'none',
                borderRadius: '8px',
                color: '#dcddde',
              }}
              labelStyle={{ color: '#dcddde' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#b9bbbe' }} />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#57F287"
              strokeWidth={2}
              name="Completed"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="started"
              stroke="#00b0f4"
              strokeWidth={2}
              name="Started"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#faa61a"
              strokeWidth={2}
              name="Rate %"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quest-by-Quest Breakdown */}
      <div className="mb-6">
        <h3 className="text-sm text-white mb-4">Quest Completion Trends</h3>
        <div className="space-y-3">
          {questTrends.map((quest) => (
            <div key={quest.quest} className="bg-[#2f3136] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{quest.icon}</span>
                  <div>
                    <h4 className="text-white mb-1">{quest.quest}</h4>
                    <div className="flex items-center gap-2">
                      {quest.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-[#57F287]" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-[#ED4245]" />
                      )}
                      <span
                        className={`text-sm ${
                          quest.trend === 'up' ? 'text-[#57F287]' : 'text-[#ED4245]'
                        }`}
                      >
                        {quest.change > 0 ? '+' : ''}{quest.change}% vs last week
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#72767d] mb-1">Current Rate</div>
                  <div className="text-2xl text-white">{quest.completionRate}%</div>
                </div>
              </div>

              {/* Progress bars comparison */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#72767d]">This Week</span>
                    <span className="text-xs text-[#b9bbbe]">{quest.thisWeek}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${quest.thisWeek}%`,
                        backgroundColor: quest.color,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#72767d]">Last Week</span>
                    <span className="text-xs text-[#b9bbbe]">{quest.lastWeek}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all opacity-50"
                      style={{
                        width: `${quest.lastWeek}%`,
                        backgroundColor: quest.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-[#2f3136] rounded-lg p-6">
        <h3 className="text-sm text-white mb-3">Key Insights</h3>
        <ul className="space-y-2 text-sm text-[#b9bbbe]">
          <li className="flex items-start gap-2">
            <span className="text-[#57F287] shrink-0">↗</span>
            <span>Overall completion rate is trending upward - keep the momentum!</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#ED4245] shrink-0">↘</span>
            <span>Daily Routine completion dropped 15% - consider simplifying or restructuring</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#57F287] shrink-0">★</span>
            <span>Creative Flow has the highest and most consistent completion rate</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00b0f4] shrink-0">◆</span>
            <span>Week 4 was your best week with 90% completion rate - what made it successful?</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
