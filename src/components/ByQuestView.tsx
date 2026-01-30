import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { QuestService } from "../worker/services/quest.service";
import { AnalyticsService } from "../worker/services/analytics.service";

interface ByQuestViewProps {
  userId: string;
}

export function ByQuestView({ userId }: ByQuestViewProps) {
  const [questData, setQuestData] = useState<any[]>([]);

  useEffect(() => {
    async function loadQuestData() {
      // Get all user quests (excluding AntiQuests)
      const questService = new QuestService();
      const allQuests = await questService.getUserQuests(userId);
      const quests = allQuests.filter((q: any) => q.type !== 'AntiQuest');

      // Get analytics for each quest
      const questStats = await Promise.all(
        quests.map(async (quest: any) => {
          const analyticsService = new AnalyticsService();
          const sessions = await analyticsService.getQuestSessions(
            quest.questId,
            100
          );

          const totalTime = sessions.reduce(
            (sum: number, s: any) => sum + s.actualDurationMin,
            0
          );
          const totalSessions = sessions.length;
          const completedSessions = sessions.filter(
            (s: any) => s.status === "completed"
          ).length;
          const totalXP = sessions.reduce(
            (sum: number, s: any) => sum + s.xpEarned,
            0
          );
          const velocity =
            totalTime > 0 ? Math.round((totalXP / totalTime) * 60) : 0;

          return {
            quest: quest.title,
            icon: quest.type === "DungeonQuest" ? "⚔️" : "📋",
            color: quest.color || "#5865F2",
            totalTime,
            sessions: totalSessions,
            xpEarned: totalXP,
            velocity,
            completionRate:
              totalSessions > 0
                ? Math.round((completedSessions / totalSessions) * 100)
                : 0,
          };
        })
      );

      setQuestData(questStats);
    }

    loadQuestData();
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalTime = questData.reduce((sum, q) => sum + q.totalTime, 0);
  const totalSessions = questData.reduce((sum, q) => sum + q.sessions, 0);
  const totalXP = questData.reduce((sum, q) => sum + q.xpEarned, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl text-white mb-2">Breakdown by Quest</h2>
        <p className="text-sm text-[#b9bbbe]">
          Detailed time and performance metrics for each quest
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#2f3136] rounded-lg p-4">
          <div className="text-xs text-[#72767d] mb-1">Total Time</div>
          <div className="text-2xl text-white">{formatTime(totalTime)}</div>
        </div>
        <div className="bg-[#2f3136] rounded-lg p-4">
          <div className="text-xs text-[#72767d] mb-1">Total Sessions</div>
          <div className="text-2xl text-[#57F287]">{totalSessions}</div>
        </div>
        <div className="bg-[#2f3136] rounded-lg p-4">
          <div className="text-xs text-[#72767d] mb-1">Total XP</div>
          <div className="text-2xl text-[#00b0f4]">{totalXP}</div>
        </div>
      </div>

      {/* Time Distribution Chart */}
      <div className="bg-[#2f3136] rounded-lg p-6 mb-6">
        <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-4">
          Time Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={questData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
            <XAxis
              type="number"
              stroke="#72767d"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              dataKey="quest"
              type="category"
              stroke="#72767d"
              style={{ fontSize: "12px" }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18191c",
                border: "none",
                borderRadius: "8px",
                color: "#dcddde",
              }}
              formatter={(value: number) => formatTime(value)}
            />
            <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
              {questData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quest Details */}
      <div className="space-y-4">
        {questData.map((quest) => {
          // Handle division by zero for percentage and average calculations
          const timePercent = totalTime > 0
            ? ((quest.totalTime / totalTime) * 100).toFixed(1)
            : "0.0";
          const avgSessionTime = quest.sessions > 0
            ? Math.round(quest.totalTime / quest.sessions)
            : 0;

          return (
            <div key={quest.quest} className="bg-[#2f3136] rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{quest.icon}</span>
                  <div>
                    <h3 className="text-white mb-1">{quest.quest}</h3>
                    <div className="text-sm text-[#b9bbbe]">
                      {timePercent}% of total time
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl text-white">
                    {formatTime(quest.totalTime)}
                  </div>
                  <div className="text-xs text-[#72767d]">
                    {quest.sessions} sessions
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#72767d] mb-1">XP Earned</div>
                  <div className="text-lg text-[#00b0f4]">{quest.xpEarned}</div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#72767d] mb-1">Velocity</div>
                  <div className="text-lg text-[#57F287]">{quest.velocity}</div>
                  <div className="text-xs text-[#72767d]">XP/hr</div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#72767d] mb-1">Completion</div>
                  <div className="text-lg text-white">
                    {quest.completionRate}%
                  </div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#72767d] mb-1">Avg Session</div>
                  <div className="text-lg text-[#faa61a]">
                    {avgSessionTime}m
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#72767d]">
                    Time Contribution
                  </span>
                  <span className="text-xs text-[#b9bbbe]">{timePercent}%</span>
                </div>
                <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${timePercent}%`,
                      backgroundColor: quest.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
