import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { AnalyticsService } from "../worker/services/analytics.service";

interface StatsStripProps {
  userId: string;
}

export function StatsStrip({ userId }: StatsStripProps) {
  const [stats, setStats] = useState([
    {
      title: "Current Level",
      value: "0",
      change: "+0",
      changePercent: "+0%",
      isPositive: true,
    },
    {
      title: "Total XP",
      value: "0",
      change: "+0",
      changePercent: "+0%",
      isPositive: true,
    },
    {
      title: "XP This Month",
      value: "0",
      change: "+0",
      changePercent: "+0%",
      isPositive: true,
    },
    {
      title: "Sessions This Month",
      value: "0",
      change: "0",
      changePercent: "0%",
      isPositive: true,
    },
  ]);

  useEffect(() => {
    const load = async () => {
      const service = new AnalyticsService();
      const data = await service.getProgressStats(userId);
      setStats([
        {
          title: "Current Level",
          value: data.currentLevel.toString(),
          change: `+${data.levelRise}`,
          changePercent: `+${
            data.levelRise > 0
              ? Math.round((data.levelRise / data.currentLevel) * 100)
              : 0
          }%`,
          isPositive: data.levelRise >= 0,
        },
        {
          title: "Total XP",
          value: data.totalXP.toLocaleString(),
          change: `+${data.xpThisMonth.toLocaleString()}`,
          changePercent: `+${data.xpRisePercent}%`,
          isPositive: data.xpRisePercent >= 0,
        },
        {
          title: "XP This Month",
          value: data.xpThisMonth.toLocaleString(),
          change: `+${data.xpThisMonth}`,
          changePercent: `+${data.xpRisePercent}%`,
          isPositive: data.xpRisePercent >= 0,
        },
        {
          title: "Sessions This Month",
          value: data.sessionsThisMonth.toString(),
          change: `${data.sessionsChange >= 0 ? "+" : ""}${
            data.sessionsChange
          }`,
          changePercent: `${data.sessionsChange >= 0 ? "+" : ""}${Math.abs(
            Math.round(
              (data.sessionsChange / (data.sessionsThisMonth || 1)) * 100
            )
          )}%`,
          isPositive: data.sessionsChange >= 0,
        },
      ]);
    };
    if (userId) load();
  }, [userId]);

  // return (
  //   <div className="grid grid-cols-4 gap-4">
  //     {stats.map((stat, index) => (
  //       <div
  //         key={index}
  //         className="bg-[#2f3136] rounded-lg p-4 relative overflow-hidden"
  //       >
  //         {/* Subtle gradient accent */}
  //         <div
  //           className="absolute inset-0 opacity-5"
  //           style={{
  //             background: `linear-gradient(135deg, ${
  //               stat.isPositive ? "#57F287" : "#ED4245"
  //             } 0%, transparent 100%)`,
  //           }}
  //         />

  //         <div className="relative">
  //           <div className="text-xs text-[#b9bbbe] mb-1">{stat.title}</div>
  //           <div className="text-3xl text-white mb-2">{stat.value}</div>
  //           <div
  //             className={`flex items-center gap-1 text-xs ${
  //               stat.isPositive ? "text-[#57F287]" : "text-[#ED4245]"
  //             }`}
  //           >
  //             {stat.isPositive ? (
  //               <TrendingUp className="w-3 h-3" />
  //             ) : (
  //               <TrendingDown className="w-3 h-3" />
  //             )}
  //             <span>{stat.changePercent} vs last month</span>
  //           </div>
  //         </div>
  //       </div>
  //     ))}
  //   </div>
  // );


  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-[#2f3136] rounded-lg p-4 relative overflow-hidden"
        >
          {/* Subtle gradient accent */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: `linear-gradient(135deg, ${stat.isPositive ? '#57F287' : '#ED4245'} 0%, transparent 100%)`,
            }}
          />

          <div className="relative">
            <div className="text-xs text-[#b9bbbe] mb-1">{stat.title}</div>
            <div className="text-3xl text-white mb-2">{stat.value}</div>
            <div className={`flex items-center gap-1 text-xs ${stat.isPositive ? 'text-[#57F287]' : 'text-[#ED4245]'}`}>
              {stat.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{stat.changePercent} vs last month</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
