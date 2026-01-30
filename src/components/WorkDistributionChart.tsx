import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AnalyticsService } from "../worker/services/analytics.service";
import { QuestService } from "../worker/services/quest.service";

interface WorkDistributionChartProps {
  userId: string;
  timeView?: string;
}

export function WorkDistributionChart({
  userId,
  timeView = "overview",
}: WorkDistributionChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [quests, setQuests] = useState<Array<{ key: string; color: string }>>(
    []
  );

  useEffect(() => {
      const period =
        timeView === "by-month"
          ? "monthly"
          : timeView === "by-day"
          ? "daily"
          : "weekly";

      const load = async (userId: string) => {
        const analyticsService = new AnalyticsService();
        const questService = new QuestService();

        // Fetch quests to get their colors
        const userQuests = await questService.getUserQuests(userId);
        const questColorMap: Record<string, string> = {};
        userQuests.forEach((q: any) => {
          questColorMap[q.title] = q.color || '#5865F2';
        });

        const chartData = await analyticsService.getWorkDistribution(userId, period);
        setData(chartData);

        // Extract ALL unique quest names across all data points
        if (chartData.length > 0) {
          const allQuestKeys = new Set<string>();
          chartData.forEach((dataPoint: any) => {
            Object.keys(dataPoint).forEach(key => {
              if (key !== "name") {
                allQuestKeys.add(key);
              }
            });
          });

          setQuests(
            Array.from(allQuestKeys).map((key) => ({
              key,
              color: questColorMap[key] || '#5865F2',
            }))
          );
        }
      };
      if (userId) load(userId);
    },
    [userId, timeView]
  );

  console.log('[WorkDistributionChart], weeklydata', data); 
  console.log('[WorkDistributionChart], quests', quests);

  const getTitle = () => {
    if (timeView === "by-month") return "Monthly Distribution";
    if (timeView === "by-day") return "Daily Distribution";
    if (timeView === "by-week") return "Weekly Distribution";
    return "Work Distribution (This Week)";
  };

  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-4">
        {getTitle()}
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
          <XAxis dataKey="name" stroke="#72767d" style={{ fontSize: "12px" }} />
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
          <Legend wrapperStyle={{ fontSize: "12px", color: "#b9bbbe" }} />
          {quests.map((quest) => (
            <Bar
              key={quest.key}
              dataKey={quest.key}
              stackId="a"
              fill={quest.color}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
