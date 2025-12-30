import { useEffect, useState } from "react";
import { Zap, TrendingUp, Award } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AnalyticsService } from "../worker/services/analytics.service";
import { QuestService } from "../worker/services/quest.service";

interface XPLogsViewProps {
     userId: string; 
}

export function XPLogsView({ userId }: XPLogsViewProps) {
  const [xpLogs, setXpLogs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [avgXPPerDay, setAvgXPPerDay] = useState(0);

  useEffect(() => {
    async function loadXPData() {
      const analyticsService = new AnalyticsService();
      const questService = new QuestService();
      const sessions = await analyticsService.getSessionHistory({
        userId,
        limit: 100,
      });

      // Get quest details for each session
      const enrichedLogs = await Promise.all(
        sessions.map(async (session: any) => {
          const quest = await questService.getQuest(session.questId);
          return {
            id: session.sessionId,
            date: new Date(session.startTime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            time: new Date(session.startTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            action: "Completed subtask",
            quest: quest?.title || "Unknown Quest",
            subtask: session.notes || "Focused work",
            xp: session.xpEarned,
            color:
              quest?.difficulty?.userAssigned === "Hard"
                ? "#ED4245"
                : "#5865F2",
          };
        })
      );

      setXpLogs(enrichedLogs);

      // Calculate daily totals for chart
      const dailyTotals: Record<string, number> = {};
      enrichedLogs.forEach((log) => {
        dailyTotals[log.date] = (dailyTotals[log.date] || 0) + log.xp;
      });

      const chartEntries = Object.entries(dailyTotals)
        .map(([date, xp]) => ({
          date: date.split(",")[0],
          xp,
        }))
        .reverse()
        .slice(0, 7); // Last 7 days

      setChartData(chartEntries);

      const total = enrichedLogs.reduce((sum, log) => sum + log.xp, 0);
      setTotalXP(total);
      setAvgXPPerDay(Math.round(total / Object.keys(dailyTotals).length));
    }

    loadXPData();
  }, [userId]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl text-white mb-2">XP Logs</h2>
        <p className="text-sm text-[#b9bbbe]">
          Detailed breakdown of all XP gains
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#2f3136] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#00b0f4]" />
            <span className="text-xs text-[#72767d]">Total XP (Period)</span>
          </div>
          <div className="text-2xl text-white">{totalXP}</div>
        </div>
        <div className="bg-[#2f3136] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#57F287]" />
            <span className="text-xs text-[#72767d]">Avg Per Day</span>
          </div>
          <div className="text-2xl text-[#57F287]">{avgXPPerDay}</div>
        </div>
        <div className="bg-[#2f3136] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-[#faa61a]" />
            <span className="text-xs text-[#72767d]">Total Entries</span>
          </div>
          <div className="text-2xl text-[#faa61a]">{xpLogs.length}</div>
        </div>
      </div>

      {/* XP Trend Chart */}
      <div className="bg-[#2f3136] rounded-lg p-6 mb-6">
        <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-4">
          Daily XP Trend
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
            <XAxis
              dataKey="date"
              stroke="#72767d"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#72767d" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18191c",
                border: "none",
                borderRadius: "8px",
                color: "#dcddde",
              }}
              labelStyle={{ color: "#dcddde" }}
            />
            <Line
              type="monotone"
              dataKey="xp"
              stroke="#00b0f4"
              strokeWidth={2}
              dot={{ r: 4, fill: "#00b0f4" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* XP Log Entries */}
      <div>
        <h3 className="text-sm text-white mb-4">All XP Gains</h3>
        <div className="space-y-2">
          {xpLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#2f3136] rounded-lg p-4 flex items-center justify-between hover:bg-[#34373c] transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${log.color}20` }}
                >
                  <Zap className="w-6 h-6" style={{ color: log.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-white">{log.action}</span>
                    {log.action === "Milestone achieved" && (
                      <Award className="w-4 h-4 text-[#faa61a]" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#72767d]">
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${log.color}20`,
                        color: log.color,
                      }}
                    >
                      {log.quest}
                    </span>
                    <span>•</span>
                    <span>{log.subtask}</span>
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg text-[#00b0f4] mb-1">+{log.xp} XP</div>
                <div className="text-xs text-[#72767d]">{log.date}</div>
                <div className="text-xs text-[#72767d]">{log.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
