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

  useEffect(
    (userId: string) => {
      const period =
        timeView === "by-month"
          ? "monthly"
          : timeView === "by-day"
          ? "daily"
          : "weekly";

      const load = async (userId) => {
        const service = new AnalyticsService();
        const chartData = await service.getWorkDistribution(userId, period);
        setData(chartData);

        // Extract quest names for legend
        if (chartData.length > 0) {
          const questKeys = Object.keys(chartData[0]).filter(
            (k) => k !== "name"
          );
          setQuests(
            questKeys.map((key) => ({
              key,
              color: "#5865F2", // Could map to actual quest colors
            }))
          );
        }
      };
      if (userId) load(userId);
    },
    [userId]
  );

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
