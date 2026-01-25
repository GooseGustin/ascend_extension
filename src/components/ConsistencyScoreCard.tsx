import { useEffect, useState } from "react";
import { AnalyticsService } from "../worker/services/analytics.service";

interface ConsistencyScoreCardProps {
  userId: string;
}

export function ConsistencyScoreCard({ userId }: ConsistencyScoreCardProps) {
  const [consistencyData, setConsistencyData] = useState({
    score: 0,
    status: "Stable" as "Rising" | "Stable" | "Erratic" | "Crashing",
    daysActive: 0,
    totalDays: 14,
    sparklineData: [] as number[],
  });

  const statusColors = {
    Rising: "#57F287",
    Stable: "#00b0f4",
    Erratic: "#faa61a",
    Crashing: "#ED4245",
  };

  const maxHeight = 40;

  useEffect(() => {
    const load = async () => {
      const service = new AnalyticsService();
      const res = await service.getConsistencyScore(userId);
      setConsistencyData(res);
    };
    if (userId) load();
  }, [userId]);

  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-4">
        Consistency Score
      </h3>

      <div className="flex items-center gap-6">
        {/* Circular Gauge */}
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#202225"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={statusColors[consistencyData.status]}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${
                2 * Math.PI * 56 * (1 - consistencyData.score / 100)
              }`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl text-white">{consistencyData.score}</div>
              <div className="text-xs text-[#b9bbbe]">/ 100</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-3">
            <div className="text-sm text-[#dcddde] mb-1">
              Over last {consistencyData.totalDays} days
            </div>
            <div
              className="inline-block px-3 py-1 rounded text-sm"
              style={{
                backgroundColor: `${statusColors[consistencyData.status]}20`,
                color: statusColors[consistencyData.status],
              }}
            >
              {consistencyData.status}
            </div>
          </div>

          {/* Mini sparkline */}
          <div>
            <div className="text-xs text-[#72767d] mb-2">
              Daily Work Presence
            </div>
            <div className="flex items-end gap-1">
              {consistencyData.sparklineData.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: value ? `${maxHeight}px` : "4px",
                    backgroundColor: value
                      ? statusColors[consistencyData.status]
                      : "#202225",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
