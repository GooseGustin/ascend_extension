import { useEffect, useState } from "react";
import { AnalyticsService } from "../worker/services/analytics.service";

interface ProgressHeatmapProps {
  userId: string;
}

export function ProgressHeatmap({ userId }: ProgressHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  useEffect(() => {
    async function loadHeatmap() {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // const data = await workerRequest('analytics:getHeatmapData', {
      const analyticsService = new AnalyticsService();
      const data = await analyticsService.getHeatmapData(
        userId,
        ninetyDaysAgo.toISOString().split("T")[0],
        now.toISOString().split("T")[0]
      );

      // Transform to include day and month info
      const enriched = data.map((d: any) => {
        const date = new Date(d.date);
        return {
          ...d,
          day: date.getDate(),
          month: date.getMonth(),
          duration: d.count * 25, // Convert session count to approximate minutes
        };
      });

      setHeatmapData(enriched);
    }

    loadHeatmap();
  }, [userId]);

  // Calculate intensity (0-4) based on duration
  const getIntensity = (duration: number) => {
    if (duration === 0) return 0;
    if (duration < 30) return 1;
    if (duration < 60) return 2;
    if (duration < 120) return 3;
    return 4;
  };

  const getColor = (intensity: number) => {
    switch (intensity) {
      case 0:
        return "#202225";
      case 1:
        return "#3d5a50";
      case 2:
        return "#26a269";
      case 3:
        return "#33d17a";
      case 4:
        return "#57e389";
      default:
        return "#202225";
    }
  };

  // Group by weeks
  const weeks: (typeof heatmapData)[][] = [];
  let currentWeek: typeof heatmapData = [];

  heatmapData.forEach((day, index) => {
    const dayOfWeek = new Date(day.date).getDay();

    if (index === 0 && dayOfWeek !== 0) {
      // Fill in empty days at start
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push({ date: "", duration: -1, day: 0, month: 0 });
      }
    }

    currentWeek.push(day);

    if (dayOfWeek === 6 || index === heatmapData.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-1">
              Last 90 Days
            </h3>
            <p className="text-xs text-[#72767d]">
              Brighter colors indicate more focus time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#72767d]">Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((intensity) => (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getColor(intensity) }}
                />
              ))}
            </div>
            <span className="text-xs text-[#72767d]">More</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-2">
            <div className="h-3" /> {/* Spacer for month labels */}
            {dayLabels.map((day, index) => (
              <div
                key={day}
                className="h-3 flex items-center text-xs text-[#72767d]"
                style={{ visibility: index % 2 === 1 ? "visible" : "hidden" }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {/* Month label on first day of each month */}
                <div className="h-3 text-xs text-[#72767d]">
                  {week[0].duration !== -1 && week[0].day <= 7
                    ? monthLabels[week[0].month]
                    : ""}
                </div>

                {/* Days */}
                {week.map((day, dayIndex) => {
                  if (day.duration === -1) {
                    return <div key={dayIndex} className="w-3 h-3" />;
                  }

                  const intensity = getIntensity(day.duration);
                  const color = getColor(intensity);

                  return (
                    <div
                      key={dayIndex}
                      className="w-3 h-3 rounded-sm cursor-pointer hover:ring-1 hover:ring-white transition-all"
                      style={{ backgroundColor: color }}
                      title={`${day.date}: ${day.duration} minutes`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-[#2f3136] rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <div className="text-xs text-[#72767d] mb-1">Total Days Active</div>
            <div className="text-2xl text-white">
              {heatmapData.filter((d) => d.duration > 0).length}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#72767d] mb-1">Total Hours</div>
            <div className="text-2xl text-[#57F287]">
              {Math.floor(
                heatmapData.reduce((sum, d) => sum + d.duration, 0) / 60
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#72767d] mb-1">Avg Per Day</div>
            <div className="text-2xl text-[#00b0f4]">
              {(() => {
                const activeDays = heatmapData.filter((d) => d.duration > 0);
                if (activeDays.length === 0) return 0;
                return Math.floor(
                  heatmapData.reduce((sum, d) => sum + d.duration, 0) / activeDays.length
                );
              })()}{" "}
              min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
