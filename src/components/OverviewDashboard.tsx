import { StatsStrip } from './StatsStrip';
import { ConsistencyScoreCard } from './ConsistencyScoreCard';
import { SessionQualityCard } from './SessionQualityCard';
import { WorkDistributionChart } from './WorkDistributionChart';
import { TimePercentageDonut } from './TimePercentageDonut';
import { QuestVelocityGraph } from './QuestVelocityGraph';
import { StreakPanel } from './StreakPanel';
import { ProgressHeatmap } from './ProgressHeatmap';
import { useEffect, useState } from 'react';

interface OverviewDashboardProps {
  userId: string;
  timeView?: string;
}

export function OverviewDashboard({ userId, timeView = 'overview' }: OverviewDashboardProps) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Trigger animations when component mounts or timeView changes
    setHasAnimated(false);
    const timer = setTimeout(() => setHasAnimated(true), 10);
    return () => clearTimeout(timer);
  }, [timeView]);

  const animationStyle = (index: number) => ({
    animation: hasAnimated ? `slideUp 0.6s ease-out ${index * 0.1}s both` : 'none',
    opacity: hasAnimated ? 1 : 0,
  });

  return (
    <div className="p-6 space-y-6">
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Stats Strip */}
      <div style={animationStyle(0)}>
        <StatsStrip userId={userId} />
      </div>

      {/* Row 1: Consistency + Session Quality */}
      <div className="grid grid-cols-2 gap-6">
        <div style={animationStyle(1)}>
          <ConsistencyScoreCard userId={userId} />
        </div>
        <div style={animationStyle(2)}>
          <SessionQualityCard userId={userId} />
        </div>
      </div>

      {/* Row 2: Charts Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        <div style={animationStyle(3)}>
          <WorkDistributionChart userId={userId} timeView={timeView} />
        </div>
        <div style={animationStyle(4)}>
          <TimePercentageDonut userId={userId} timeView={timeView} />
        </div>
      </div>

      {/* Row 3: Velocity + Streak */}
      <div className="grid grid-cols-2 gap-6">
        <div style={animationStyle(5)}>
          <QuestVelocityGraph userId={userId} />
        </div>
        <div style={animationStyle(6)}>
          <StreakPanel />
        </div>
      </div>

      {/* Row 4: Heatmap (Full Width) */}
      <div style={animationStyle(7)}>
        <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">Activity Heatmap</h3>
        <ProgressHeatmap userId={userId} />
      </div>
    </div>
  );
}
